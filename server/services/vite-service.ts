import express, { type Express } from "express"
import fs from "fs"
import path from "path"
import { createServer as createViteServer, createLogger } from "vite"
import type { Server } from "http"
import { nanoid } from "nanoid"
import { logger } from "../utils/logger"

const viteLogger = createLogger()

/**
 * Configura o Vite para desenvolvimento
 */
export async function setupVite(app: Express, server: Server): Promise<void> {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: undefined,
  }

  const vite = await createViteServer({
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options)
        process.exit(1)
      },
    },
    server: serverOptions,
    appType: "custom",
  })

  app.use(vite.middlewares)
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl

    try {
      const clientTemplate = path.resolve(process.cwd(), "client", "index.html")

      // Sempre recarregar o arquivo index.html do disco caso ele mude
      let template = await fs.promises.readFile(clientTemplate, "utf-8")
      template = template.replace(`src="/src/main.tsx"`, `src="/src/main.tsx?v=${nanoid()}"`)
      const page = await vite.transformIndexHtml(url, template)
      res.status(200).set({ "Content-Type": "text/html" }).end(page)
    } catch (e) {
      vite.ssrFixStacktrace(e as Error)
      next(e)
    }
  })

  logger.info("Vite configurado para desenvolvimento")
}

/**
 * Configura o Express para servir arquivos estáticos em produção
 */
export function serveStatic(app: Express): void {
  const distPath = path.resolve(process.cwd(), "dist", "public")

  if (!fs.existsSync(distPath)) {
    throw new Error(`Diretório de build não encontrado: ${distPath}, certifique-se de construir o cliente primeiro`)
  }

  app.use(express.static(distPath))

  // Redirecionar para index.html se o arquivo não existir
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"))
  })

  logger.info(`Arquivos estáticos sendo servidos de ${distPath}`)
}
