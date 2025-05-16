import { Router } from "express";
import { isAuthenticated, isAdmin } from "../middlewares/auth";
import { createNotificationService, setupWebSocketServer } from "../services/websockets";

const router = Router();

// O notificationService deve ser injetado no app principal, mas para manter compatibilidade, usaremos req.app.locals.notificationService

// Rota para enviar notificações (apenas para usuários autenticados)
router.post("/notify", isAuthenticated, (req, res) => {
  try {
    const notificationService = req.app.locals.notificationService;
    const { type = "info", message, targetUsers = "all" } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: "O campo 'message' é obrigatório" });
    }
    const notification = { type, message, timestamp: Date.now() };
    if (targetUsers === "admins") {
      notificationService.notifyAdmins(notification);
    } else if (typeof targetUsers === "number") {
      notificationService.notifyUser(targetUsers, notification);
    } else {
      notificationService.notifyAll(notification);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erro ao enviar notificação" });
  }
});

// Notificar sobre aprovação de usuários
router.post("/notify-user-approval", isAdmin, (req, res) => {
  try {
    const notificationService = req.app.locals.notificationService;
    const { userId, userName } = req.body;
    if (!userId || !userName) {
      return res.status(400).json({ success: false, message: "Os campos 'userId' e 'userName' são obrigatórios" });
    }
    const notification = {
      type: "success",
      message: `O representante ${userName} foi aprovado com sucesso!`,
      timestamp: Date.now()
    };
    notificationService.notifyAdmins(notification);
    notificationService.notifyUser(userId, {
      type: "success",
      message: "Sua conta foi aprovada! Você já pode acessar o sistema.",
      timestamp: Date.now()
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erro ao enviar notificação de aprovação" });
  }
});

// Notificar administradores sobre novos usuários pendentes
router.post("/notify-new-user", (req, res) => {
  try {
    const notificationService = req.app.locals.notificationService;
    const { userName } = req.body;
    if (!userName) {
      return res.status(400).json({ success: false, message: "O campo 'userName' é obrigatório" });
    }
    const notification = {
      type: "info",
      message: `Novo representante ${userName} aguardando aprovação!`,
      timestamp: Date.now()
    };
    notificationService.notifyAdmins(notification);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erro ao enviar notificação de novo usuário" });
  }
});

export default router; 