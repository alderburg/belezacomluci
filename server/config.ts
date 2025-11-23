// Configurações do ambiente para o projeto Beleza com Luci

export const config = {
  // Configurações do banco PostgreSQL da Locaweb
  database: {
    host: process.env.LOCAWEB_DB_HOST,
    port: parseInt(process.env.LOCAWEB_DB_PORT || '5432'),
    name: process.env.LOCAWEB_DB_NAME,
    user: process.env.LOCAWEB_DB_USER,
    password: process.env.LOCAWEB_DB_PASSWORD,
  },
  
  // Configurações da aplicação
  app: {
    port: process.env.PORT || 5000,
    environment: process.env.NODE_ENV || 'development',
    sessionSecret: process.env.SESSION_SECRET!,
  },
  
  // URLs e endpoints
  urls: {
    frontend: process.env.FRONTEND_URL || 'http://localhost:5000',
    api: process.env.API_URL || '/api',
  }
};

// Validação das configurações essenciais
export function validateConfig() {
  const required = [
    'SESSION_SECRET'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Variáveis de ambiente necessárias não configuradas: ${missing.join(', ')}`);
  }
}

export default config;