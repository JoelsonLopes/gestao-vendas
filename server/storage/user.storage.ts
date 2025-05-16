import { users, type User, type InsertUser } from "@shared/schema";
import { db } from "../infra/db";
import { eq, or, and } from "drizzle-orm";

export interface IUserStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined>;
  listUsers(): Promise<User[]>;
  listRepresentatives(): Promise<User[]>;
  getPendingUsers(): Promise<User[]>;
  deleteUser(id: number): Promise<boolean>;
}

export class UserStorage implements IUserStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db.update(users).set({ ...userData, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return updatedUser || undefined;
  }

  async listUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async listRepresentatives(): Promise<User[]> {
    return await db.select().from(users).where(
      or(
        eq(users.role, 'representative'),
        eq(users.role, 'admin')
      )
    );
  }

  async getPendingUsers(): Promise<User[]> {
    return await db.select().from(users).where(
      and(
        eq(users.role, "representative"),
        eq(users.approved, false)
      )
    );
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }
} 