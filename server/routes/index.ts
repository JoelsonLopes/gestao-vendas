import { Express } from "express";
import userRouter from "./user";
import regionRouter from "./region";
import clientRouter from "./client";
import productRouter from "./product";
import orderRouter from "./order";
import discountRouter from "./discount";
import statsRouter from "./stats";
import notificationRouter from "./notification";

export function registerDomainRoutes(app: Express) {
  // Todas as rotas de usuário (prefixo /api)
  app.use("/api", userRouter);
  // Todas as rotas de region (prefixo /api)
  app.use("/api", regionRouter);
  // Todas as rotas de client (prefixo /api)
  app.use("/api", clientRouter);
  // Todas as rotas de product (prefixo /api)
  app.use("/api", productRouter);
  // Todas as rotas de order (prefixo /api)
  app.use("/api", orderRouter);
  // Todas as rotas de discount (prefixo /api)
  app.use("/api", discountRouter);
  // Todas as rotas de stats (prefixo /api)
  app.use("/api", statsRouter);
  // Todas as rotas de notification (prefixo /api)
  app.use("/api", notificationRouter);
} 