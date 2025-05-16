import 'dotenv/config'; 
import express, { type Request, Response, NextFunction } from "express";
import { setupVite, serveStatic, log } from "./vite";
import compression from 'compression';
import { setupAuth } from "../services/auth.service";
import { setupAuthRoutes } from "../controllers/auth.controller";
import { registerDomainRoutes } from "../routes/index";
import { createServer } from "http";
import { setupWebSocketServer, createNotificationService } from "../services/websockets.service";

const app = express();

// Usar compressão para melhorar o desempenho
app.use(compression({
  level: 6, // Nível de compressão ótimo entre velocidade e tamanho
  threshold: 1024, // Mínimo de tamanho em bytes para aplicar compressão
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

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
  // Setup autenticação (passport, sessão)
  setupAuth(app);
  // Setup rotas de autenticação
  setupAuthRoutes(app);
  // Registrar rotas de domínio
  registerDomainRoutes(app);

  // Criar servidor HTTP e WebSocket
  const httpServer = createServer(app);
  const wss = setupWebSocketServer(httpServer);
  const notificationService = createNotificationService(wss);
  app.locals.notificationService = notificationService;

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Setup Vite ou arquivos estáticos
  if (app.get("env") === "development") {
    await setupVite(app, httpServer);
  } else {
    serveStatic(app);
  }

  // Porta padrão
  const port = 5000;
  httpServer.listen(port, () => {
    log(`serving on http://localhost:${port}`);
  });
})(); 