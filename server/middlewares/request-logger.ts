import type { Request, Response, NextFunction } from "express"
import { logger } from "../utils/logger"

/**
 * Middleware para logging de requisições HTTP
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now()
  const path = req.path
  let capturedJsonResponse: Record<string, any> | undefined = undefined

  // Intercepta o método json para capturar a resposta
  const originalResJson = res.json
  res.json = (bodyJson, ...args) => {
    capturedJsonResponse = bodyJson
    return originalResJson.apply(res, [bodyJson, ...args])
  }

  // Registra informações quando a resposta for finalizada
  res.on("finish", () => {
    const duration = Date.now() - start
    if (path.startsWith("/api")) {
      logger.request(req.method, path, res.statusCode, duration, capturedJsonResponse)
    }
  })

  next()
}
