import { pgTable, text, serial, integer, boolean, timestamp, json, real, decimal, foreignKey, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enum for user roles
export const userRoleEnum = pgEnum('user_role', ['admin', 'representative']);

// Enum for order status
export const orderStatusEnum = pgEnum('order_status', ['cotacao', 'confirmado']);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull().default('representative'),
  active: boolean("active").notNull().default(true),
  googleId: text("google_id"),
  avatar: text("avatar"),
  regionId: integer("region_id").references(() => regions.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Regions table
export const regions = pgTable("regions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Clients table
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  cnpj: text("cnpj").notNull().unique(),
  code: text("code").notNull().unique(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  phone: text("phone"),
  email: text("email"),
  representativeId: integer("representative_id").references(() => users.id),
  regionId: integer("region_id").references(() => regions.id),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Products table
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  code: text("code").notNull().unique(), // IdProduto na sua tabela
  barcode: text("barcode"),
  category: text("category"),
  brand: text("brand"), // Marca na sua tabela
  // Novos campos adicionados com base na sua estrutura
  conversion: text("conversion"), // Conversao na sua tabela
  conversionBrand: text("conversion_brand"), // MarcaConversao na sua tabela
  equivalentBrands: json("equivalent_brands").$type<string[]>(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(), // Preco na sua tabela
  stockQuantity: integer("stock_quantity").default(0),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Discount options table
export const discounts = pgTable("discounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  percentage: decimal("percentage", { precision: 5, scale: 2 }).notNull(),
  commission: decimal("commission", { precision: 5, scale: 2 }).notNull(),
});

// Orders table
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clients.id),
  representativeId: integer("representative_id").notNull().references(() => users.id),
  status: orderStatusEnum("status").notNull().default('cotacao'),
  paymentTerms: text("payment_terms"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  taxes: decimal("taxes", { precision: 10, scale: 2 }).default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Order items table
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  discountId: integer("discount_id").references(() => discounts.id),
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }),
  commission: decimal("commission", { precision: 5, scale: 2 }),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  // clientRef removido pois não existe na tabela do banco
  // clientRef: text("client_ref"),
});

// Client history table
export const clientHistory = pgTable("client_history", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clients.id),
  userId: integer("user_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  details: json("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ZOD Schemas for inserts
export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertRegionSchema = createInsertSchema(regions).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertClientSchema = createInsertSchema(clients).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertProductSchema = createInsertSchema(products).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertDiscountSchema = createInsertSchema(discounts).omit({ 
  id: true 
});

export const insertOrderSchema = createInsertSchema(orders).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ 
  id: true 
});

export const insertClientHistorySchema = createInsertSchema(clientHistory).omit({ 
  id: true, 
  createdAt: true 
});

// Exported Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertRegion = z.infer<typeof insertRegionSchema>;
export type Region = typeof regions.$inferSelect;

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export type InsertDiscount = z.infer<typeof insertDiscountSchema>;
export type Discount = typeof discounts.$inferSelect;

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;

export type InsertClientHistory = z.infer<typeof insertClientHistorySchema>;
export type ClientHistory = typeof clientHistory.$inferSelect;

// Login DTO Schema
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type LoginData = z.infer<typeof loginSchema>;
