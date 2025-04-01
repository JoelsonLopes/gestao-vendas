import { 
  users, type User, type InsertUser,
  regions, type Region, type InsertRegion,
  clients, type Client, type InsertClient,
  products, type Product, type InsertProduct,
  discounts, type Discount, type InsertDiscount,
  orders, type Order, type InsertOrder,
  orderItems, type OrderItem, type InsertOrderItem,
  clientHistory, type ClientHistory, type InsertClientHistory
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, and, like, ilike, or } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Session
  sessionStore: session.Store;
  
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined>;
  listUsers(): Promise<User[]>;
  listRepresentatives(): Promise<User[]>;
  
  // Region methods
  getRegion(id: number): Promise<Region | undefined>;
  createRegion(region: InsertRegion): Promise<Region>;
  updateRegion(id: number, regionData: Partial<InsertRegion>): Promise<Region | undefined>;
  listRegions(): Promise<Region[]>;
  deleteRegion(id: number): Promise<boolean>;
  
  // Client methods
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, clientData: Partial<InsertClient>): Promise<Client | undefined>;
  listClients(): Promise<Client[]>;
  listClientsByRepresentative(representativeId: number): Promise<Client[]>;
  searchClients(query: string): Promise<Client[]>;
  addClientHistory(history: InsertClientHistory): Promise<ClientHistory>;
  getClientHistory(clientId: number): Promise<ClientHistory[]>;
  
  // Product methods
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, productData: Partial<InsertProduct>): Promise<Product | undefined>;
  listProducts(): Promise<Product[]>;
  searchProducts(query: string): Promise<Product[]>;
  importProducts(products: InsertProduct[]): Promise<number>;
  
  // Discount methods
  getDiscount(id: number): Promise<Discount | undefined>;
  createDiscount(discount: InsertDiscount): Promise<Discount>;
  listDiscounts(): Promise<Discount[]>;
  
  // Order methods
  getOrder(id: number): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: number, status: 'cotacao' | 'confirmado'): Promise<Order | undefined>;
  listOrders(): Promise<Order[]>;
  listOrdersByRepresentative(representativeId: number): Promise<Order[]>;
  listOrdersByClient(clientId: number): Promise<Order[]>;
  getOrderWithItems(orderId: number): Promise<{ order: Order, items: OrderItem[] } | undefined>;
  
  // Order Item methods
  createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem>;
  getOrderItems(orderId: number): Promise<OrderItem[]>;
  
  // Stats methods
  getOrderStats(): Promise<any>;
  getProductStats(): Promise<any>;
  getClientStats(): Promise<any>;
  getSalesByRepresentative(): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set");
    }
    
    this.sessionStore = new PostgresSessionStore({
      pool: pool,
      createTableIfMissing: true,
    });
  }

  // User methods
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
    const [newUser] = await db
      .insert(users)
      .values(user)
      .returning();
    return newUser;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }

  async listUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async listRepresentatives(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, 'representative'));
  }

  // Region methods
  async getRegion(id: number): Promise<Region | undefined> {
    const [region] = await db.select().from(regions).where(eq(regions.id, id));
    return region || undefined;
  }

  async createRegion(region: InsertRegion): Promise<Region> {
    const [newRegion] = await db
      .insert(regions)
      .values(region)
      .returning();
    return newRegion;
  }

  async updateRegion(id: number, regionData: Partial<InsertRegion>): Promise<Region | undefined> {
    const [updatedRegion] = await db
      .update(regions)
      .set({ ...regionData, updatedAt: new Date() })
      .where(eq(regions.id, id))
      .returning();
    return updatedRegion || undefined;
  }

  async listRegions(): Promise<Region[]> {
    return await db.select().from(regions);
  }

  async deleteRegion(id: number): Promise<boolean> {
    const result = await db
      .delete(regions)
      .where(eq(regions.id, id))
      .returning();
    return result.length > 0;
  }

  // Client methods
  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db
      .insert(clients)
      .values(client)
      .returning();
    return newClient;
  }

  async updateClient(id: number, clientData: Partial<InsertClient>): Promise<Client | undefined> {
    const [updatedClient] = await db
      .update(clients)
      .set({ ...clientData, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return updatedClient || undefined;
  }

  async listClients(): Promise<Client[]> {
    return await db.select().from(clients);
  }

  async listClientsByRepresentative(representativeId: number): Promise<Client[]> {
    return await db.select().from(clients).where(eq(clients.representativeId, representativeId));
  }

  async searchClients(query: string): Promise<Client[]> {
    return await db.select().from(clients).where(
      or(
        ilike(clients.name, `%${query}%`),
        ilike(clients.cnpj, `%${query}%`),
        ilike(clients.code, `%${query}%`)
      )
    );
  }

  async addClientHistory(history: InsertClientHistory): Promise<ClientHistory> {
    const [newHistory] = await db
      .insert(clientHistory)
      .values(history)
      .returning();
    return newHistory;
  }

  async getClientHistory(clientId: number): Promise<ClientHistory[]> {
    return await db.select().from(clientHistory).where(eq(clientHistory.clientId, clientId));
  }

  // Product methods
  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db
      .insert(products)
      .values({...product})
      .returning();
    return newProduct;
  }

  async updateProduct(id: number, productData: Partial<InsertProduct>): Promise<Product | undefined> {
    const updatedData = { ...productData, updatedAt: new Date() };
    const [updatedProduct] = await db
      .update(products)
      .set(updatedData)
      .where(eq(products.id, id))
      .returning();
    return updatedProduct || undefined;
  }

  async listProducts(): Promise<Product[]> {
    return await db.select().from(products);
  }

  async searchProducts(query: string): Promise<Product[]> {
    return await db.select().from(products).where(
      or(
        ilike(products.name, `%${query}%`),
        ilike(products.category, `%${query}%`),
        ilike(products.brand, `%${query}%`),
        ilike(products.barcode, `%${query}%`),
        ilike(products.code, `%${query}%`)
      )
    );
  }

  async importProducts(productsList: InsertProduct[]): Promise<number> {
    const productsData = productsList.map(product => ({ ...product }));
    const result = await db.insert(products).values(productsData).returning();
    return result.length;
  }

  // Discount methods
  async getDiscount(id: number): Promise<Discount | undefined> {
    const [discount] = await db.select().from(discounts).where(eq(discounts.id, id));
    return discount || undefined;
  }

  async createDiscount(discount: InsertDiscount): Promise<Discount> {
    const [newDiscount] = await db
      .insert(discounts)
      .values(discount)
      .returning();
    return newDiscount;
  }

  async listDiscounts(): Promise<Discount[]> {
    return await db.select().from(discounts);
  }

  // Order methods
  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db
      .insert(orders)
      .values(order)
      .returning();
    return newOrder;
  }

  async updateOrderStatus(id: number, status: 'cotacao' | 'confirmado'): Promise<Order | undefined> {
    const [updatedOrder] = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder || undefined;
  }

  async listOrders(): Promise<Order[]> {
    return await db.select().from(orders);
  }

  async listOrdersByRepresentative(representativeId: number): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.representativeId, representativeId));
  }

  async listOrdersByClient(clientId: number): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.clientId, clientId));
  }

  async getOrderWithItems(orderId: number): Promise<{ order: Order, items: OrderItem[] } | undefined> {
    const order = await this.getOrder(orderId);
    if (!order) return undefined;
    
    const items = await this.getOrderItems(orderId);
    return {
      order,
      items
    };
  }

  // Order Item methods
  async createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem> {
    const [newOrderItem] = await db
      .insert(orderItems)
      .values(orderItem)
      .returning();
    return newOrderItem;
  }

  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  // Stats methods
  async getOrderStats(): Promise<any> {
    // Get total orders count, confirmed orders count, quotes count
    const allOrders = await this.listOrders();
    const confirmedOrders = allOrders.filter(order => order.status === 'confirmado');
    const quotationOrders = allOrders.filter(order => order.status === 'cotacao');
    
    return {
      total: allOrders.length,
      confirmed: confirmedOrders.length,
      quotation: quotationOrders.length,
      totalValue: allOrders.reduce((sum, order) => sum + Number(order.total), 0)
    };
  }

  async getProductStats(): Promise<any> {
    // Get total products count and active products count
    const allProducts = await this.listProducts();
    const activeProducts = allProducts.filter(product => product.active);
    
    return {
      total: allProducts.length,
      active: activeProducts.length
    };
  }

  async getClientStats(): Promise<any> {
    // Get total clients count and active clients count
    const allClients = await this.listClients();
    const activeClients = allClients.filter(client => client.active);
    
    return {
      total: allClients.length,
      active: activeClients.length
    };
  }

  async getSalesByRepresentative(): Promise<any> {
    // Get sales by representatives
    const representatives = await this.listRepresentatives();
    const allOrders = await this.listOrders();
    
    return await Promise.all(representatives.map(async (rep) => {
      const repOrders = allOrders.filter(order => order.representativeId === rep.id);
      const confirmedOrders = repOrders.filter(order => order.status === 'confirmado');
      
      return {
        id: rep.id,
        name: rep.name,
        totalOrders: repOrders.length,
        confirmedOrders: confirmedOrders.length,
        totalValue: confirmedOrders.reduce((sum, order) => sum + Number(order.total), 0)
      };
    }));
  }
}

export const storage = new DatabaseStorage();
