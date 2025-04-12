/**
 * Utilitário de logging centralizado
 */
export const logger = {
  info: (message: string, ...args: any[]): void => {
    const formattedTime = formatTime()
    console.log(`${formattedTime} [INFO] ${message}`, ...args)
  },

  error: (message: string, error?: any): void => {
    const formattedTime = formatTime()
    console.error(`${formattedTime} [ERROR] ${message}`)
    if (error) {
      if (error instanceof Error) {
        console.error(`${formattedTime} [ERROR] ${error.message}`)
        console.error(`${formattedTime} [ERROR] ${error.stack}`)
      } else {
        console.error(`${formattedTime} [ERROR]`, error)
      }
    }
  },

  warn: (message: string, ...args: any[]): void => {
    const formattedTime = formatTime()
    console.warn(`${formattedTime} [WARN] ${message}`, ...args)
  },

  debug: (message: string, ...args: any[]): void => {
    if (process.env.NODE_ENV !== "production") {
      const formattedTime = formatTime()
      console.debug(`${formattedTime} [DEBUG] ${message}`, ...args)
    }
  },

  request: (method: string, path: string, statusCode: number, duration: number, responseData?: any): void => {
    const formattedTime = formatTime()
    let logLine = `${formattedTime} [REQUEST] ${method} ${path} ${statusCode} em ${duration}ms`

    if (responseData && path.startsWith("/api")) {
      const responseStr = JSON.stringify(responseData)
      if (typeof responseStr === "string" && responseStr.length > 80) {
        logLine += ` :: ${responseStr.slice(0, 79)}…`
      } else if (typeof responseStr === "string") {
        logLine += ` :: ${responseStr}`
      }
    }

    console.log(logLine)
  },
}

function formatTime(): string {
  return new Date().toLocaleTimeString("pt-BR", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}
