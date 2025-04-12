import fs from "fs"
import path from "path"
import { promisify } from "util"
import { nanoid } from "nanoid"
import express, { type Express, type Request, type Response, type NextFunction } from "express"
import { logger } from "../utils/logger"

// Promisificar funções do fs
const mkdir = promisify(fs.mkdir)
const writeFile = promisify(fs.writeFile)
const readFile = promisify(fs.readFile)
const unlink = promisify(fs.unlink)
const readdir = promisify(fs.readdir)
const stat = promisify(fs.stat)

// Interface para arquivo enviado
interface UploadedFile {
  fieldname: string
  originalname: string
  encoding: string
  mimetype: string
  size: number
  destination: string
  filename: string
  path: string
  buffer?: Buffer
}

/**
 * Serviço para gerenciar armazenamento de arquivos
 */
export class StorageService {
  private uploadDir: string
  private tempDir: string

  constructor() {
    this.uploadDir = path.resolve(process.cwd(), "uploads")
    this.tempDir = path.resolve(this.uploadDir, "temp")
    this.ensureDirectoriesExist()
  }

  /**
   * Garante que os diretórios necessários existam
   */
  private async ensureDirectoriesExist(): Promise<void> {
    try {
      // Criar diretório de uploads se não existir
      if (!fs.existsSync(this.uploadDir)) {
        await mkdir(this.uploadDir, { recursive: true })
        logger.info(`Diretório de uploads criado: ${this.uploadDir}`)
      }

      // Criar diretório temporário se não existir
      if (!fs.existsSync(this.tempDir)) {
        await mkdir(this.tempDir, { recursive: true })
        logger.info(`Diretório temporário criado: ${this.tempDir}`)
      }
    } catch (error) {
      logger.error("Erro ao criar diretórios de armazenamento:", error)
      throw error
    }
  }

  /**
   * Cria um middleware para upload de um único arquivo
   */
  public getMulterUpload(
    subdir = "",
    fileFilter?: (file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => void,
  ): any {
    // Implementação simplificada de upload de arquivo
    return {
      single: (fieldName: string) => {
        return async (req: Request, res: Response, next: NextFunction) => {
          try {
            if (!req.is("multipart/form-data")) {
              return next(new Error("Requisição deve ser multipart/form-data"))
            }

            // Criar subdiretório se não existir
            const destDir = subdir ? path.join(this.uploadDir, subdir) : this.uploadDir
            if (!fs.existsSync(destDir)) {
              await mkdir(destDir, { recursive: true })
            }

            // Processar o arquivo
            const file = req.body[fieldName]
            if (!file) {
              return next()
            }

            // Gerar nome único para o arquivo
            const uniqueId = nanoid(10)
            const originalname = file.name || "unknown"
            const ext = path.extname(originalname)
            const filename = `${Date.now()}-${uniqueId}${ext}`
            const filePath = path.join(destDir, filename)

            // Salvar o arquivo
            await writeFile(filePath, file.data)

            // Adicionar informações do arquivo ao request
            req.file = {
              fieldname: fieldName,
              originalname,
              encoding: "7bit",
              mimetype: file.mimetype || "application/octet-stream",
              size: file.data.length,
              destination: destDir,
              filename,
              path: filePath,
            }

            next()
          } catch (error) {
            next(error)
          }
        }
      },
      array: (fieldName: string, maxCount = 10) => {
        return async (req: Request, res: Response, next: NextFunction) => {
          try {
            if (!req.is("multipart/form-data")) {
              return next(new Error("Requisição deve ser multipart/form-data"))
            }

            // Criar subdiretório se não existir
            const destDir = subdir ? path.join(this.uploadDir, subdir) : this.uploadDir
            if (!fs.existsSync(destDir)) {
              await mkdir(destDir, { recursive: true })
            }

            // Processar os arquivos
            const files = req.body[fieldName]
            if (!files || !Array.isArray(files)) {
              return next()
            }

            const uploadedFiles: UploadedFile[] = []

            for (let i = 0; i < Math.min(files.length, maxCount); i++) {
              const file = files[i]

              // Gerar nome único para o arquivo
              const uniqueId = nanoid(10)
              const originalname = file.name || "unknown"
              const ext = path.extname(originalname)
              const filename = `${Date.now()}-${uniqueId}${ext}`
              const filePath = path.join(destDir, filename)

              // Salvar o arquivo
              await writeFile(filePath, file.data)

              uploadedFiles.push({
                fieldname: fieldName,
                originalname,
                encoding: "7bit",
                mimetype: file.mimetype || "application/octet-stream",
                size: file.data.length,
                destination: destDir,
                filename,
                path: filePath,
              })
            }

            // Adicionar informações dos arquivos ao request
            req.files = uploadedFiles

            next()
          } catch (error) {
            next(error)
          }
        }
      },
    }
  }

  /**
   * Salva um arquivo a partir de um buffer
   */
  public async saveBuffer(buffer: Buffer, filename: string, subdir = ""): Promise<{ path: string; filename: string }> {
    try {
      const destDir = subdir ? path.join(this.uploadDir, subdir) : this.uploadDir

      // Criar subdiretório se não existir
      if (!fs.existsSync(destDir)) {
        await mkdir(destDir, { recursive: true })
      }

      // Gerar nome único para o arquivo se não fornecido
      if (!filename) {
        const uniqueId = nanoid(10)
        filename = `${Date.now()}-${uniqueId}`
      }

      const filePath = path.join(destDir, filename)
      await writeFile(filePath, buffer)

      logger.info(`Arquivo salvo: ${filePath}`)

      return {
        path: filePath,
        filename,
      }
    } catch (error) {
      logger.error(`Erro ao salvar arquivo ${filename}:`, error)
      throw error
    }
  }

  /**
   * Salva um arquivo temporário
   */
  public async saveTempFile(buffer: Buffer, filename = ""): Promise<{ path: string; filename: string }> {
    try {
      // Gerar nome único para o arquivo se não fornecido
      if (!filename) {
        const uniqueId = nanoid(10)
        filename = `${Date.now()}-${uniqueId}.tmp`
      }

      const filePath = path.join(this.tempDir, filename)
      await writeFile(filePath, buffer)

      logger.info(`Arquivo temporário salvo: ${filePath}`)

      return {
        path: filePath,
        filename,
      }
    } catch (error) {
      logger.error(`Erro ao salvar arquivo temporário ${filename}:`, error)
      throw error
    }
  }

  /**
   * Lê um arquivo
   */
  public async readFile(filename: string, subdir = ""): Promise<Buffer> {
    try {
      const filePath = subdir ? path.join(this.uploadDir, subdir, filename) : path.join(this.uploadDir, filename)

      return await readFile(filePath)
    } catch (error) {
      logger.error(`Erro ao ler arquivo ${filename}:`, error)
      throw error
    }
  }

  /**
   * Exclui um arquivo
   */
  public async deleteFile(filename: string, subdir = ""): Promise<boolean> {
    try {
      const filePath = subdir ? path.join(this.uploadDir, subdir, filename) : path.join(this.uploadDir, filename)

      await unlink(filePath)
      logger.info(`Arquivo excluído: ${filePath}`)
      return true
    } catch (error) {
      logger.error(`Erro ao excluir arquivo ${filename}:`, error)
      return false
    }
  }

  /**
   * Lista arquivos em um diretório
   */
  public async listFiles(subdir = ""): Promise<{ name: string; path: string; size: number; createdAt: Date }[]> {
    try {
      const dirPath = subdir ? path.join(this.uploadDir, subdir) : this.uploadDir

      // Verificar se o diretório existe
      if (!fs.existsSync(dirPath)) {
        return []
      }

      const files = await readdir(dirPath)
      const fileDetails = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(dirPath, file)
          const stats = await stat(filePath)

          return {
            name: file,
            path: filePath,
            size: stats.size,
            createdAt: stats.birthtime,
          }
        }),
      )

