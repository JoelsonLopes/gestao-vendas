/**
 * Configurações do servidor
 */
export const serverConfig = {
  port: process.env.PORT || 5000,
  env: process.env.NODE_ENV || "development",
  sessionSecret: process.env.SESSION_SECRET || "",
  corsOptions: {
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  },
  compression: {
    level: 6, // Nível de compressão ótimo entre velocidade e tamanho
    threshold: 1024, // Mínimo de tamanho em bytes para aplicar compressão
  },
  requestLimits: {
    json: "50mb",
    urlencoded: "50mb",
  },
  isDevelopment: process.env.NODE_ENV === "development",
  isProduction: process.env.NODE_ENV === "production",
}

// Validação das configurações críticas
export function validateServerConfig(): void {
  if (!serverConfig.sessionSecret && serverConfig.isProduction) {
    throw new Error("SESSION_SECRET não está definida no ambiente de produção")
  }
}
