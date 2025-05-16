import { Express } from "express";
import userRouter from "./user.routes";
import regionRouter from "./region.routes";
import clientRouter from "./client.routes";
import productRouter from "./product.routes";
import orderRouter from "./order.routes";
import discountRouter from "./discount.routes";
import statsRouter from "./stats.routes";
import notificationRouter from "./notification.routes";

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