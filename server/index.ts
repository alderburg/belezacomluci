import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { db } from "./db";
import { NotificationWebSocketService } from "./websocket";
import dotenv from 'dotenv';

// Configurar dotenv com override para suprimir logs completamente
process.env.DOTENV_CONFIG_DEBUG = '';
process.env.DOTENV_CONFIG_VERBOSE = '';

// Temporariamente desabilitado para debug
/*const originalStdoutWrite = process.stdout.write;
const originalStderrWrite = process.stderr.write;

process.stdout.write = function(chunk: any, ...args: any[]) {
  const message = chunk.toString();
  if (!message.includes('[dotenv@') && !message.includes('injecting env')) {
    return originalStdoutWrite.call(this, chunk, ...args);
  }
  return true;
};

process.stderr.write = function(chunk: any, ...args: any[]) {
  const message = chunk.toString();
  if (!message.includes('[dotenv@') && !message.includes('injecting env')) {
    return originalStderrWrite.call(this, chunk, ...args);
  }
  return true;
};*/

dotenv.config({ debug: false });

console.log('🌸 Beleza com Luci - Servidor iniciando...');

/*// Restaurar stdout e stderr após um pequeno delay
setTimeout(() => {
  process.stdout.write = originalStdoutWrite;
  process.stderr.write = originalStderrWrite;
}, 100);*/

const app = express();

// CORS configuration
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json({ limit: '10mb' })); // Increased limit for base64 images
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  console.log('📊 Executando migrações do banco...');
  // Run migrations before starting the server
  try {
    const { migrate } = await import('drizzle-orm/node-postgres/migrator');
    await migrate(db, { migrationsFolder: './migrations' });
    console.log('✅ Migrações executadas com sucesso!');
  } catch (error: any) {
    // Se a tabela já existe, ignore o erro
    if (error?.code !== '42P07') {
      console.error('❌ Falha nas migrações:', error);
    } else {
      console.log('⚠️ Tabelas já existem, ignorando...');
    }
  }

  console.log('🛠️ Registrando rotas...');
  const server = await registerRoutes(app);
  console.log('✅ Rotas registradas!');
  
  console.log('🔌 Configurando WebSocket...');
  // Configurar WebSocket para notificações
  const wsService = new NotificationWebSocketService(server);
  console.log('✅ WebSocket configurado!');
  
  // Disponibilizar o serviço WebSocket globalmente
  (global as any).notificationWS = wsService;

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  console.log('⚙️ Configurando Vite...');
  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
    console.log('✅ Vite configurado!');
  } else {
    serveStatic(app);
    console.log('✅ Static files configured!');
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  console.log(`🚀 Iniciando servidor na porta ${port}...`);
  
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, async () => {
    console.log(`✅ Servidor rodando em http://0.0.0.0:${port}`);
    console.log('👥 Inicializando usuários padrão...');
    // Initialize default users and sample data
    try {
      await storage.seedDefaultUsers();
      console.log('✅ Usuários padrão inicializados!');
      console.log('🌸 Beleza com Luci está pronto! 💖');
    } catch (error) {
      console.error("❌ Falha ao inicializar usuários padrão:", error);
    }
  });
})();