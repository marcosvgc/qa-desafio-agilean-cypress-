const { defineConfig } = require('cypress');
const dotenv = require('dotenv');

dotenv.config({ path: '.env' });

module.exports = defineConfig({
  e2e: {
    baseUrl: process.env.BASE_URL || 'https://cadastro-atividades-qa-teste.vercel.app',
    env: {
      userEmail: process.env.USER_EMAIL,
      userPassword: process.env.USER_PASSWORD,
    },
    viewportWidth: 1280,
    viewportHeight: 720,
    setupNodeEvents(on, config) {
      return config;
    },
  },
});
