import type { Express, Request, Response, NextFunction } from "express"
import { z } from "zod"
import { isAuthenticated, isAdmin } from "../middlewares/auth-middleware"
import type { RegionRepository } from "../repositories/region-repository"
import type { Region } from "../types/region"
import { logger } from "../utils/logger"

/**
 * Controlador de rotas relacionadas a regiões
 */
export class RegionRoutes {
  private regionRepository: RegionRepository

  constructor(regionRepository: RegionRepository) {
    this.regionRepository = regionRepository
  }

  /**
   * Registra todas as rotas de regiões no aplicativo Express
   */
  public registerRoutes(app: Express): void {
    // Obter todas as regiões
    app.get("/api/regions", isAuthenticated, this.getAllRegions.bind(this))

    // Obter regiões ativas
    app.get("/api/regions/active", isAuthenticated, this.getActiveRegions.bind(this))

    // Obter região por ID
    app.get("/api/regions/:id", isAuthenticated, this.getRegionById.bind(this))

    // Criar região
    app.post("/api/regions", isAdmin, this.createRegion.bind(this))

    // Atualizar região
    app.put("/api/regions/:id", isAdmin, this.updateRegion.bind(this))

    // Excluir região
    app.delete("/api/regions/:id", isAdmin, this.deleteRegion.bind(this))

    // Alternar status da região
    app.patch("/api/regions/:id/toggle-status", isAdmin, this.toggleRegionStatus.bind(this))

    // Buscar regiões por nome
    app.get("/api/regions/search/:name", isAuthenticated, this.searchRegionsByName.bind(this))

    logger.info("Rotas de regiões registradas")
  }

  /**
   * Obtém todas as regiões
   */
  private async getAllRegions(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      let regions: Region[] = []
      try {
        regions = await this.regionRepository.findAll()
      } catch (error) {
        logger.error("Erro ao buscar regiões:", error)
        // Em caso de erro, retornar um array vazio
        regions = []
      }

      // Garantir que regions seja sempre um array
      if (!Array.isArray(regions)) {
        regions = []
      }

      res.json({
        success: true,
        data: regions,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Obtém regiões ativas
   */
  private async getActiveRegions(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const regions = await this.regionRepository.findActive()
      res.json({
        success: true,
        data: regions,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Obtém uma região específica pelo ID
   */
  private async getRegionById(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const region = await this.regionRepository.findById(Number.parseInt(req.params.id))

      if (!region) {
        return res.status(404).json({
          success: false,
          message: "Região não encontrada",
        })
      }

      res.json({
        success: true,
        data: region,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Cria uma nova região
   */
  private async createRegion(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      // Validar dados de entrada
      const createRegionSchema = z.object({
        name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
        description: z.string().optional().nullable(),
        active: z.boolean().default(true),
      })

      const validatedData = createRegionSchema.parse(req.body)

      // Criar a região
      const region = await this.regionRepository.create(validatedData)

      res.status(201).json({
        success: true,
        data: region,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Atualiza uma região existente
   */
  private async updateRegion(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const id = Number.parseInt(req.params.id)

      // Validar dados de entrada
      const updateRegionSchema = z.object({
        name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres").optional(),
        description: z.string().optional().nullable(),
        active: z.boolean().optional(),
      })

      const validatedData = updateRegionSchema.parse(req.body)

      // Atualizar a região
      const region = await this.regionRepository.update(id, validatedData)
      if (!region) {
        return res.status(404).json({
          success: false,
          message: "Região não encontrada",
        })
      }

      res.json({
        success: true,
        data: region,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Exclui uma região
   */
  private async deleteRegion(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const id = Number.parseInt(req.params.id)

      // Excluir a região
      const success = await this.regionRepository.delete(id)
      if (!success) {
        return res.status(404).json({
          success: false,
          message: "Região não encontrada",
        })
      }

      res.json({
        success: true,
        message: "Região excluída com sucesso",
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Alterna o status ativo/inativo de uma região
   */
  private async toggleRegionStatus(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const id = Number.parseInt(req.params.id)

      // Alternar o status
      const region = await this.regionRepository.toggleStatus(id)
      if (!region) {
        return res.status(404).json({
          success: false,
          message: "Região não encontrada",
        })
      }

      res.json({
        success: true,
        data: region,
        message: `Status da região alterado para ${region.active ? "ativo" : "inativo"}`,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Busca regiões por nome
   */
  private async searchRegionsByName(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const name = req.params.name
      const regions = await this.regionRepository.searchByName(name)

      res.json({
        success: true,
        data: regions,
      })
    } catch (error) {
      next(error)
    }
  }
}
