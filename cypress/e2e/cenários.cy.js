describe("Gerenciador de Atividades - Suíte de Testes Técnicos", () => {
  const usuarioEmail = "marcosteste1@teste.com"; 
  const usuarioSenha = "123456";

  // gera nome unico pras atividades pra evitar falso positivo na hora de buscar na tabela
  const gerarNomeUnico = (base) => `${base} ${Date.now()}`;

  beforeEach(() => {
    cy.loginComSucesso(usuarioEmail, usuarioSenha);
  });

  context("Cadastro de Atividades e Responsáveis (Limites e Exceções)", () => {
    
    it("Deve exibir mensagens de erro ao tentar salvar formulário vazio", () => {
      cy.abrirModalAtividade();
      cy.get('[data-cy="modal-atividade-btn-salvar"]').contains("Cadastrar").click();

      // checa se o front ta segurando envio de form sem os campos basicos
      cy.contains("Atividade é obrigatória").should("be.visible");
      cy.contains("Prazo é obrigatório").should("be.visible");
    });

    it("Deve cadastrar uma nova atividade com sucesso (Fluxo Feliz)", () => {
      const nomeAtividade = gerarNomeUnico('Teste Automacao Cypress');
      cy.criarAtividade({ nome: nomeAtividade, prazo: "2026-12-31" });
      
      // confirma se caiu na listagem
      cy.contains(nomeAtividade).should("be.visible");
    });

    it("Deve permitir criar um novo responsável de dentro do modal de atividade", () => {
      cy.abrirModalAtividade();
      cy.get('[data-cy="modal-atividade-btn-novo-responsavel"]').click();
      cy.get('[data-cy="modal-responsavel"]', { timeout: 10000 }).should('be.visible');

      const uniqueSuffix = Date.now();
      const nomeResponsavel = `QA Técnico ${uniqueSuffix}`;
      
      cy.get('[data-cy="modal-responsavel-nome"]').clear().type(nomeResponsavel);
      cy.get('[data-cy="modal-responsavel-email"]').clear().type(`qa.teste+${uniqueSuffix}@agilean.com.br`);
      cy.get('[data-cy="modal-responsavel-telefone"]').clear().type(`(85) 9${Math.floor(100000000 + Math.random() * 900000000)}`);
      cy.get('[data-cy="modal-responsavel-btn-salvar"]').click();

      cy.get('[data-cy="modal-responsavel"]').should('not.exist');
      
      // valida o bind automatico do react (se o responsavel novo ja vem no select)
      cy.get('[data-cy="modal-atividade-responsavel"]', { timeout: 10000 })
        .should('contain', nomeResponsavel)
        .select(nomeResponsavel)
        .then(($select) => {
          cy.wrap($select).find('option:selected').should('contain', nomeResponsavel);
        });
    });
    
    it("Deve validar o limite de caracteres no nome da atividade", () => {
      cy.abrirModalAtividade();
      
      // força um textão pra ver se o maxlength do html segura a barra
      const textoLongo = "A".repeat(260);
      cy.get('[data-cy="modal-atividade-nome"]').type(textoLongo);
      cy.get('[data-cy="modal-atividade-nome"]').invoke('val').should('have.length.at.most', 255);
    });

    it("Deve tratar injeção de caracteres HTML/Scripts (Prevenção XSS)", () => {
      const stringXSS = `<b>Atividade Negrito ${Date.now()}</b>`;
      cy.criarAtividade({ nome: stringXSS, prazo: "2026-12-31" });

      // se achar a tag <b> como texto puro na tabela, o XSS foi evitado
      cy.contains('table tbody tr', stringXSS).should('be.visible');
    });

    it("Deve exibir erros ao tentar salvar responsável com campos vazios", () => {
      cy.abrirModalAtividade();
      cy.get('[data-cy="modal-atividade-btn-novo-responsavel"]').click();
      
      cy.get('[data-cy="modal-responsavel"]', { timeout: 10000 })
        .should('be.visible')
        .within(() => {
          cy.get('[data-cy="modal-responsavel-btn-salvar"]').click();
          cy.contains("Nome é obrigatório").should("be.visible");
          cy.contains("E-mail é obrigatório").should("be.visible");
          cy.contains("Telefone é obrigatório").should("be.visible");
        });
      
      // limpa a tela dando um esc
      cy.get('body').type('{esc}'); 
    });

    // --- BLOCO DE VALIDAÇÕES DE INTERFACE (STATUS/PRIORIDADE) ---

    it("Deve cadastrar uma nova atividade com o status: Em Andamento", () => {
      const nomeAtividade = gerarNomeUnico('Status Em Andamento');
      cy.criarAtividade({ nome: nomeAtividade, prazo: "2026-12-31", status: "Em Andamento" });
      
      cy.contains('table tbody tr', nomeAtividade).within(() => {
        cy.get('[data-cy="badge-status-em-andamento"]').should("be.visible");
      });
    });

    it("Deve cadastrar uma nova atividade com a prioridade: Média", () => {
      const nomeAtividade = gerarNomeUnico('Prioridade Média');
      cy.criarAtividade({ nome: nomeAtividade, prazo: "2026-12-31", prioridade: "Média" });
      
      cy.contains('table tbody tr', nomeAtividade).within(() => {
        // o dev não botou data-cy na prioridade, então valido direto pelo texto da celula
        cy.contains("Média").should("be.visible");
      });
    });

    it("Deve cadastrar uma nova atividade com a prioridade: Baixa", () => {
      const nomeAtividade = gerarNomeUnico('Prioridade Baixa');
      cy.criarAtividade({ nome: nomeAtividade, prazo: "2026-12-31", prioridade: "Baixa" });
      
      cy.contains('table tbody tr', nomeAtividade).within(() => {
        cy.contains("Baixa").should("be.visible");
      });
    });
  });

  context("Regras do Dashboard, Ordenação e Comportamentos da Tabela", () => {
    
    it("Deve ordenar a lista de atividades por prazo de forma crescente", () => {
      // cria massa de dados com datas nas extremidades
      cy.criarAtividade({ nome: gerarNomeUnico('Prazo Longe'), prazo: "2030-12-31" });
      cy.criarAtividade({ nome: gerarNomeUnico('Prazo Perto'), prazo: "2025-01-01" });

      cy.get('[data-cy="btn-ordenar-prazo"]').click(); 
      cy.wait(500); // Delay maroto pro react refazer a grid na tela

      // Analisa a coluna de prazo validando se a lógica matematica do front tá certa
      cy.get('table tbody tr td:nth-child(4)').then(($celulas) => {
        
        // extrai só as datas e tira o label de atrasada se existir
        const textosDatas = $celulas.map((index, el) => Cypress.$(el).text().replace('Atrasada', '').trim()).get();

        // transforma dd/mm/yyyy em timestamp pra eu conseguir comparar
        const timestampsDaTela = textosDatas.map((dataString) => {
          const [dia, mes, ano] = dataString.split('/');
          return new Date(`${ano}-${mes}-${dia}`).getTime();
        });

        // clona o array e faz um sort perfeito (crescente)
        const ordemCorreta = [...timestampsDaTela].sort((a, b) => a - b);

        // a magica: o que ta na tela bate com o sort perfeito?
        expect(timestampsDaTela).to.deep.equal(ordemCorreta);
      });
    });

    it("Deve exibir o modal, concluir justificativa e alterar status para Rejeitada", () => {
      const atividadeNome = gerarNomeUnico('Ativ para Rejeicao');
      cy.criarAtividade({ nome: atividadeNome, prazo: "2027-12-31" });

      cy.contains('table tbody tr', atividadeNome, { timeout: 10000 })
        .should('be.visible').within(() => {
          cy.get("select[name='tableStatus']").select('Rejeitada');
        });

      cy.get('[data-cy="modal-rejeicao"]').should("be.visible");
      
      // tenta mandar sem motivo pra checar o bloqueio
      cy.get("button").contains("Confirmar").click();
      cy.contains("Informe o motivo da rejeição").should("be.visible"); 

      // PENDENTE: Ajustar data-cy do textarea se necessário
      cy.get('[data-cy="textarea-motivo-rejeicao"]').type("Teste automação");
      cy.get("button").contains("Confirmar").click();

      // checa se a linha atualizou a cor do badge
      cy.contains('table tbody tr', atividadeNome).within(() => {
        cy.get('[data-cy="badge-status-rejeitada"]').should("be.visible");
      });
    });

    it.only("Deve clonar dados exceto o status ao duplicar uma atividade", () => {
      // crio um objeto em memória pra servir de "gabarito" dos dados originais
      const dadosOriginais = {};

      // antes de duplicar, leio a primeira linha pra guardar o que deve ser clonado
      cy.get("table tbody tr").first().within(() => {
        // pego os textos de cada coluna (Atividade, Responsável, Prazo, Prioridade)
        cy.get('td').eq(1).invoke('text').then(t => dadosOriginais.nome = t.trim());
        cy.get('td').eq(2).invoke('text').then(t => dadosOriginais.responsavel = t.trim());
        // limpo a flag "Atrasada" do prazo pra não quebrar a comparação depois
        cy.get('td').eq(3).invoke('text').then(t => dadosOriginais.prazo = t.replace('Atrasada', '').trim());
        cy.get('td').eq(4).invoke('text').then(t => dadosOriginais.prioridade = t.trim());
      });

      // agora sim, abro o menu e clico em duplicar
      cy.get('[data-cy="atividade-0-btn-menu"]', { timeout: 10000 }).click();
      cy.get('[data-cy="atividade-0-btn-duplicar"]', { timeout: 10000 }).click(); 

      // a cópia recém-criada sempre sobe pro topo (first).
      cy.get("table tbody tr").first().within(() => {
        
        // uso o then() pra fazer o cypress esperar os dadosOriginais serem preenchidos no passo anterior
        cy.then(() => {
          // valido se a nova linha puxou fielmente os dados da original
          cy.get('td').eq(1).should('contain.text', dadosOriginais.nome);
          cy.get('td').eq(2).should('contain.text', dadosOriginais.responsavel);
          cy.get('td').eq(3).should('contain.text', dadosOriginais.prazo);
          cy.get('td').eq(4).should('contain.text', dadosOriginais.prioridade);
        });

        // a regra de negócio principal: tudo igual, MAS o status reseta pra 'Não Iniciada'
        cy.get('[data-cy="badge-status-não-iniciada"]').should("be.visible"); 
      });
    });

    it("Deve excluir uma atividade e refletir a alteração nos cards dinâmicos", () => {
      // espera a tabela carregar dados do banco pra não pegar o "0" do loading
      cy.get('table tbody tr', { timeout: 10000 }).should('be.visible');

      cy.obterValorDoCard('[data-cy="card-cadastradas"]').as('qtdAntes');
      
      const nomeAtv = gerarNomeUnico('Atv para Excluir');
      cy.criarAtividade({ nome: nomeAtv, prazo: "2027-12-31" });

      cy.get('[data-cy="atividade-0-btn-menu"]').click();
      cy.get('[data-cy="atividade-0-btn-excluir"]').click(); 

      // smart wait: espero a linha especifica sumir da grid antes de validar os cards
      cy.contains('table tbody tr', nomeAtv, { timeout: 10000 }).should('not.exist');

      cy.get('@qtdAntes').then((inicial) => {
        cy.obterValorDoCard('[data-cy="card-cadastradas"]').should('eq', inicial);
      });
    });
    it.only("Deve editar os dados de uma atividade com sucesso", () => {
      // guardo os dados antigos e novos em constantes pra organizar a validação lá no final
      const nomeOriginal = gerarNomeUnico('Atv Original');
      const nomeEditado = gerarNomeUnico('Atv Editada');
      const prazoOriginal = "2027-12-31"; 

      // crio a massa de dados que vai sofrer a edição
      cy.criarAtividade({ nome: nomeOriginal, prazo: prazoOriginal, prioridade: "Alta" });

      // procuro a linha exata da atividade pelo nome (evita flaky test caso a ordem da grid mude)
      cy.contains('table tbody tr', nomeOriginal)
        .should('be.visible')
        .within(() => {
          // o '$=' diz pro cypress achar qualquer ID que termine com '-btn-menu' ignorando se é 0, 1, 2...
          cy.get('[data-cy$="-btn-menu"]').click();
          cy.get('[data-cy$="-btn-editar"]').click(); 
        });

      // garanto que a tela sobrepôs e o modal abriu de verdade
      cy.get('[data-cy="modal-atividade"]', { timeout: 10000 }).should('be.visible');
      
      // confiro se o formulário não veio em branco (precisa trazer o nome antigo)
      cy.get('[data-cy="modal-atividade-nome"]').should('have.value', nomeOriginal);
      
      // VALIDAÇÃO DO BUG009: A data não pode zerar ao abrir a edição.
      // Se quebrar nessa linha, é a prova viva do bug para o relatório.
      cy.get('[data-cy="modal-atividade-prazo"]').should('have.value', prazoOriginal);

      // altero os dados simulando o fluxo real do usuário editando
      cy.get('[data-cy="modal-atividade-nome"]').clear().type(nomeEditado);
      cy.get('[data-cy="modal-atividade-prioridade"]').select('Baixa');
      
      // mando salvar e engatilho a espera inteligente pro modal sumir da tela
      cy.get('[data-cy="modal-atividade-btn-salvar"]').click();
      cy.get('[data-cy="modal-atividade"]').should('not.exist');

      // procuro a atividade com o nome NOVO e vejo se a grid refletiu a prioridade que mudei
      cy.contains('table tbody tr', nomeEditado).within(() => {
        cy.contains('Baixa').should('be.visible');
      });
      
      // por fim, garanto que o registro antigo realmente sumiu da tabela (foi substituído)
      cy.contains(nomeOriginal).should('not.exist');
    });
  });

  context("Validação de Métricas: Cards e Gráficos do Dashboard", () => {
    
    it("Deve incrementar os cards 'Cadastradas' e 'Pendentes' ao criar uma atividade", () => {
      cy.obterValorDoCard('[data-cy="card-cadastradas"]').as('qtdCadastradas');
      cy.obterValorDoCard('[data-cy="card-pendentes"]').as('qtdPendentes');

      cy.criarAtividade({ nome: gerarNomeUnico('Incremento Card'), prazo: "2027-12-31" });

      // faz a conta bater com os cards pós-inserção
      cy.get('@qtdCadastradas').then((ini) => { cy.obterValorDoCard('[data-cy="card-cadastradas"]').should('eq', ini + 1); });
      cy.get('@qtdPendentes').then((ini) => { cy.obterValorDoCard('[data-cy="card-pendentes"]').should('eq', ini + 1); });
    });

    it("Deve refletir atividades com prazo anterior a hoje no card 'Atrasadas'", () => {
      cy.obterValorDoCard('[data-cy="card-atrasadas"]').as('qtdAtrasadas');

      // jogo data antiga de proposito pra disparar a flag do dashboard
      cy.criarAtividade({ nome: gerarNomeUnico('Teste Atraso'), prazo: "2020-01-01" });

      cy.get('@qtdAtrasadas').then((ini) => { cy.obterValorDoCard('[data-cy="card-atrasadas"]').should('eq', ini + 1); });
    });

    it("Deve atualizar os cards e o gráfico ao transitar status para 'Resolvida'", () => {
      const nomeAtv = gerarNomeUnico('Resolver Atv');
      
      cy.obterValorDoCard('[data-cy="card-resolvidas"]').as('qtdResolvidas');
      cy.obterValorDoCard('[data-cy="card-pendentes"]').as('qtdPendentes');

      cy.criarAtividade({ nome: nomeAtv, prazo: "2027-12-31" });

      cy.contains('table tbody tr', nomeAtv, { timeout: 10000 })
        .should('be.visible').within(() => {
          cy.get("select[name='tableStatus']").select('Resolvida');
          cy.get('[data-cy="badge-status-resolvida"]').should("be.visible");
        });

      // valida efeito balança: a atv deixou de ser pendente e virou resolvida
      cy.get('@qtdResolvidas').then((ini) => { cy.obterValorDoCard('[data-cy="card-resolvidas"]').should('eq', ini + 1); });
      cy.get('@qtdPendentes').then((ini) => { cy.obterValorDoCard('[data-cy="card-pendentes"]').should('eq', ini - 1); });
      
      // só valida se o recharts renderizou o grafico, não pega tamanho especifico pra evitar flaky test
      cy.get('[data-cy="grafico-atividades"] .recharts-surface').should('be.visible').and('have.attr', 'height');
    });
  });
});