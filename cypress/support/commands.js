// login visual preenchendo os campos. 
// não usei o cy.session pq o app não persiste autenticação no localstorage.
Cypress.Commands.add("loginComSucesso", (email, senha) => {
  cy.visit("/");
  
  // aguarda o react renderizar o input antes de sair digitando
  cy.get('input[type="email"]', { timeout: 10000 })
    .should('be.visible')
    .clear()
    .type(email);
    
  cy.get('input[type="password"]')
    .should('be.visible')
    .clear()
    .type(senha);
    
  cy.get('[data-cy="btn-entrar"]')
    .should('be.visible')
    .click();

  // confere se o modal sumiu e a tela principal carregou pra liberar o teste
  cy.get('input[type="email"]', { timeout: 10000 }).should('not.exist');
  cy.contains('Cadastrar Atividade', { timeout: 10000 }).should('be.visible');
});

// comando pra abrir o modal de atividade e validar se o overlay não tá travando a tela
Cypress.Commands.add("abrirModalAtividade", () => {
  cy.get('[data-cy="app"]', { timeout: 10000 }).should('not.have.css', 'pointer-events', 'none');
  cy.get('[data-cy="btn-cadastrar-atividade"]').should('be.visible').click(); 
  cy.get('[data-cy="modal-atividade-overlay"]').should("be.visible"); 
});

// helper pra limpar o texto dos cards e devolver só o número inteiro (facilita as contas depois)
Cypress.Commands.add("obterValorDoCard", (seletor) => {
  return cy.get(seletor)
    .invoke('text')
    .then((text) => parseInt(text.replace(/\D/g, ''), 10));
});

// isola o fluxo de criação pra não sujar os cenários. 
// sempre cria um novo responsavel com id unico pra não dar conflito.
Cypress.Commands.add('criarAtividade', ({ nome, prazo, status = 'Não Iniciada', prioridade = 'Alta' }) => {
  cy.abrirModalAtividade();
  
  cy.get('[data-cy="modal-atividade"]', { timeout: 10000 }).should('be.visible').within(() => {
    cy.get('[data-cy="modal-atividade-status"]').select(status);
    cy.get('[data-cy="modal-atividade-prioridade"]').select(prioridade);
    cy.get('[data-cy="modal-atividade-nome"]').clear().type(nome);
    cy.get('[data-cy="modal-atividade-prazo"]').clear().type(prazo);
    
    cy.get('[data-cy="modal-atividade-btn-novo-responsavel"]').click();
  });

  const uniqueId = Date.now();
  const nomeResponsavelNovo = `QA Automação ${uniqueId}`;

  // cadastra o responsável no modal aninhado
  cy.get('[data-cy="modal-responsavel"]', { timeout: 10000 }).should('be.visible').within(() => {
    cy.get('[data-cy="modal-responsavel-nome"]').clear().type(nomeResponsavelNovo);
    cy.get('[data-cy="modal-responsavel-email"]').clear().type(`qa+${uniqueId}@agilean.com.br`);
    cy.get('[data-cy="modal-responsavel-telefone"]').clear().type(`(85) 98888-${Math.floor(1000 + Math.random() * 9000)}`);
    cy.get('[data-cy="modal-responsavel-btn-salvar"]').click();
  });

  // volta pro modal principal e seleciona o cara que acabou de ser criado
  cy.get('[data-cy="modal-atividade"]', { timeout: 10000 }).should('be.visible').within(() => {
    cy.get('[data-cy="modal-atividade-responsavel"]').select(nomeResponsavelNovo);
    cy.get('[data-cy="modal-atividade-btn-salvar"]').click();
  });

  // aguarda o request de salvamento terminar e o modal fechar
  cy.get('[data-cy="modal-atividade"]').should('not.exist');
  cy.get('[data-cy="tabela-vazia"]', { timeout: 10000 }).should('not.exist');
});