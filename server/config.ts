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
    sessionSecret: process.env.SESSION_SECRET || 'beleza_luci_secret_key_2024_a8f2e9c7b1d4f6a3e8b5c2d7f9a1e4b6c3d8f2a5e7b9c1d4f6a8e2b5c7d9f1a3e6',
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
    'LOCAWEB_DB_HOST',
    'LOCAWEB_DB_NAME', 
    'LOCAWEB_DB_USER',
    'LOCAWEB_DB_PASSWORD'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Variáveis de ambiente necessárias não configuradas: ${missing.join(', ')}`);
  }
}

export default config;