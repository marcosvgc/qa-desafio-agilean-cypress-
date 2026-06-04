# 🧪 Automação E2E - Gerenciador de Atividades (Agilean)

Este repositório contém a suíte de testes automatizados End-to-End (E2E) desenvolvida para a aplicação front-end de Gestão de Atividades.

O foco deste projeto não é apenas a cobertura massiva, mas a **qualidade, estabilidade e manutenibilidade** do código de teste. A arquitetura foi pensada para simular o comportamento real do usuário, prevenindo falsos positivos e garantindo que o código sirva como uma documentação viva das regras de negócio.

**Autor:** Marcos Cavalcante  
**Ferramenta:** Cypress

---

## 🏗️ Decisões Técnicas e Arquitetura

Para garantir uma automação robusta e aderente aos padrões de mercado, as seguintes boas práticas foram aplicadas:

* **Custom Commands (Abstração):** A lógica repetitiva (como o fluxo de login e a criação de massa de dados) foi abstraída para o `support/commands.js`.
* **Smart Waits (Esperas Determinísticas):** Evitamos `cy.wait()` fixos e usamos asserções para aguardar mudanças na UI.
* **Prevenção de Flaky Tests (Independência de Estado):** Uso de dados dinâmicos (timestamps) para evitar colisões entre execuções.
* **Seletores Resilientes:** Prioridade para `data-cy` e uso de escopo quando não disponível.

---

## 📋 Cenários Automatizados

A suíte cobre fluxos de cadastro, regras de dashboard/tabela e validação de métricas (cards e gráficos).

---

## 🚀 Como instalar e rodar o projeto

### Pré-requisitos
* Ter o [Node.js](https://nodejs.org/) instalado na máquina (versão 18 ou superior recomendada).

### Passo a passo

1. **Clone o repositório**
   ```bash
   git clone <URL_DO_SEU_REPOSITORIO>
   cd <NOME_DA_PASTA>
   ```

2. **Instale as dependências**
```bash
npm install
```

3. **Abrir o Cypress (Interface gráfica)**
```bash
npm run cypress:open
```

4. **Executar a suíte em modo headless (CI / scripts)**
```bash
npm test
```

5. **Executar um spec específico via CLI**
```bash
npx cypress run --spec "cypress/e2e/cenários.cy.js"
```

### Dicas úteis
- Se o browser solicitar autenticação ao fazer push para o GitHub, conclua a autenticação no navegador conforme instruído pelo Git.
- Para rodar apenas um bloco de testes localmente, prefira `npm run cypress:open` e selecione o spec na interface do Test Runner.
- Logs e artefatos (screenshots/videos) são gerados em `cypress/screenshots` e `cypress/videos` quando executado em modo `run`.

---
