import { Server } from "./server"
import { logger } from "./utils/logger"

/**
 * Função principal para iniciar a aplicação
 */
async function main() {
  try {
    logger.info("Iniciando aplicação...")

    const server = new Server()
    await server.start()

    logger.info("Aplicação iniciada com sucesso")
  } catch (error) {
    logger.error("Erro ao iniciar aplicação:", error)
    process.exit(1)
  }
}

// Iniciar a aplicação
main()

// Tratamento de exceções não capturadas
process.on("uncaughtException", (error) => {
  logger.error("Exceção não capturada:", error)
})

process.on("unhandledRejection", (reason) => {
  logger.error("Rejeição não tratada:", reason)
})
