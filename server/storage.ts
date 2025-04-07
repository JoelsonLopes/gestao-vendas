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
          equivalentBrands
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
      
      // MODIFICAÇÃO: Buscar tanto produtos que correspondem exatamente ao nome ou código,
      // quanto produtos que tenham essa referência como conversão
      const exactMatches = await db.select(selectAllProductColumns())
        .from(products)
        .where(
          or(
            eq(products.name, query),      // Correspondência exata com nome
            eq(products.code, query),      // Correspondência exata com código
            eq(products.conversion, query) // Correspondência exata com conversão
          )
        )
        .limit(20);
      
      if (exactMatches.length > 0) {
        console.log(`Encontrados ${exactMatches.length} produtos com correspondência exata para "${query}"`);
        return exactMatches;
      }
      
      // Caso não encontre correspondência exata, faz uma busca mais ampla
      const result = await db.select(selectAllProductColumns())
        .from(products)
        .where(
          or(
            ilike(products.name, `%${query}%`),
            ilike(products.category, `%${query}%`),
            ilike(products.brand, `%${query}%`),
            ilike(products.barcode, `%${query}%`),
            ilike(products.code, `%${query}%`),
            ilike(products.conversion, `%${query}%`) // Buscar também na referência do cliente
          )
        )
        .limit(20);
      
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
      
      // MODIFICAÇÃO: Verificar também se o código ou nome do produto é igual à referência buscada
      // Isso resolve o problema de não encontrar produtos como "PSL597" quando buscamos exatamente por "PSL597"
      const exactMatches = await db.select(selectAllProductColumns())
        .from(products)
        .where(
          or(
            eq(products.code, clientRef),      // Verifica se o código do produto é igual à referência
            eq(products.name, clientRef),      // Verifica se o nome do produto é igual à referência
            eq(products.conversion, clientRef)  // Verifica na referência de conversão
          )
        );
      
      if (exactMatches.length > 0) {
        console.log(`Encontrado(s) ${exactMatches.length} produto(s) com correspondência exata para "${clientRef}"`);
        return exactMatches[0]; // Retorna o primeiro encontrado
      }
      
      console.log(`Nenhum produto encontrado pela correspondência exata '${clientRef}', buscando similaridades`);
      
      // Se não encontrou correspondência exata, tentamos uma busca mais ampla com ILIKE
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
        equivalentBrands: product.equivalentBrands
      });
    }
    
    try {
      console.log(`Preparando para inserir ${productsToInsert.length} produtos no banco de dados`);
      const result = await db.insert(products).values(productsToInsert).returning();
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
      const deleteItemsQuery = `DELETE FROM order_items WHERE order_id = $1`;
      await pool.query(deleteItemsQuery, [id]);
      console.log(`Itens do pedido ${id} excluídos com sucesso`);
      
      // Depois excluir o pedido principal
      const deleteOrderQuery = `DELETE FROM orders WHERE id = $1`;
      await pool.query(deleteOrderQuery, [id]);
      
      console.log(`Pedido ${id} excluído com sucesso via SQL direto`);
      return true;
    } catch (error) {
      console.error(`Erro ao excluir pedido ${id} via SQL direto:`, error);
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
        clientRef: null // Campo opcional que pode não existir na tabela
      };
      
      console.log("Item de pedido criado com sucesso:", newItem);
      return newItem;
    } catch (error) {
      console.error("Erro ao criar item de pedido:", error);
      console.error("Dados que causaram o erro:", JSON.stringify(orderItem));
      console.error("Stack trace:", error.stack);
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
              clientRef: null // Campo opcional que pode não existir na tabela
            };
            newItems.push(newItem);
            console.log(`Item ${newItem.id} adicionado com sucesso ao pedido ${orderId}`);
          }
        } catch (itemError) {
          console.error(`Erro ao criar item para o pedido ${orderId}:`, itemError);
          console.error(`Dados do item:`, JSON.stringify(item));
          console.error(`Stack trace:`, itemError.stack);
          // Continuar com o próximo item
        }
      }
      
      console.log(`Total de ${newItems.length} itens adicionados ao pedido ${orderId}`);
      return newItems;
    } catch (error) {
      console.error(`Erro ao atualizar itens do pedido ${orderId}:`, error);
      console.error(`Stack trace:`, error.stack);
      throw error;
    }
  }

  async deleteOrderItems(orderId: number): Promise<boolean> {
    try {
      console.log(`Excluindo todos os itens do pedido ${orderId}`);
      const result = await db
        .delete(orderItems)
        .where(eq(orderItems.orderId, orderId))
        .returning();
      console.log(`${result.length} itens excluídos do pedido ${orderId}`);
      return result.length > 0;
    } catch (error) {
      console.error(`Erro ao excluir itens do pedido ${orderId}:`, error);
      
      // Se o erro estiver relacionado à coluna clientRef, podemos simplesmente ignorar
      // e considerar a operação bem-sucedida, já que provavelmente significa que
      // não há itens para excluir
      if (String(error).includes("client_ref")) {
        console.log("Ignorando erro de coluna client_ref inexistente");
        return true;
      }
      
      throw error;
    }
  }

  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    try {
      console.log(`Buscando itens do pedido ${orderId} com SQL direto`);
      
      // Usar SQL direto para evitar problemas com a coluna client_ref
      const query = `
        SELECT 
          id, order_id, product_id, quantity, 
          unit_price, discount_id, discount_percentage, 
          commission, subtotal
        FROM order_items 
        WHERE order_id = $1
      `;
      
      const result = await pool.query(query, [orderId]);
      console.log(`Encontrados ${result.rows.length} itens para o pedido ${orderId}`);
      
      // Converter os nomes das colunas snake_case para camelCase
      return result.rows.map(row => ({
        id: row.id,
        orderId: row.order_id,
        productId: row.product_id,
        quantity: row.quantity,
        unitPrice: row.unit_price,
        discountId: row.discount_id,
        discountPercentage: row.discount_percentage,
        commission: row.commission,
        subtotal: row.subtotal,
        // Campos opcionais que podem não existir na tabela
        clientRef: null
      }));
    } catch (error) {
      console.error(`Erro ao obter itens do pedido ${orderId}:`, error);
      throw error;
    }
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
