# Teste Técnico - Suíte Automatizada com Cypress

## Descrição
Suíte de testes automatizados utilizando o framework Cypress para validação de funcionalidades.

## Estrutura de Pastas

```
technical-test/
├── cypress/
│   ├── e2e/                 # Testes end-to-end
│   ├── fixtures/            # Dados de teste
│   ├── support/             # Configurações e comandos customizados
│   │   ├── commands.js      # Comandos customizados
│   │   └── e2e.js          # Configurações globais
│   └── plugins/             # Plugins do Cypress
├── cypress.config.js        # Configuração do Cypress
├── package.json             # Dependências do projeto
└── README.md               # Este arquivo
```

## Instalação

```bash
npm install
```

## Executar Testes

### Modo interativo (Test Runner)
```bash
npm run cypress:open
```

### Modo headless (sem interface gráfica)
```bash
npm run cypress:run
```

ou

```bash
npm test
```

## Estrutura de um Teste

```javascript
describe('Descrição da Funcionalidade', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('deve fazer algo específico', () => {
    // Seu código de teste aqui
  });
});
```

## Boas Práticas

- ✅ Use seletores únicos (data-testid)
- ✅ Organize os testes em grupos lógicos com `describe()`
- ✅ Mantenha os testes independentes
- ✅ Use fixtures para dados de teste
- ✅ Implemente comandos customizados para ações repetidas

## Referências

- [Documentação Cypress](https://docs.cypress.io/)
- [Best Practices](https://docs.cypress.io/guides/references/best-practices)

## Autor
Sua equipe de QA

## Licença
MIT
