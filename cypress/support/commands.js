// não usei o cy.session pq percebi que o app não persiste a sessão no localstorage.
Cypress.Commands.add("loginComSucesso", (email, senha) => {
  cy.visit("/");
  
  // tenho que garantir que o react renderizou o form antes de digitar
  cy.get('input[type="email"]', { timeout: 10000 })
    .should('be.visible')
    .clear()
    .type(email);
    
  // dica do papito: usar log false pra senha não ficar exposta no vídeo do cypress!
  cy.get('input[type="password"]')
    .should('be.visible')
    .clear()
    .type(senha, { log: false }); 
    
  cy.get('[data-cy="btn-entrar"]')
    .should('be.visible')
    .click();

  // checagem de sanidade pra garantir que o login passou de fato
  cy.get('input[type="email"]', { timeout: 10000 }).should('not.exist');
  cy.contains('Cadastrar Atividade', { timeout: 10000 }).should('be.visible');
});

Cypress.Commands.add("abrirModalAtividade", () => {
  // macete: esperar o overlay carregar pra não tomar erro de 'pointer-events: none' do cypress
  cy.get('[data-cy="app"]', { timeout: 10000 }).should('not.have.css', 'pointer-events', 'none');
  cy.get('[data-cy="btn-cadastrar-atividade"]').should('be.visible').click(); 
  cy.get('[data-cy="modal-atividade-overlay"]').should("be.visible"); 
});

// helper pra limpar as strings dos cards e devolver só número (ajuda muito nas contas de matemática depois)
Cypress.Commands.add("obterValorDoCard", (seletor) => {
  return cy.get(seletor)
    .invoke('text')
    .then((text) => {
      const num = parseInt(text.replace(/\D/g, ''), 10);
      return Number.isNaN(num) ? 0 : num;
    });
});

// separei a criação do responsável pra ficar SOLID e poder reusar só essa parte se eu precisar futuramente
Cypress.Commands.add('criarResponsavel', (nomeOpcional) => {
  const uniqueId = Date.now();
  const nomeResponsavel = nomeOpcional || `QA Automação ${uniqueId}`;

  cy.get('[data-cy="modal-atividade-btn-novo-responsavel"]').click();
  
  cy.get('[data-cy="modal-responsavel"]', { timeout: 10000 })
    .should('be.visible')
    .within(() => {
      cy.get('[data-cy="modal-responsavel-nome"]').clear().type(nomeResponsavel);
      cy.get('[data-cy="modal-responsavel-email"]').clear().type(`qa+${uniqueId}@agilean.com.br`);
      cy.get('[data-cy="modal-responsavel-telefone"]').clear().type(`(85) 98888-${Math.floor(1000 + Math.random() * 9000)}`);
      cy.get('[data-cy="modal-responsavel-btn-salvar"]').click();
    });

  cy.get('[data-cy="modal-responsavel"]').should('not.exist');
  
  return cy.wrap(nomeResponsavel); 
});

Cypress.Commands.add('criarAtividade', ({ nome, prazo, status = 'Não Iniciada', prioridade = 'Alta', responsavel }) => {
  cy.abrirModalAtividade();
  
  cy.get('[data-cy="modal-atividade"]', { timeout: 10000 }).should('be.visible').within(() => {
    cy.get('[data-cy="modal-atividade-status"]').select(status);
    cy.get('[data-cy="modal-atividade-prioridade"]').select(prioridade);
    cy.get('[data-cy="modal-atividade-nome"]').clear().type(nome);
    cy.get('[data-cy="modal-atividade-prazo"]').clear().type(prazo);
  });

  // se o teste não mandar um responsavel, cria um novo dinamicamente. se mandar, pula logo pro select!
  if (!responsavel) {
    cy.criarResponsavel().then((nomeGerado) => {
      cy.get('[data-cy="modal-atividade-responsavel"]').select(nomeGerado);
    });
  } else {
    cy.get('[data-cy="modal-atividade-responsavel"]').select(responsavel);
  }

  cy.get('[data-cy="modal-atividade"]').within(() => {
    cy.get('[data-cy="modal-atividade-btn-salvar"]').click();
  });

  cy.get('[data-cy="modal-atividade"]').should('not.exist');
  // esperar a grid atualizar antes de liberar pro proximo passo do teste
  cy.get('[data-cy="tabela-vazia"]', { timeout: 10000 }).should('not.exist');
});