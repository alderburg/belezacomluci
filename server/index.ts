import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { db } from "./db";
import { NotificationWebSocketService } from "./websocket";
import dotenv from 'dotenv';

dotenv.config({ debug: false });

console.log('🌸 Beleza com Luci - Servidor iniciando...');

const app = express();

app.set("trust proxy", 1);

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
  // Migrações desabilitadas - conectando diretamente ao banco Railway
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
  }, () => {
    console.log(`✅ Servidor rodando em http://0.0.0.0:${port}`);
    console.log('🌸 Beleza com Luci está pronto! 💖');
  });
})();