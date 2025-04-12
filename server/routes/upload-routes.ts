import type { Express, Request, Response, NextFunction } from "express"
import { z } from "zod"
import { isAuthenticated, isAdmin } from "../middlewares/auth-middleware"
import { storageService } from "../services/storage-service"
import { logger } from "../utils/logger"
import path from "path"

// Definir tipos para o callback de filtro de arquivo
type FileFilterCallback = (error: Error | null, acceptFile: boolean) => void

/**
 * Controlador de rotas relacionadas a uploads de arquivos
 */
export class UploadRoutes {
  /**
   * Registra todas as rotas de upload no aplicativo Express
   */
  public registerRoutes(app: Express): void {
    // Configurar middleware para servir arquivos estáticos
    storageService.setupStaticFileServing(app)

    // Upload de arquivo único
    const singleUpload = storageService.getMulterUpload()
    app.post("/api/upload", isAuthenticated, singleUpload.single("file"), this.handleSingleUpload.bind(this))

    // Upload de múltiplos arquivos
    const multiUpload = storageService.getMulterUpload()
    app.post(
      "/api/upload/multiple",
      isAuthenticated,
      multiUpload.array("files", 10),
      this.handleMultipleUpload.bind(this),
    )

    // Upload de imagem de produto
    const productImageUpload = storageService.getMulterUpload(
      "products",
      (file: Express.Multer.File, cb: FileFilterCallback) => {
        // Verificar se o arquivo é uma imagem
        if (!file.mimetype.startsWith("image/")) {
          return cb(new Error("Apenas imagens são permitidas"), false)
        }
        cb(null, true)
      },
    )
    app.post(
      "/api/products/:id/image",
      isAuthenticated,
      productImageUpload.single("image"),
      this.handleProductImageUpload.bind(this),
    )

    // Upload de arquivo protegido (apenas admin)
    const protectedUpload = storageService.getMulterUpload("protected")
    app.post("/api/upload/protected", isAdmin, protectedUpload.single("file"), this.handleProtectedUpload.bind(this))

    // Listar arquivos
    app.get("/api/files", isAdmin, this.listFiles.bind(this))

    // Excluir arquivo
    app.delete("/api/files/:filename", isAdmin, this.deleteFile.bind(this))

    // Limpar arquivos temporários
    app.post("/api/files/cleanup", isAdmin, this.cleanupTempFiles.bind(this))

    logger.info("Rotas de upload registradas")
  }

  /**
   * Manipula o upload de um único arquivo
   */
  private async handleSingleUpload(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Nenhum arquivo enviado",
        })
      }

      res.json({
        success: true,
        data: {
          filename: req.file.filename,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          path: req.file.path,
          url: storageService.getFileUrl(req.file.filename),
        },
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Manipula o upload de múltiplos arquivos
   */
  private async handleMultipleUpload(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Nenhum arquivo enviado",
        })
      }

      const files = req.files.map((file: any) => ({
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
        url: storageService.getFileUrl(file.filename),
      }))

      res.json({
        success: true,
        data: files,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Manipula o upload de imagem de produto
   */
  private async handleProductImageUpload(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const productId = Number.parseInt(req.params.id)

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Nenhuma imagem enviada",
        })
      }

      // Aqui você poderia atualizar o produto com a URL da imagem
      // Exemplo: await productRepository.update(productId, { imageUrl: storageService.getFileUrl(req.file.filename, "products") })

      res.json({
        success: true,
        data: {
          productId,
          filename: req.file.filename,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          path: req.file.path,
          url: storageService.getFileUrl(req.file.filename, "products"),
        },
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Manipula o upload de arquivo protegido
   */
  private async handleProtectedUpload(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Nenhum arquivo enviado",
        })
      }

      res.json({
        success: true,
        data: {
          filename: req.file.filename,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          path: req.file.path,
          url: storageService.getFileUrl(req.file.filename, "protected"),
        },
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Lista arquivos
   */
  private async listFiles(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const subdir = req.query.subdir as string | undefined
      const files = await storageService.listFiles(subdir)

      res.json({
        success: true,
        data: files,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Exclui um arquivo
   */
  private async deleteFile(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const filename = req.params.filename
      const subdir = req.query.subdir as string | undefined

      // Validar o nome do arquivo para evitar ataques de path traversal
      if (path.basename(filename) !== filename) {
        return res.status(400).json({
          success: false,
          message: "Nome de arquivo inválido",
        })
      }

      const success = await storageService.deleteFile(filename, subdir)

      if (!success) {
        return res.status(404).json({
          success: false,
          message: "Arquivo não encontrado",
        })
      }

      res.json({
        success: true,
        message: "Arquivo excluído com sucesso",
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Limpa arquivos temporários
   */
  private async cleanupTempFiles(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      // Validar dados de entrada
      const cleanupSchema = z.object({
        maxAgeHours: z.number().positive().default(24),
      })

      const validatedData = cleanupSchema.parse(req.body)
      const maxAgeMs = validatedData.maxAgeHours * 60 * 60 * 1000

      const deletedCount = await storageService.cleanupTempFiles(maxAgeMs)

      res.json({
        success: true,
        message: `${deletedCount} arquivos temporários excluídos`,
      })
    } catch (error) {
      next(error)
    }
  }
}
