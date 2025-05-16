import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "../infra/db";

const PostgresSessionStore = connectPg(session);

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export const sessionStore = new PostgresSessionStore({
  pool: pool,
  createTableIfMissing: true,
}); 