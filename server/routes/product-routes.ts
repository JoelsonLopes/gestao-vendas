import type { Express, Request, Response, NextFunction } from "express"
import { z } from "zod"
import { isAuthenticated, isAdmin } from "../middlewares/auth-middleware"
import type { ProductRepository } from "../repositories/product-repository"
import { logger } from "../utils/logger"

/**
 * Controlador de rotas relacionadas a produtos
 */
export class ProductRoutes {
  private productRepository: ProductRepository

  constructor(productRepository: ProductRepository) {
    this.productRepository = productRepository
  }

  /**
   * Registra todas as rotas de produtos no aplicativo Express
   */
  public registerRoutes(app: Express): void {
    // Obter todos os produtos
    app.get("/api/products", isAuthenticated, this.getAllProducts.bind(this))

    // Obter produto por ID
    app.get("/api/products/:id", isAuthenticated, this.getProductById.bind(this))

    // Criar produto
    app.post("/api/products", isAdmin, this.createProduct.bind(this))

    // Atualizar produto
    app.put("/api/products/:id", isAdmin, this.updateProduct.bind(this))

    // Excluir produto
    app.delete("/api/products/:id", isAdmin, this.deleteProduct.bind(this))

    // Buscar produtos
    app.get("/api/products/search/:query", isAuthenticated, this.searchProducts.bind(this))

    // Encontrar produto pela referência do cliente
    app.get("/api/products/reference/:ref", isAuthenticated, this.findByClientReference.bind(this))

    // Salvar conversão de produto
    app.post("/api/products/:id/conversion", isAuthenticated, this.saveConversion.bind(this))

    // Importar produtos
    app.post("/api/products/import", isAdmin, this.importProducts.bind(this))

    // Obter estatísticas de produtos
    app.get("/api/products/statistics", isAuthenticated, this.getStatistics.bind(this))

    logger.info("Rotas de produtos registradas")
  }

  /**
   * Obtém todos os produtos
   */
  private async getAllProducts(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const products = await this.productRepository.findAll()
      res.json({
        success: true,
        data: products,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Obtém um produto específico pelo ID
   */
  private async getProductById(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const product = await this.productRepository.findById(Number.parseInt(req.params.id))

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Produto não encontrado",
        })
      }

      res.json({
        success: true,
        data: product,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Cria um novo produto
   */
  private async createProduct(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      // Validar dados de entrada
      const createProductSchema = z.object({
        code: z.string().min(1, "O código é obrigatório"),
        name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
        description: z.string().optional().nullable(),
        barcode: z.string().optional().nullable(),
        category: z.string().optional().nullable(),
        brand: z.string().optional().nullable(),
        price: z.string().min(1, "O preço é obrigatório"),
        stockQuantity: z.number().default(0),
        active: z.boolean().default(true),
        conversion: z.string().optional().nullable(),
        conversionBrand: z.string().optional().nullable(),
        equivalentBrands: z.string().optional().nullable(),
      })

      const validatedData = createProductSchema.parse(req.body)

      // Criar o produto
      const product = await this.productRepository.create(validatedData)

      res.status(201).json({
        success: true,
        data: product,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Atualiza um produto existente
   */
  private async updateProduct(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const id = Number.parseInt(req.params.id)

      // Obter o produto atual
      const currentProduct = await this.productRepository.findById(id)
      if (!currentProduct) {
        return res.status(404).json({
          success: false,
          message: "Produto não encontrado",
        })
      }

      // Validar dados de entrada
      const updateProductSchema = z.object({
        code: z.string().min(1, "O código é obrigatório").optional(),
        name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres").optional(),
        description: z.string().optional().nullable(),
        barcode: z.string().optional().nullable(),
        category: z.string().optional().nullable(),
        brand: z.string().optional().nullable(),
        price: z.string().min(1, "O preço é obrigatório").optional(),
        stockQuantity: z.number().optional(),
        active: z.boolean().optional(),
        conversion: z.string().optional().nullable(),
        conversionBrand: z.string().optional().nullable(),
        equivalentBrands: z.string().optional().nullable(),
      })

      const validatedData = updateProductSchema.parse(req.body)

      // Atualizar o produto
      const product = await this.productRepository.update(id, validatedData)
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Produto não encontrado",
        })
      }

      res.json({
        success: true,
        data: product,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Exclui um produto
   */
  private async deleteProduct(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const id = Number.parseInt(req.params.id)

      // Excluir o produto
      const success = await this.productRepository.delete(id)
      if (!success) {
        return res.status(404).json({
          success: false,
          message: "Produto não encontrado",
        })
      }

      res.json({
        success: true,
        message: "Produto excluído com sucesso",
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Busca produtos por termo
   */
  private async searchProducts(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const query = req.params.query
      const products = await this.productRepository.search(query)

      res.json({
        success: true,
        data: products,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Encontra um produto pela referência do cliente
   */
  private async findByClientReference(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const clientRef = req.params.ref
      const product = await this.productRepository.findByClientReference(clientRef)

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Produto não encontrado",
        })
      }

      res.json({
        success: true,
        data: product,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Salva a conversão de um produto
   */
  private async saveConversion(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const id = Number.parseInt(req.params.id)

      // Validar dados de entrada
      const conversionSchema = z.object({
        clientReference: z.string().min(1, "A referência do cliente é obrigatória"),
      })

      const validatedData = conversionSchema.parse(req.body)

      // Salvar a conversão
      const product = await this.productRepository.saveConversion(id, validatedData.clientReference)
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Produto não encontrado",
        })
      }

      res.json({
        success: true,
        data: product,
        message: "Conversão salva com sucesso",
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Importa múltiplos produtos
   */
  private async importProducts(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      // Validar dados de entrada
      const importSchema = z.object({
        products: z.array(
          z.object({
            code: z.string().min(1, "O código é obrigatório"),
            name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
            description: z.string().optional().nullable(),
            barcode: z.string().optional().nullable(),
            category: z.string().optional().nullable(),
            brand: z.string().optional().nullable(),
            price: z.string().min(1, "O preço é obrigatório"),
            stockQuantity: z.number().default(0),
            active: z.boolean().default(true),
            conversion: z.string().optional().nullable(),
            conversionBrand: z.string().optional().nullable(),
            equivalentBrands: z.string().optional().nullable(),
          }),
        ),
      })

      const validatedData = importSchema.parse(req.body)

      // Importar os produtos
      const count = await this.productRepository.importMany(validatedData.products)

      res.status(201).json({
        success: true,
        message: `${count} produtos importados com sucesso`,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Obtém estatísticas de produtos
   */
  private async getStatistics(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const statistics = await this.productRepository.getStatistics()

      res.json({
        success: true,
        data: statistics,
      })
    } catch (error) {
      next(error)
    }
  }
}
