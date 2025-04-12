import type { Request, Response, NextFunction } from "express"
import { logger } from "../utils/logger"
import { ZodError } from "zod"

/**
 * Middleware para tratamento centralizado de erros
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  // Determina o status HTTP com base no tipo de erro
  const status = err.status || err.statusCode || 500
  let message = err.message || "Erro interno do servidor"
  let details = undefined

  // Tratamento específico para erros do Zod (validação)
  if (err instanceof ZodError) {
    logger.warn("Erro de validação:", err.errors)
    message = "Falha na validação dos dados"
    details = err.errors
  } else {
    // Log de erros não relacionados à validação
    logger.error(`Erro na rota ${req.method} ${req.path}:`, err)
  }

  // Responde com o erro formatado
  res.status(status).json({
    success: false,
    message,
    details,
    path: req.path,
  })
}
