import type { Request, Response, NextFunction } from "express"

// Extend the User type in the Express namespace
declare global {
  namespace Express {
    interface User {
      id: number
      role: string
    }
  }
}

/**
 * Middleware para verificar se o usuário está autenticado
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction): void {
  if (req.isAuthenticated()) {
    return next()
  }
  res.status(401).json({
    success: false,
    message: "Usuário não autenticado",
  })
}

/**
 * Middleware para verificar se o usuário é administrador
 */
export function isAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.isAuthenticated() && req.user.role === "admin") {
    return next()
  }
  res.status(403).json({
    success: false,
    message: "Acesso restrito a administradores",
  })
}

/**
 * Middleware para verificar se o usuário é o proprietário do recurso
 * ou um administrador
 */
export function isOwnerOrAdmin(resourceIdParam: string, getOwnerId: (resourceId: number) => Promise<number | null>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({
          success: false,
          message: "Usuário não autenticado",
        })
      }

      // Administradores têm acesso total
      if (req.user.role === "admin") {
        return next()
      }

      const resourceId = Number.parseInt(req.params[resourceIdParam])
      if (isNaN(resourceId)) {
        return res.status(400).json({
          success: false,
          message: "ID de recurso inválido",
        })
      }

      // Obtém o ID do proprietário do recurso
      const ownerId = await getOwnerId(resourceId)

      if (ownerId === null) {
        return res.status(404).json({
          success: false,
          message: "Recurso não encontrado",
        })
      }

      // Verifica se o usuário atual é o proprietário
      if (req.user.id === ownerId) {
        return next()
      }

      res.status(403).json({
        success: false,
        message: "Acesso negado a este recurso",
      })
    } catch (error) {
      next(error)
    }
  }
}
