# 🧪 Automação E2E - Gerenciador de Atividades (Agilean)

Este repositório contém a suíte de testes automatizados End-to-End (E2E) desenvolvida para a aplicação front-end de Gestão de Atividades.

O foco deste projeto vai além da simples cobertura de interface. A arquitetura foi desenhada priorizando a **segurança, estabilidade (anti-flakiness) e manutenibilidade** do código, servindo como uma documentação viva das regras de negócio.

**Autor:** Marcos Cavalcante  
**Ferramenta:** Cypress (v15+)  
**Repositório remoto:** https://github.com/marcosvgc/qa-desafio-agilean-cypress-

---

## 🏗️ Decisões Técnicas e Arquitetura

Para garantir uma automação robusta e aderente aos padrões de mercado para profissionais Sênior, as seguintes estratégias foram aplicadas:

* **Blindagem de Credenciais (`dotenv`):** Senhas e dados sensíveis foram retirados do código-fonte e das *fixtures*. Eles são geridos via variáveis de ambiente, garantindo que nenhum dado real vaze no repositório.
* **Sincronia com Back-end (`cy.intercept`):** Ao invés de usar `cy.wait()` fixos que atrasam a suíte, o Cypress "escuta" o tráfego de rede e só interage com a UI após a API (Supabase) retornar sucesso (200/201/204), prevenindo problemas de *Detached DOM*.
* **Prevenção de "Testes Bomba-Relógio":** Uso de utilitários JavaScript para geração de datas relativas ao dia da execução. Não há datas com o ano "2027" fixadas no código, garantindo que o teste rode para sempre sem quebrar.
* **Data-Driven Testing (DDT):** Agrupamento de cenários repetitivos de cadastro (mudanças de status e prioridade) utilizando laços de repetição sobre Arrays de objetos, mantendo o código *DRY (Don't Repeat Yourself)*.
* **Custom Commands (SOLID):** Abstração lógica (ex: `cy.loginComSucesso`, `cy.criarResponsavel`) focada no Princípio de Responsabilidade Única.

---

## 📋 Escopo Automatizado

A suíte cobre fluxos críticos de negócio, incluindo:
- Validação de regras de obrigatoriedade e limites de formulário.
- Prevenção contra injeção de código (XSS) nos inputs de texto.
- Criação atrelada de Atividades e Responsáveis.
- Regras lógicas de ordenação de tabela e filtros.
- Reflexo e cálculo dinâmico das métricas no Dashboard (Cards e Gráficos).
- Fluxo de clico de vida (Duplicação, Edição e Exclusão).

---

## 🚀 Como instalar e rodar o projeto

### Pré-requisitos
* Ter o [Node.js](https://nodejs.org/) instalado na máquina (versão 18 ou superior).
* Git para versionamento.
* O pacote `dotenv` é exigido para a leitura das credenciais e será instalado automaticamente no passo 2.

### Passo a passo

1. **Clone o repositório**
```bash
   git clone [https://github.com/marcosvgc/qa-desafio-agilean-cypress-.git](https://github.com/marcosvgc/qa-desafio-agilean-cypress-.git)
   cd qa-desafio-agilean-cypress-
```

2. **Instale as dependências**
```
npm install
```
(Este comando instalará o Cypress e o dotenv contidos no package.json)

3. **Configuração do Ambiente (IMPORTANTE)**

* Na raiz do projeto, localize o arquivo .env.example.
* Renomeie este arquivo para .env.
* Preencha as chaves USER_EMAIL e USER_PASSWORD com as credenciais válidas do ambiente de QA. Sem este passo, a biblioteca dotenv não conseguirá injetar as credenciais e o teste falhará no login.

4. **Abrir o Cypress (Modo Visual / Test Runner)**
Ideal para acompanhar a execução passo a passo no navegador.

```
npm run cypress:open
```

5. **Executar a suíte em modo Headless (Modo CI/CD)
Ideal para execução rápida via terminal sem abrir a interface gráfica.**

```
npm test
```
(Ou execute diretamente o spec: npx cypress run --spec "cypress/e2e/gerenciador-atividades.cy.js")

### 🐞 Nota sobre Bugs Identificados
Durante a construção da automação, o Cypress evidenciou instabilidades reais na aplicação (como campos que perdem reatividade e falhas de bind no componente React do Responsável). Os testes foram estruturados para reportar essas quebras, que estão devidamente documentadas no relatório técnico de QA anexado à entrega do desafio.