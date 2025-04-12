import type { Express, Request, Response, NextFunction } from "express"
import { z } from "zod"
import { isAuthenticated, isAdmin } from "../middlewares/auth-middleware"
import type { DiscountRepository } from "../repositories/discount-repository"
import { logger } from "../utils/logger"

/**
 * Controlador de rotas relacionadas a descontos
 */
export class DiscountRoutes {
  private discountRepository: DiscountRepository

  constructor(discountRepository: DiscountRepository) {
    this.discountRepository = discountRepository
  }

  /**
   * Registra todas as rotas de descontos no aplicativo Express
   */
  public registerRoutes(app: Express): void {
    // Obter todos os descontos
    app.get("/api/discounts", isAuthenticated, this.getAllDiscounts.bind(this))

    // Obter descontos ativos
    app.get("/api/discounts/active", isAuthenticated, this.getActiveDiscounts.bind(this))

    // Obter desconto por ID
    app.get("/api/discounts/:id", isAuthenticated, this.getDiscountById.bind(this))

    // Criar desconto
    app.post("/api/discounts", isAdmin, this.createDiscount.bind(this))

    // Atualizar desconto
    app.put("/api/discounts/:id", isAdmin, this.updateDiscount.bind(this))

    // Excluir desconto
    app.delete("/api/discounts/:id", isAdmin, this.deleteDiscount.bind(this))

    // Alternar status do desconto
    app.patch("/api/discounts/:id/toggle-status", isAdmin, this.toggleDiscountStatus.bind(this))

    logger.info("Rotas de descontos registradas")
  }

  /**
   * Obtém todos os descontos
   */
  private async getAllDiscounts(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const discounts = await this.discountRepository.findAll()
      res.json({
        success: true,
        data: discounts,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Obtém descontos ativos
   */
  private async getActiveDiscounts(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const discounts = await this.discountRepository.findActive()
      res.json({
        success: true,
        data: discounts,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Obtém um desconto específico pelo ID
   */
  private async getDiscountById(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const discount = await this.discountRepository.findById(Number.parseInt(req.params.id))

      if (!discount) {
        return res.status(404).json({
          success: false,
          message: "Desconto não encontrado",
        })
      }

      res.json({
        success: true,
        data: discount,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Cria um novo desconto
   */
  private async createDiscount(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      // Validar dados de entrada
      const createDiscountSchema = z.object({
        name: z.string().min(1, "O nome é obrigatório"),
        percentage: z.string().min(1, "A porcentagem é obrigatória"),
        commission: z.string().min(1, "A comissão é obrigatória"),
        active: z.boolean().default(true),
      })

      const validatedData = createDiscountSchema.parse(req.body)

      // Criar o desconto
      const discount = await this.discountRepository.create(validatedData)

      res.status(201).json({
        success: true,
        data: discount,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Atualiza um desconto existente
   */
  private async updateDiscount(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const id = Number.parseInt(req.params.id)

      // Validar dados de entrada
      const updateDiscountSchema = z.object({
        name: z.string().min(1, "O nome é obrigatório").optional(),
        percentage: z.string().min(1, "A porcentagem é obrigatória").optional(),
        commission: z.string().min(1, "A comissão é obrigatória").optional(),
        active: z.boolean().optional(),
      })

      const validatedData = updateDiscountSchema.parse(req.body)

      // Atualizar o desconto
      const discount = await this.discountRepository.update(id, validatedData)
      if (!discount) {
        return res.status(404).json({
          success: false,
          message: "Desconto não encontrado",
        })
      }

      res.json({
        success: true,
        data: discount,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Exclui um desconto
   */
  private async deleteDiscount(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const id = Number.parseInt(req.params.id)

      // Excluir o desconto
      const success = await this.discountRepository.delete(id)
      if (!success) {
        return res.status(404).json({
          success: false,
          message: "Desconto não encontrado",
        })
      }

      res.json({
        success: true,
        message: "Desconto excluído com sucesso",
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Alterna o status ativo/inativo de um desconto
   */
  private async toggleDiscountStatus(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const id = Number.parseInt(req.params.id)

      // Alternar o status
      const discount = await this.discountRepository.toggleStatus(id)
      if (!discount) {
        return res.status(404).json({
          success: false,
          message: "Desconto não encontrado",
        })
      }

      res.json({
        success: true,
        data: discount,
        message: `Status do desconto alterado para ${discount.active ? "ativo" : "inativo"}`,
      })
    } catch (error) {
      next(error)
    }
  }
}
