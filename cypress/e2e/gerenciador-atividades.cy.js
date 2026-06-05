describe("Gerenciador de Atividades - Suíte de Testes Técnicos", () => {
  
  // Carregando as variáveis de ambiente mapeadas no cypress.config.js para proteger credenciais.
  const usuarioEmail = Cypress.env('userEmail');
  const usuarioSenha = Cypress.env('userPassword');
  
  // Nota mental: Criar um gerador de nomes dinâmicos. Isso evita que testes futuros quebrem por colisão de dados ou buscas com falso positivo.
  const gerarNomeUnico = (base) => `${base} ${Date.now()}`;

  // Criei essa função de data dinâmica para evitar testes "bomba-relógio". 
  // Hardcodar uma data como fixa faria a suíte inteira quebrar no futuro. Assim o teste fica eterno.
  const gerarDataDinamica = (diasAdicionais = 7) => {
    const data = new Date();
    data.setDate(data.getDate() + diasAdicionais);
    return data.toISOString().split('T')[0]; // Mantém o padrão YYYY-MM-DD do HTML
  };

  beforeEach(() => {
    // Centralizando os Intercepts. Deixar o Cypress "escutando" a API desde o início ajuda a debugar falhas isolando o Front do Back.
    cy.intercept('POST', '**/auth/v1/token*').as('apiLogin');
    cy.intercept('GET', '**/rest/v1/atividades*').as('apiListar');
    cy.intercept('POST', '**/rest/v1/atividades*').as('apiCriarAtividade');
    cy.intercept('PATCH', '**/rest/v1/atividades*').as('apiEditarAtividade');
    cy.intercept('DELETE', '**/rest/v1/atividades*').as('apiExcluirAtividade');
    cy.intercept('POST', '**/rest/v1/responsaveis*').as('apiCriarResponsavel');

    cy.loginComSucesso(usuarioEmail, usuarioSenha);

    // Estratégia Anti-Flaky: Só libero o teste para rodar depois que o login E a listagem inicial retornarem 200 OK da API.
    cy.wait(['@apiLogin', '@apiListar']).then((res) => {
      expect(res[0].response.statusCode).to.eq(200);
      expect(res[1].response.statusCode).to.eq(200);
    });
  });

  context("Cadastro de Atividades e Responsáveis (Limites e Exceções)", () => {
    
    it("Deve exibir mensagens de erro ao tentar salvar formulário vazio", () => {
      cy.abrirModalAtividade();
      cy.get('[data-cy="modal-atividade-btn-salvar"]').contains("Cadastrar").click();
      
      // Validação dupla: Garanto que o envio não avançou e o React engatilhou as mensagens obrigatórias no Front.
      cy.contains("Atividade é obrigatória").should("be.visible");
      cy.contains("Prazo é obrigatório").should("be.visible");
    });

    it("Deve permitir criar um novo responsável de dentro do modal de atividade", () => {
      cy.abrirModalAtividade();
      cy.get('[data-cy="modal-atividade-btn-novo-responsavel"]').click();
      
      const nomeResponsavel = `QA Técnico ${Date.now()}`;
      
      cy.get('[data-cy="modal-responsavel"]').should('be.visible').within(() => {
        cy.get('[data-cy="modal-responsavel-nome"]').type(nomeResponsavel);
        cy.get('[data-cy="modal-responsavel-email"]').type(`qa.teste+${Date.now()}@agilean.com.br`);
        cy.get('[data-cy="modal-responsavel-telefone"]').type(`(85) 999998888`);
        cy.get('[data-cy="modal-responsavel-btn-salvar"]').click();
      });

      // Além da UI, valido se o Back-end (Supabase) realmente processou a criação (status 201).
      cy.wait('@apiCriarResponsavel').its('response.statusCode').should('eq', 201);
      
      // Ponto de atenção (UX): O React precisa fazer o bind automático do responsável recém-criado para o usuário não ter que procurá-lo na lista.
      cy.get('[data-cy="modal-atividade-responsavel"]').find('option:selected').should('contain', nomeResponsavel);
    });
    
    it("Deve validar limite de caracteres e prevenção XSS no nome da atividade", () => {
      cy.abrirModalAtividade();
      
      // Teste de Limite: Injetando 260 caracteres para ver se a propriedade maxlength do HTML barra nos 255 permitidos.
      cy.get('[data-cy="modal-atividade-nome"]').type("A".repeat(260)).invoke('val').should('have.length.at.most', 255);
      
      // Fechando o modal com ESC para limpar a tela
      cy.get('[data-cy="modal-atividade-btn-cancelar"]').should('be.visible').click(); 
      
      // Aguardo a animação do overlay sumir do DOM. Sem isso, o próximo clique pode ser interceptado e falhar.
      cy.get('[data-cy="modal-atividade-overlay"]').should('not.exist');

      // Teste de Segurança (XSS): Se a tag HTML <b> aparecer como texto puro na grid, sabemos que o app sanitizou a string corretamente.
      const stringXSS = `<b>Atividade Negrito ${Date.now()}</b>`;
      cy.criarAtividade({ nome: stringXSS, prazo: gerarDataDinamica() });
      cy.wait('@apiCriarAtividade');
      cy.contains('table tbody tr', stringXSS).should('be.visible'); 
    });

    // Aplicando Data-Driven Testing (DDT). Ao invés de escrever 4 blocos repetitivos, testo as variações de estado base passando um array.
    const variacoesCadastro = [
      { cenario: 'Fluxo Feliz (Padrão)', params: {}, seletor: '[data-cy="badge-status-não-iniciada"]' },
      { cenario: 'Status: Em Andamento', params: { status: "Em Andamento" }, seletor: '[data-cy="badge-status-em-andamento"]' },
      { cenario: 'Prioridade: Média', params: { prioridade: "Média" }, seletor: ':contains("Média")' },
      { cenario: 'Prioridade: Baixa', params: { prioridade: "Baixa" }, seletor: ':contains("Baixa")' }
    ];

    variacoesCadastro.forEach(({ cenario, params, seletor }) => {
    it(`Deve cadastrar atividade com: ${cenario}`, () => {
        const nome = gerarNomeUnico(`Variação ${cenario}`);
        cy.criarAtividade({ nome, prazo: gerarDataDinamica(), ...params });
        
        cy.wait('@apiCriarAtividade').its('response.statusCode').should('eq', 201);
        cy.contains('table tbody tr', nome).find(seletor).should('be.visible');
      });
    });
  });

  context("Regras do Dashboard, Ordenação e Comportamentos da Tabela", () => {
    
    it("Deve ordenar a lista de atividades por prazo de forma crescente", () => {
      // Gerando massas com grande diferença temporal para forçar e testar o algorítmo de ordenação na grid.
      const prazoLonge = gerarDataDinamica(365); // +1 ano
      const prazoPerto = gerarDataDinamica(2);   // +2 dias

      cy.criarAtividade({ nome: gerarNomeUnico('Longe'), prazo: prazoLonge });
      cy.criarAtividade({ nome: gerarNomeUnico('Perto'), prazo: prazoPerto });

      cy.get('[data-cy="btn-ordenar-prazo"]').click(); 

      // Extraio os textos das datas da coluna inteira, converto para timestamp e comparo com um array ordenado nativamente no JS.
      cy.get('table tbody tr td:nth-child(4)').then(($celulas) => {
        const timestamps = $celulas.map((i, el) => {
          const [d, m, a] = Cypress.$(el).text().replace('Atrasada', '').trim().split('/');
          return new Date(`${a}-${m}-${d}`).getTime();
        }).get();

        const ordenado = [...timestamps].sort((a, b) => a - b);
        expect(timestamps).to.deep.equal(ordenado);
      });
    });

    it("Deve alterar status para Rejeitada exigindo motivo no modal", () => {
      const nome = gerarNomeUnico('Ativ Rejeicao');
      cy.criarAtividade({ nome, prazo: gerarDataDinamica() });

      cy.contains('table tbody tr', nome).find("select[name='tableStatus']").select('Rejeitada');
      cy.get('[data-cy="modal-rejeicao"]').should("be.visible");
      
      // Tentando forçar o fluxo sem motivo para validar as travas.
      cy.get("button").contains("Confirmar").click();
      cy.contains("Informe o motivo").should("be.visible"); 

      cy.get('[data-cy="textarea-motivo-rejeicao"]').type("Teste automação");
      cy.get("button").contains("Confirmar").click();

      // Confirmo a alteração com status 204 (No Content) no PATCH antes de buscar a atualização visual na tela.
      cy.wait('@apiEditarAtividade').its('response.statusCode').should('eq', 204);
      cy.contains('table tbody tr', nome).find('[data-cy="badge-status-rejeitada"]').should("be.visible");
    });

    it("Deve duplicar uma atividade existente", () => {
      const nomeBase = gerarNomeUnico('Duplicar');
      cy.criarAtividade({ nome: nomeBase, prazo: gerarDataDinamica() });
      cy.wait('@apiCriarAtividade');
      
      // Procura a linha com o nome gerado e clica no menu DENTRO dela
      cy.contains('table tbody tr', nomeBase).within(() => {
        cy.get('[data-cy$="-btn-menu"]').click();
        cy.get('[data-cy$="-btn-duplicar"]').click(); 
      });
      
      cy.wait('@apiCriarAtividade').its('response.statusCode').should('eq', 201);
      // Como a tabela tem ordenação, a cópia "Não Iniciada" vai para o topo ou logo abaixo
      cy.get("table tbody tr").first().find('[data-cy="badge-status-não-iniciada"]', { timeout: 10000 }).should("be.visible"); 
    });

    it("Deve editar a prioridade de uma atividade", () => {
      const nomeBase = gerarNomeUnico('Editar');
      cy.criarAtividade({ nome: nomeBase, prazo: gerarDataDinamica(), prioridade: "Alta" });
      cy.wait('@apiCriarAtividade');

      cy.contains('table tbody tr', nomeBase).within(() => {
        cy.get('[data-cy$="-btn-menu"]').click();
        cy.get('[data-cy$="-btn-editar"]').should('be.visible').click(); 
      });

      // NOTA DE BUG: O teste vai falhar aqui ou no select abaixo, evidenciando que o 
      // Front-end não está preenchendo o modal corretamente com os dados da grid.
      cy.get('[data-cy="modal-atividade-prioridade"]').select('Baixa');
      cy.get('[data-cy="modal-atividade-btn-salvar"]').click();
      
      cy.wait('@apiEditarAtividade').its('response.statusCode').should('eq', 204);
      cy.contains('table tbody tr', nomeBase).should('contain.text', 'Baixa');
    });

    it("Deve excluir uma atividade", () => {
      const nomeBase = gerarNomeUnico('Excluir');
      cy.criarAtividade({ nome: nomeBase, prazo: gerarDataDinamica() });
      cy.wait('@apiCriarAtividade');

      cy.contains('table tbody tr', nomeBase).within(() => {
        cy.get('[data-cy$="-btn-menu"]').click();
        cy.get('[data-cy$="-btn-excluir"]').click(); 
      });
      
      cy.wait('@apiExcluirAtividade').its('response.statusCode').should('eq', 204);
      
      // Validação suprema: A linha com aquele nome exato não existe mais no DOM
      cy.get("table tbody tr").should('not.contain.text', nomeBase);
    });
  });

  context("Validação de Métricas Dinâmicas", () => {
    
    //"fotografa" o estado inicial num snapshot. Comparamos o "antes e depois" sem depender de massa fixa hardcoded.
    const lerCards = (aliasArray) => {
      cy.obterValorDoCard('[data-cy="card-cadastradas"]').as(aliasArray[0]);
      cy.obterValorDoCard('[data-cy="card-pendentes"]').as(aliasArray[1]);
      cy.obterValorDoCard('[data-cy="card-resolvidas"]').as(aliasArray[2]);
    };

    it("Deve atualizar os cards de métricas ao criar e resolver atividades", () => {
      lerCards(['cadInicial', 'pendInicial', 'resInicial']);

      const nomeAtv = gerarNomeUnico('Metricas');
      cy.criarAtividade({ nome: nomeAtv, prazo: gerarDataDinamica() });
      
      // Prevenção de Detached DOM: Espero a API salvar o POST e recarregar a listagem (GET) antes de interagir.
      cy.wait('@apiCriarAtividade');
      cy.wait('@apiListar'); 

      //Aqui ele "olha" pro card por até 10s esperando a interface reagir à inserção e somar (+1).
      cy.get('@cadInicial').then(val => {
        cy.get('[data-cy="card-cadastradas"]', { timeout: 10000 }).should('contain.text', String(val + 1));
      });
      cy.get('@pendInicial').then(val => {
        cy.get('[data-cy="card-pendentes"]', { timeout: 10000 }).should('contain.text', String(val + 1));
      });

      //Resolvo a atividade e garanto que a reatividade atualizou o gráfico.
      cy.contains('table tbody tr', nomeAtv).find("select[name='tableStatus']").select('Resolvida');
      cy.wait('@apiEditarAtividade');

      cy.get('@resInicial').then(val => {
        cy.get('[data-cy="card-resolvidas"]', { timeout: 10000 }).should('contain.text', String(val + 1));
      });
      
      cy.get('[data-cy="grafico-atividades"] .recharts-surface').should('be.visible');
    });
  });
});