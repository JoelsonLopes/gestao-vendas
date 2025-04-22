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
import { eq, and, like, ilike, or, not } from "drizzle-orm";
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
  getPendingUsers(): Promise<User[]>;
  deleteUser(id: number): Promise<boolean>;
  
  // Region methods
  getRegion(id: number): Promise<Region | undefined>;
  createRegion(region: InsertRegion): Promise<Region>;
  updateRegion(id: number, regionData: Partial<InsertRegion>): Promise<Region | undefined>;
  listRegions(): Promise<Region[]>;
  deleteRegion(id: number): Promise<boolean>;
  
  // Client methods
  getClient(id: number): Promise<Client | undefined>;
  getClientByCode(code: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, clientData: Partial<InsertClient>): Promise<Client | undefined>;
  listClients(): Promise<Client[]>;
  listClientsByRepresentative(representativeId: number): Promise<Client[]>;
  searchClients(query: string): Promise<Client[]>;
  addClientHistory(history: InsertClientHistory): Promise<ClientHistory>;
  getClientHistory(clientId: number): Promise<ClientHistory[]>;
  
  // Product methods
  getProduct(id: number): Promise<Product | undefined>;
  getProductByCode(code: string): Promise<Product | undefined>;
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
  updateOrder(id: number, orderData: Partial<InsertOrder>): Promise<Order | undefined>;
  updateOrderStatus(id: number, status: 'cotacao' | 'confirmado'): Promise<Order | undefined>;
  deleteOrder(id: number): Promise<boolean>;
  listOrders(): Promise<Order[]>;
  listOrdersByRepresentative(representativeId: number): Promise<Order[]>;
  listOrdersByClient(clientId: number): Promise<Order[]>;
  getOrderWithItems(orderId: number): Promise<{ order: Order, items: OrderItem[] } | undefined>;
  
  // Order Item methods
  createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem>;
  updateOrderItems(orderId: number, items: InsertOrderItem[]): Promise<OrderItem[]>;
  deleteOrderItems(orderId: number): Promise<boolean>;
  getOrderItems(orderId: number): Promise<OrderItem[]>;
  
  // Stats methods
  getOrderStats(representativeId?: number | null): Promise<any>;
  getProductStats(): Promise<any>;
  getClientStats(representativeId?: number | null): Promise<any>;
  getSalesByRepresentative(representativeId?: number | null): Promise<any>;
  getSalesByBrand(representativeId?: number | null): Promise<any>;
  getTopSellingProducts(limit?: number, representativeId?: number | null): Promise<any>;
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
    // Incluir tanto representantes quanto usuários admin
    // Esta abordagem permite que o admin atue também como representante
    return await db.select().from(users).where(
      or(
        eq(users.role, 'representative'),
        eq(users.role, 'admin')
      )
    );
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
  
  async getClientByCode(code: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.code, code));
    return client || undefined;
  }

  async createClient(client: InsertClient): Promise<Client> {
    try {
      console.log("Inserindo cliente no banco:", JSON.stringify(client));
      const [newClient] = await db
        .insert(clients)
        .values(client)
        .returning();
      return newClient;
    } catch (error) {
      console.error("Erro detalhado ao criar cliente:", error);
      // Verificar se é um erro de chave única (código ou CNPJ duplicado)
      if (error instanceof Error && error.message.includes('duplicate key')) {
        if (error.message.includes('cnpj')) {
          throw new Error("CNPJ já está em uso por outro cliente");
        } else if (error.message.includes('code')) {
          throw new Error("Código já está em uso por outro cliente");
        }
      }
      throw error; // Repassar o erro para ser tratado pelo middleware
    }
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
    // Converte a query para minúsculas para comparação case-insensitive
    const searchTerm = query.toLowerCase().trim();
    
    console.log(`Buscando clientes com termo: "${searchTerm}"`);
    
    // Verifica exatamente o código do cliente
    if (/^\d+$/.test(searchTerm)) { 
      console.log(`Detectada busca por código exato: ${searchTerm}`);
      
      // Primeiro tenta buscar pelo código exato
      const exactCodeResults = await db.select().from(clients).where(eq(clients.code, searchTerm));
      
      // Se encontrou resultados exatos, retorna imediatamente
      if (exactCodeResults.length > 0) {
        console.log(`Encontrado cliente com código exato: ${searchTerm}`);
        return exactCodeResults;
      }
    }
    
    // Busca em todos os campos relevantes com ILIKE para busca case-insensitive
    const results = await db.select().from(clients).where(
      or(
        ilike(clients.name, `%${searchTerm}%`),     // Nome
        ilike(clients.cnpj, `%${searchTerm}%`),     // CNPJ
        ilike(clients.code, `%${searchTerm}%`),     // Código
        ilike(clients.phone, `%${searchTerm}%`),    // Telefone
        ilike(clients.city, `%${searchTerm}%`),     // Cidade
        ilike(clients.email, `%${searchTerm}%`)     // Email
      )
    );
    
    console.log(`Encontrados ${results.length} clientes para o termo: "${searchTerm}"`);
    
    return results;
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
    try {
      // Selecionar todas as colunas, incluindo os campos de conversão
      const [product] = await db.select({
        id: products.id,
        name: products.name,
        code: products.code,
        description: products.description,
        barcode: products.barcode,
        category: products.category,
        brand: products.brand,
        price: products.price,
        stockQuantity: products.stockQuantity,
        active: products.active,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        conversion: products.conversion,
        conversionBrand: products.conversionBrand,
        equivalentBrands: products.equivalentBrands
      })
      .from(products)
      .where(eq(products.id, id));
      
      return product;
    } catch (error) {
      console.error(`Erro ao buscar produto com ID ${id}:`, error);
      throw error;
    }
  }
  
  async getProductByCode(code: string): Promise<Product | undefined> {
    try {
      console.log(`Buscando produto com código ou nome: ${code}`);
      
      // Selecionar todas as colunas, incluindo os campos de conversão
      const [product] = await db.select({
        id: products.id,
        name: products.name,
        code: products.code,
        description: products.description,
        barcode: products.barcode,
        category: products.category,
        brand: products.brand,
        price: products.price,
        stockQuantity: products.stockQuantity,
        active: products.active,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        conversion: products.conversion,
        conversionBrand: products.conversionBrand,
        equivalentBrands: products.equivalentBrands
      })
      .from(products)
      .where(or(eq(products.code, code), eq(products.name, code)));
      
      if (product) {
        console.log(`Produto encontrado com código/nome ${code}:`, product);
      } else {
        console.log(`Nenhum produto encontrado com código/nome ${code}`);
      }
      
      return product;
    } catch (error) {
      console.error(`Erro ao buscar produto com código ${code}:`, error);
      throw error;
    }
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    try {
      // Extrair todos os campos, incluindo os campos de conversão
      const {
        code,
        name,
        description,
        barcode,
        category,
        brand,
        price,
        stockQuantity,
        active,
        conversion,
        conversionBrand,
        equivalentBrands
      } = product;
      
      // Criar o produto com todos os campos
      const [newProduct] = await db
        .insert(products)
        .values({
          code,
          name,
          description,
          barcode,
          category,
          brand,
          price,
          stockQuantity,
          active,
          conversion,
          conversionBrand,
          equivalentBrands: Array.isArray(equivalentBrands) ? equivalentBrands as string[] : null
        })
        .returning();
      
      return newProduct;
    } catch (error) {
      console.error("Erro ao criar produto:", error);
      throw error;
    }
  }

  async updateProduct(id: number, productData: Partial<InsertProduct>): Promise<Product | undefined> {
    try {
      // Extrair todos os campos, incluindo os campos de conversão
      const {
        code,
        name,
        description,
        barcode,
        category,
        brand,
        price,
        stockQuantity,
        active,
        conversion,
        conversionBrand,
        equivalentBrands
      } = productData;
      
      // Criar objeto apenas com campos válidos e não nulos
      const updateFields: any = { updatedAt: new Date() };
      if (code !== undefined) updateFields.code = code;
      if (name !== undefined) updateFields.name = name;
      if (description !== undefined) updateFields.description = description;
      if (barcode !== undefined) updateFields.barcode = barcode;
      if (category !== undefined) updateFields.category = category;
      if (brand !== undefined) updateFields.brand = brand;
      if (price !== undefined) updateFields.price = price;
      if (stockQuantity !== undefined) updateFields.stockQuantity = stockQuantity;
      if (active !== undefined) updateFields.active = active;
      if (conversion !== undefined) updateFields.conversion = conversion;
      if (conversionBrand !== undefined) updateFields.conversionBrand = conversionBrand;
      if (equivalentBrands !== undefined) updateFields.equivalentBrands = equivalentBrands;
      
      // Atualizar o produto incluindo os campos de conversão
      const [updatedProduct] = await db
        .update(products)
        .set(updateFields)
        .where(eq(products.id, id))
        .returning();
      
      if (!updatedProduct) return undefined;
      
      // Retornar o produto atualizado
      return updatedProduct;
    } catch (error) {
      console.error(`Erro ao atualizar produto com ID ${id}:`, error);
      throw error;
    }
  }

  async listProducts(): Promise<Product[]> {
    try {
      // Selecionar todas as colunas, incluindo os campos de conversão
      const result = await db.select({
        id: products.id,
        name: products.name,
        code: products.code,
        description: products.description,
        barcode: products.barcode,
        category: products.category,
        brand: products.brand,
        price: products.price,
        stockQuantity: products.stockQuantity,
        active: products.active,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        conversion: products.conversion,
        conversionBrand: products.conversionBrand,
        equivalentBrands: products.equivalentBrands
      }).from(products);
      
      return result;
    } catch (error) {
      console.error("Erro ao listar produtos:", error);
      throw error;
    }
  }

  async searchProducts(query: string): Promise<Product[]> {
    try {
      console.log(`Executando busca de produtos com o termo: "${query}"`);
      
      // Função para selecionar todas as colunas de produtos
      const selectAllProductColumns = () => ({
        id: products.id,
        name: products.name,
        code: products.code,
        description: products.description,
        barcode: products.barcode,
        category: products.category,
        brand: products.brand,
        price: products.price,
        stockQuantity: products.stockQuantity,
        active: products.active,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        conversion: products.conversion,
        conversionBrand: products.conversionBrand,
        equivalentBrands: products.equivalentBrands
      });
      
      // Primeira etapa: buscar produtos com correspondência exata no código, nome ou conversion
      const exactMatches = await db.select(selectAllProductColumns())
        .from(products)
        .where(
          or(
            eq(products.name, query),      // Correspondência exata com nome
            eq(products.code, query),      // Correspondência exata com código
            eq(products.conversion, query), // Correspondência exata com conversão
            eq(products.barcode, query)    // Correspondência exata com código de barras
          )
        )
        .limit(30);
        
      // Segunda etapa: buscar produtos relacionados, onde o código pesquisado aparece como "conversion"
      // Isso fará com que, quando buscarmos por "TM4", o produto "WUNI0004" (que tem conversion = "TM4") também seja encontrado
      const relatedProducts = await db.select(selectAllProductColumns())
        .from(products)
        .where(eq(products.conversion, query))
        .limit(30);
        
      // Terceira etapa: buscar produtos onde o código pesquisado está como valor no campo "conversion" de outros produtos
      // Isso fará com que, quando buscarmos por "WUNI0004", o produto "TM4" também seja encontrado
      const productsWithMatchingCode = [];
      
      // Só fazemos essa busca se tivermos exatamente 1 resultado exato, para evitar muitas consultas
      if (exactMatches.length === 1) {
        const searchTerm = exactMatches[0].name;
        const productsWithConversion = await db.select(selectAllProductColumns())
          .from(products)
          .where(eq(products.name, exactMatches[0].conversion || ""))
          .limit(10);
        
        if (productsWithConversion.length > 0) {
          productsWithMatchingCode.push(...productsWithConversion);
        }
      }
      
      // Nova etapa: buscar produtos que começam com o mesmo prefixo (importante para códigos como FCD2058 encontrar FCD2058B)
      const prefixMatches = await db.select(selectAllProductColumns())
        .from(products)
        .where(
          or(
            and(
              // O código ou conversion começa com o termo de busca...
              or(
                like(products.code, `${query}%`),        // Prefixo no código
                like(products.conversion, `${query}%`),  // Prefixo na conversão
                like(products.name, `${query}%`)         // Prefixo no nome
              ),
              // ...e não é exatamente igual (evita duplicatas com busca exata)
              and(
                not(eq(products.code, query)),
                not(eq(products.conversion, query))
              )
            )
          )
        )
        .limit(30);
        
      console.log(`Encontrados ${prefixMatches.length} produtos com prefixo "${query}"`);
      
      // Combinar todos os resultados, removendo duplicatas por ID
      const allResults = [...exactMatches, ...relatedProducts, ...productsWithMatchingCode, ...prefixMatches];
      const uniqueResults = Array.from(new Map(allResults.map(item => [item.id, item])).values());
      
      if (uniqueResults.length > 0) {
        console.log(`Encontrados ${uniqueResults.length} produtos com correspondência para "${query}"`);
        return uniqueResults;
      }
      
      // Se não encontrou nada com as buscas exatas ou prefixos, faz uma busca mais ampla com LIKE
      const result = await db.select(selectAllProductColumns())
        .from(products)
        .where(
          or(
            ilike(products.name, `%${query}%`),
            ilike(products.category, `%${query}%`),
            ilike(products.brand, `%${query}%`),
            ilike(products.barcode, `%${query}%`),
            ilike(products.code, `%${query}%`),
            ilike(products.conversion, `%${query}%`), // Buscar também na referência do cliente
            ilike(products.description, `%${query}%`) // Buscar também na descrição
          )
        )
        .limit(30);
      
      console.log(`Encontrados ${result.length} produtos para o termo "${query}" na busca ampla`);
      return result;
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
      throw error;
    }
  }
  
  async getProductByClientReference(clientRef: string): Promise<Product | undefined> {
    try {
      console.log(`Buscando produto pela referência do cliente: ${clientRef}`);
      
      // Função para selecionar todas as colunas de produtos
      const selectAllProductColumns = () => ({
        id: products.id,
        name: products.name,
        code: products.code,
        description: products.description,
        barcode: products.barcode,
        category: products.category,
        brand: products.brand,
        price: products.price,
        stockQuantity: products.stockQuantity,
        active: products.active,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        conversion: products.conversion,
        conversionBrand: products.conversionBrand,
        equivalentBrands: products.equivalentBrands
      });
      
      // Primeira etapa: buscar produtos com correspondência exata no código, nome ou conversion
      const exactMatches = await db.select(selectAllProductColumns())
        .from(products)
        .where(
          or(
            eq(products.code, clientRef),      // Correspondência exata com código
            eq(products.name, clientRef),      // Correspondência exata com nome
            eq(products.conversion, clientRef) // Correspondência exata com conversão
          )
        );
        
      // Nova etapa: buscar produtos com prefixo correspondente
      const prefixMatches = await db.select(selectAllProductColumns())
        .from(products)
        .where(
          or(
            and(
              // O código ou conversion começa com o termo de busca...
              or(
                like(products.code, `${clientRef}%`),      // Prefixo no código 
                like(products.conversion, `${clientRef}%`)  // Prefixo na conversão
              ),
              // ...e não é exatamente igual (evita duplicatas)
              and(
                not(eq(products.code, clientRef)),
                not(eq(products.conversion, clientRef))
              )
            )
          )
        )
        .limit(10);
        
      console.log(`Encontrados ${prefixMatches.length} produtos com prefixo "${clientRef}"`);
        
      const allMatches = [...exactMatches, ...prefixMatches];
      
      // Segunda etapa: se encontrou exatamente um produto, vamos verificar se existem produtos relacionados
      if (exactMatches.length === 1) {
        // Verificar se há produtos onde o código coincide com o valor de "conversion"
        if (exactMatches[0].conversion) {
          const relatedProducts = await db.select(selectAllProductColumns())
            .from(products)
            .where(eq(products.name, exactMatches[0].conversion))
            .limit(5);
            
          if (relatedProducts.length > 0) {
            allMatches.push(...relatedProducts);
          }
        }
        
        // Verificar se há produtos que têm este produto como valor em "conversion"
        const productsWithConversion = await db.select(selectAllProductColumns())
          .from(products)
          .where(eq(products.conversion, exactMatches[0].name))
          .limit(5);
          
        if (productsWithConversion.length > 0) {
          allMatches.push(...productsWithConversion);
        }
      }
      
      // Remover duplicatas
      const uniqueMatches = Array.from(new Map(allMatches.map(item => [item.id, item])).values());
      
      if (uniqueMatches.length > 0) {
        console.log(`Encontrado(s) ${uniqueMatches.length} produto(s) com correspondência para "${clientRef}"`);
        return uniqueMatches[0]; // Retorna o primeiro encontrado
      }
      
      console.log(`Nenhum produto encontrado pela correspondência exata ou prefixo '${clientRef}', buscando similaridades`);
      
      // Se não encontrou correspondência exata ou por prefixo, tentamos uma busca mais ampla com ILIKE
      const productsWithSimilarRef = await db.select(selectAllProductColumns())
        .from(products)
        .where(
          or(
            ilike(products.conversion, `%${clientRef}%`), // Busca na referência do cliente
            ilike(products.code, `%${clientRef}%`),      // Busca no código
            ilike(products.name, `%${clientRef}%`)       // Busca no nome
          )
        )
        .limit(5);
        
      if (productsWithSimilarRef.length > 0) {
        console.log(`Encontrado(s) ${productsWithSimilarRef.length} produto(s) com referência similar a '${clientRef}'`);
        return productsWithSimilarRef[0]; // Retorna o primeiro encontrado
      }
      
      console.log(`Nenhum produto encontrado pela referência do cliente '${clientRef}'`);
      return undefined;
    } catch (error) {
      console.error(`Erro ao buscar produto pela referência do cliente ${clientRef}:`, error);
      throw error;
    }
  }
  
  async saveProductConversion(productId: number, clientRef: string): Promise<Product | undefined> {
    try {
      console.log(`Salvando conversão para o produto ${productId}: ${clientRef}`);
      
      const [updatedProduct] = await db
        .update(products)
        .set({ 
          conversion: clientRef,
          updatedAt: new Date()
        })
        .where(eq(products.id, productId))
        .returning();
      
      return updatedProduct;
    } catch (error) {
      console.error(`Erro ao salvar conversão para o produto ${productId}:`, error);
      throw error;
    }
  }

  async importProducts(productsList: InsertProduct[]): Promise<number> {
    // Criar um array para inserir no banco de dados
    const productsToInsert = [];
    
    // Processar cada produto, incluindo campos de conversão
    for (const product of productsList) {
      productsToInsert.push({
        code: product.code,
        name: product.name,
        description: product.description,
        barcode: product.barcode,
        category: product.category,
        brand: product.brand,
        price: product.price,
        stockQuantity: product.stockQuantity || 0,
        active: product.active !== false,
        conversion: product.conversion,
        conversionBrand: product.conversionBrand,
        equivalentBrands: Array.isArray(product.equivalentBrands) ? product.equivalentBrands : null
      });
    }
    
    try {
      console.log(`Preparando para inserir ${productsToInsert.length} produtos no banco de dados`);
      const result = await db.insert(products).values(
        productsToInsert.map(product => ({
          ...product,
          equivalentBrands: Array.isArray(product.equivalentBrands) ? [...product.equivalentBrands] : null
        }))
      ).returning();
      console.log(`${result.length} produtos inseridos com sucesso`);
      return result.length;
    } catch (error) {
      console.error("Erro ao importar produtos:", error);
      throw error;
    }
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

  async updateOrder(id: number, orderData: Partial<InsertOrder>): Promise<Order | undefined> {
    console.log(`Atualizando pedido ${id} com os dados:`, orderData);
    
    const [updatedOrder] = await db
      .update(orders)
      .set({ ...orderData, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
      
    console.log(`Pedido ${id} atualizado:`, updatedOrder);
    return updatedOrder || undefined;
  }

  async updateOrderStatus(id: number, status: 'cotacao' | 'confirmado'): Promise<Order | undefined> {
    const [updatedOrder] = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder || undefined;
  }
  
  async deleteOrder(id: number): Promise<boolean> {
    try {
      console.log(`Excluindo pedido ${id}`);
      
      // Excluir os itens do pedido primeiro
      await db.delete(orderItems).where(eq(orderItems.orderId, id));
      console.log(`Itens do pedido ${id} excluídos com sucesso`);
      
      // Depois excluir o pedido principal
      const result = await db.delete(orders).where(eq(orders.id, id));
      console.log(`Pedido ${id} excluído com sucesso`);
      
      return result.rowCount !== null && result.rowCount > 0; // Corrigido para verificar se rowCount não é nulo
    } catch (error) {
      console.error(`Erro ao excluir pedido ${id}:`, error);
      throw error;
    }
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
    try {
      console.log("Tentando criar item de pedido com SQL direto:", orderItem);
      
      // Validação de parâmetros para evitar erros
      if (!orderItem.orderId || !Number.isInteger(Number(orderItem.orderId)) || Number(orderItem.orderId) <= 0) {
        console.error(`ID de pedido inválido: ${orderItem.orderId}`);
        throw new Error("ID de pedido inválido");
      }
      
      if (!orderItem.productId || !Number.isInteger(Number(orderItem.productId)) || Number(orderItem.productId) <= 0) {
        console.error(`ID de produto inválido: ${orderItem.productId}`);
        throw new Error("ID de produto inválido");
      }
      
      if (!orderItem.quantity || Number(orderItem.quantity) <= 0) {
        console.error(`Quantidade inválida: ${orderItem.quantity}`);
        throw new Error("Quantidade deve ser maior que zero");
      }
      
      const insertQuery = `
        INSERT INTO order_items (
          order_id, product_id, quantity, unit_price, 
          discount_id, discount_percentage, commission, subtotal
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, order_id, product_id, quantity, unit_price, 
                 discount_id, discount_percentage, commission, subtotal
      `;
      
      // Preparar valores garantindo que estejam no formato correto
      const values = [
        Number(orderItem.orderId),
        Number(orderItem.productId),
        Number(orderItem.quantity),
        orderItem.unitPrice.toString(),
        orderItem.discountId ? Number(orderItem.discountId) : null,
        orderItem.discountPercentage ? orderItem.discountPercentage.toString() : null,
        orderItem.commission ? orderItem.commission.toString() : null,
        orderItem.subtotal.toString()
      ];
      
      console.log("Executando inserção com os valores:", values);
      const result = await pool.query(insertQuery, values);
      
      if (result.rows.length === 0) {
        throw new Error("Falha ao inserir item de pedido - nenhum dado retornado");
      }
      
      // Converter as colunas snake_case para camelCase
      const row = result.rows[0];
      const newItem: OrderItem = {
        id: row.id,
        orderId: row.order_id,
        productId: row.product_id,
        quantity: row.quantity,
        unitPrice: row.unit_price,
        discountId: row.discount_id,
        discountPercentage: row.discount_percentage,
        commission: row.commission,
        subtotal: row.subtotal,
        // Campo opcional que pode não existir na tabela foi removido
      };
      
      console.log("Item de pedido criado com sucesso:", newItem);
      return newItem;
    } catch (error) {
      console.error("Erro ao criar item de pedido:", error);
      console.error("Dados que causaram o erro:", JSON.stringify(orderItem));
      if (error instanceof Error) {
        console.error("Stack trace:", error.stack);
      } else {
        console.error("Stack trace: Unknown error type");
      }
      throw error;
    }
  }

  async updateOrderItems(orderId: number, items: InsertOrderItem[]): Promise<OrderItem[]> {
    try {
      console.log(`Atualizando itens do pedido ${orderId} usando SQL direto`);
      
      // Validação adicional para garantir que o orderId e items são válidos
      if (!orderId || !Number.isInteger(orderId) || orderId <= 0) {
        console.error(`ID de pedido inválido: ${orderId}`);
        throw new Error("ID de pedido inválido");
      }
      
      if (!items || !Array.isArray(items) || items.length === 0) {
        console.log(`Nenhum item para atualizar no pedido ${orderId}, apenas removendo os existentes`);
        // Se não há itens, apenas excluir os existentes e retornar um array vazio
        const deleteQuery = `DELETE FROM order_items WHERE order_id = $1`;
        await pool.query(deleteQuery, [orderId]);
        return [];
      }
      
      // Primeiro apaga todos os itens existentes do pedido com SQL direto
      const deleteQuery = `DELETE FROM order_items WHERE order_id = $1`;
      await pool.query(deleteQuery, [orderId]);
      console.log(`Itens existentes do pedido ${orderId} excluídos com sucesso`);
      
      // Depois cria novos itens usando SQL direto, sem a coluna clientRef
      const newItems: OrderItem[] = [];
      
      // Log detalhado de todos os itens antes do processamento
      console.log(`Processando ${items.length} itens para o pedido ${orderId}:`);
      items.forEach((item, index) => {
        console.log(`Item ${index + 1}:`, {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountId: item.discountId,
          discountPercentage: item.discountPercentage,
          commission: item.commission,
          subtotal: item.subtotal
        });
      });
      
      for (const item of items) {
        try {
          // Validação adicional para cada item
          if (!item.productId || !Number.isInteger(Number(item.productId)) || Number(item.productId) <= 0) {
            console.error(`ID de produto inválido: ${item.productId}`);
            continue; // Pular este item e continuar com o próximo
          }
          
          if (!item.quantity || Number(item.quantity) <= 0) {
            console.error(`Quantidade inválida: ${item.quantity}`);
            continue; // Pular este item e continuar com o próximo
          }
          
          const insertQuery = `
            INSERT INTO order_items (
              order_id, product_id, quantity, unit_price, 
              discount_id, discount_percentage, commission, subtotal
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, order_id, product_id, quantity, unit_price, 
                     discount_id, discount_percentage, commission, subtotal
          `;
          
          // Garantir que todos os campos estejam no formato correto
          const values = [
            orderId,
            Number(item.productId),
            Number(item.quantity),
            item.unitPrice.toString(),
            item.discountId ? Number(item.discountId) : null,
            item.discountPercentage ? item.discountPercentage.toString() : null,
            item.commission ? item.commission.toString() : null,
            item.subtotal.toString()
          ];
          
          console.log(`Inserindo item para o pedido ${orderId} com os valores:`, values);
          const result = await pool.query(insertQuery, values);
          
          if (result.rows.length > 0) {
            // Converter as colunas snake_case para camelCase
            const row = result.rows[0];
            const newItem: OrderItem = {
              id: row.id,
              orderId: row.order_id,
              productId: row.product_id,
              quantity: row.quantity,
              unitPrice: row.unit_price,
              discountId: row.discount_id,
              discountPercentage: row.discount_percentage,
              commission: row.commission,
              subtotal: row.subtotal,
              // Removed clientRef as it is not part of the expected type
            };
            newItems.push(newItem);
            console.log(`Item ${newItem.id} adicionado com sucesso ao pedido ${orderId}`);
          }
        } catch (itemError) {
          console.error(`Erro ao criar item para o pedido ${orderId}:`, itemError);
          console.error(`Dados do item:`, JSON.stringify(item));
          if (itemError instanceof Error) {
            console.error(`Stack trace:`, itemError.stack);
          } else {
            console.error(`Stack trace: Unknown error type`);
          }
          // Continuar com o próximo item
        }
      }
      
      console.log(`Total de ${newItems.length} itens adicionados ao pedido ${orderId}`);
      return newItems;
    } catch (error) {
      console.error(`Erro ao atualizar itens do pedido ${orderId}:`, error);
      if (error instanceof Error) {
        console.error(`Stack trace:`, error.stack);
      } else {
        console.error(`Stack trace: Unknown error type`);
      }
      throw error;
    }
  }

  async deleteOrderItems(orderId: number): Promise<boolean> {
    try {
      console.log(`Excluindo todos os itens do pedido ${orderId}`);
      const result = await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
      console.log(`${result.rowCount} itens excluídos do pedido ${orderId}`);
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error(`Erro ao excluir itens do pedido ${orderId}:`, error);
      throw error;
    }
  }

  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    try {
      console.log(`Buscando itens do pedido ${orderId}`);
      
      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));
      
      console.log(`Encontrados ${items.length} itens para o pedido ${orderId}`);
      return items;
    } catch (error) {
      console.error(`Erro ao obter itens do pedido ${orderId}:`, error);
      throw error;
    }
  }

  // Stats methods
  async getOrderStats(representativeId: number | null = null): Promise<any> {
    // Get orders filtered by representative if specified
    let allOrders: Order[];
    
    if (representativeId) {
      allOrders = await this.listOrdersByRepresentative(representativeId);
    } else {
      allOrders = await this.listOrders();
    }
    
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

  async getClientStats(representativeId: number | null = null): Promise<any> {
    // Get clients filtered by representative if specified
    let allClients: Client[];
    
    if (representativeId) {
      allClients = await this.listClientsByRepresentative(representativeId);
    } else {
      allClients = await this.listClients();
    }
    
    const activeClients = allClients.filter(client => client.active);
    
    return {
      total: allClients.length,
      active: activeClients.length
    };
  }

  async getSalesByRepresentative(representativeId: number | null = null): Promise<any> {
    // Get sales by representatives
    let representatives: User[];
    
    if (representativeId) {
      // Se tiver um representante específico, busca apenas esse
      const rep = await this.getUser(representativeId);
      representatives = rep ? [rep] : [];
    } else {
      // Caso contrário, busca todos
      representatives = await this.listRepresentatives();
    }
    
    // Buscar ordens
    const allOrders = await this.listOrders();
    
    return await Promise.all(representatives.map(async (rep) => {
      const repOrders = allOrders.filter(order => order.representativeId === rep.id);
      const confirmedOrders = repOrders.filter(order => order.status === 'confirmado');
      
      // Calcular o total de peças e comissão
      let totalPieces = 0;
      let totalCommission = 0;
      
      for (const order of confirmedOrders) {
        // Obter itens do pedido para calcular peças e comissão
        const items = await this.getOrderItems(order.id);
        totalPieces += items.reduce((sum, item) => sum + item.quantity, 0);
        totalCommission += items.reduce((sum, item) => {
          const commission = item.commission ? Number(item.commission) : 0;
          return sum + commission;
        }, 0);
      }
      
      return {
        id: rep.id,
        name: rep.name,
        totalOrders: repOrders.length,
        confirmedOrders: confirmedOrders.length,
        totalValue: confirmedOrders.reduce((sum, order) => sum + Number(order.total), 0),
        totalPieces: totalPieces,
        totalCommission: totalCommission
      };
    }));
  }
  
  // Método para obter estatísticas de vendas por marca
  async getSalesByBrand(representativeId: number | null = null): Promise<any> {
    // Obter os pedidos confirmados, filtrados por representante se necessário
    let confirmedOrders: Order[];
    
    if (representativeId) {
      // Buscar apenas pedidos do representante especificado
      const repOrders = await this.listOrdersByRepresentative(representativeId);
      confirmedOrders = repOrders.filter(order => order.status === 'confirmado');
    } else {
      // Buscar todos os pedidos confirmados
      const allOrders = await this.listOrders();
      confirmedOrders = allOrders.filter(order => order.status === 'confirmado');
    }
    
    // Mapa para agregar dados por marca
    const brandMap: Record<string, {
      totalPieces: number;
      totalValue: number;
      totalCommission: number;
      orders: number;
    }> = {};
    
    // Processar cada pedido
    for (const order of confirmedOrders) {
      // Obter itens do pedido
      const items = await this.getOrderItems(order.id);
      
      // Processar cada item
      for (const item of items) {
        // Obter o produto para identificar a marca
        const product = await this.getProduct(item.productId);
        if (product) {
          const brand = product.brand || 'Sem Marca';
          
          // Inicializar a marca se ainda não existir no mapa
          if (!brandMap[brand]) {
            brandMap[brand] = {
              totalPieces: 0,
              totalValue: 0,
              totalCommission: 0,
              orders: 0
            };
          }
          
          // Acumular estatísticas
          const subtotal = Number(item.subtotal) || 0;
          const commission = Number(item.commission) || 0;
          
          brandMap[brand].totalPieces += item.quantity;
          brandMap[brand].totalValue += subtotal;
          brandMap[brand].totalCommission += commission;
          brandMap[brand].orders += 1;
        }
      }
    }
    
    // Converter o mapa em um array de resultados
    return Object.entries(brandMap).map(([brand, stats]) => ({
      brand,
      ...stats
    })).sort((a, b) => b.totalPieces - a.totalPieces);
  }
  
  // Método para obter estatísticas de produtos mais vendidos
  async getTopSellingProducts(limit: number = 20, representativeId: number | null = null): Promise<any> {
    // Obter os pedidos confirmados, filtrados por representante se necessário
    let confirmedOrders: Order[];
    
    if (representativeId) {
      // Buscar apenas pedidos do representante especificado
      const repOrders = await this.listOrdersByRepresentative(representativeId);
      confirmedOrders = repOrders.filter(order => order.status === 'confirmado');
    } else {
      // Buscar todos os pedidos confirmados
      const allOrders = await this.listOrders();
      confirmedOrders = allOrders.filter(order => order.status === 'confirmado');
    }
    
    // Mapa para agregar dados por produto
    const productMap: Record<number, {
      id: number;
      code: string;
      name: string;
      brand: string | null;
      totalPieces: number;
      totalValue: number;
      totalCommission: number;
    }> = {};
    
    // Processar cada pedido
    for (const order of confirmedOrders) {
      // Obter itens do pedido
      const items = await this.getOrderItems(order.id);
      
      // Processar cada item
      for (const item of items) {
        // Obter o produto
        const product = await this.getProduct(item.productId);
        if (product) {
          // Inicializar o produto se ainda não existir no mapa
          if (!productMap[product.id]) {
            productMap[product.id] = {
              id: product.id,
              code: product.code,
              name: product.name,
              brand: product.brand,
              totalPieces: 0,
              totalValue: 0,
              totalCommission: 0
            };
          }
          
          // Acumular estatísticas
          const subtotal = Number(item.subtotal) || 0;
          const commission = Number(item.commission) || 0;
          
          productMap[product.id].totalPieces += item.quantity;
          productMap[product.id].totalValue += subtotal;
          productMap[product.id].totalCommission += commission;
        }
      }
    }
    
    // Converter o mapa em um array de resultados e ordenar por quantidade
    return Object.values(productMap)
      .sort((a, b) => b.totalPieces - a.totalPieces)
      .slice(0, limit);
  }
  // Métodos para gerenciar usuários pendentes
  async getPendingUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(and(
        eq(users.role, "representative"),
        eq(users.approved, false)
      ));
  }
  
  async deleteUser(id: number): Promise<boolean> {
    const result = await db
      .delete(users)
      .where(eq(users.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }
}

export const storage = new DatabaseStorage();