      return fileDetails
    } catch (error) {
      logger.error(`Erro ao listar arquivos em ${subdir || "uploads"}:`, error)
      throw error
    }
  }

  /**
   * Limpa arquivos temporários antigos
   */
  public async cleanupTempFiles(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<number> {
    try {
      const now = Date.now()
      const files = await this.listFiles("temp")

      let deletedCount = 0

      for (const file of files) {
        const fileAge = now - file.createdAt.getTime()

        if (fileAge > maxAgeMs) {
          const deleted = await this.deleteFile(file.name, "temp")
          if (deleted) {
            deletedCount++
          }
        }
      }

      logger.info(`Limpeza de arquivos temporários: ${deletedCount} arquivos excluídos`)
      return deletedCount
    } catch (error) {
      logger.error("Erro ao limpar arquivos temporários:", error)
      throw error
    }
  }

  /**
   * Obtém o caminho absoluto para um arquivo
   */
  public getFilePath(filename: string, subdir = ""): string {
    return subdir ? path.join(this.uploadDir, subdir, filename) : path.join(this.uploadDir, filename)
  }

  /**
   * Obtém a URL relativa para um arquivo
   */
  public getFileUrl(filename: string, subdir = ""): string {
    return subdir ? `/uploads/${subdir}/${filename}` : `/uploads/${filename}`
  }

  /**
   * Configura o middleware Express para servir arquivos estáticos
   */
  public setupStaticFileServing(app: Express): void {
    app.use("/uploads", (req, res, next) => {
      // Verificar autenticação para arquivos protegidos
      if (req.path.startsWith("/protected/") && !req.isAuthenticated()) {
        return res.status(401).send("Não autorizado")
      }
      next()
    })

    app.use(
      "/uploads",
      fs.existsSync(this.uploadDir) ? express.static(this.uploadDir) : (req: Request, res: any, next: any) => next(),
    )

    logger.info("Middleware de arquivos estáticos configurado")
  }
}

// Estender a interface Request do Express para incluir as propriedades de upload
declare global {
  namespace Express {
    interface Request {
      file?: {
        fieldname: string
        originalname: string
        encoding: string
        mimetype: string
        size: number
        destination: string
        filename: string
        path: string
      }
      files?: {
        fieldname: string
        originalname: string
        encoding: string
        mimetype: string
        size: number
        destination: string
        filename: string
        path: string
      }[]
    }

    // Adicionar o namespace Multer dentro do namespace Express
    namespace Multer {
      interface File {
        fieldname: string
        originalname: string
        encoding: string
        mimetype: string
        size: number
        destination: string
        filename: string
        path: string
        buffer?: Buffer
      }
    }
  }
}

// Exporta uma instância única do serviço
export const storageService = new StorageService()
