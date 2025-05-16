import { products, type Product, type InsertProduct } from "@shared/schema";
import { db } from "../infra/db";
import { eq, or, like, ilike, not, and } from "drizzle-orm";

export interface IProductStorage {
  getProduct(id: number): Promise<Product | undefined>;
  getProductByCode(code: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, productData: Partial<InsertProduct>): Promise<Product | undefined>;
  listProducts(): Promise<Product[]>;
  searchProducts(query: string): Promise<Product[]>;
  getProductByClientReference(clientRef: string): Promise<Product | undefined>;
  saveProductConversion(productId: number, clientRef: string): Promise<Product | undefined>;
  importProducts(products: InsertProduct[]): Promise<number>;
}

export class ProductStorage implements IProductStorage {
  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async getProductByCode(code: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(or(eq(products.code, code), eq(products.name, code)));
    return product || undefined;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const equivalentBrands = Array.isArray(product.equivalentBrands)
      ? product.equivalentBrands as string[]
      : null;
    const [newProduct] = await db.insert(products).values({ ...product, equivalentBrands }).returning();
    return newProduct;
  }

  async updateProduct(id: number, productData: Partial<InsertProduct>): Promise<Product | undefined> {
    const equivalentBrands = Array.isArray(productData.equivalentBrands)
      ? productData.equivalentBrands as string[]
      : undefined;
    const [updatedProduct] = await db.update(products).set({ ...productData, equivalentBrands, updatedAt: new Date() }).where(eq(products.id, id)).returning();
    return updatedProduct || undefined;
  }

  async listProducts(): Promise<Product[]> {
    return await db.select().from(products);
  }

  async searchProducts(query: string): Promise<Product[]> {
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
    // Busca exata
    const exactMatches = await db.select(selectAllProductColumns())
      .from(products)
      .where(
        or(
          eq(products.name, query),
          eq(products.code, query),
          eq(products.conversion, query),
          eq(products.barcode, query)
        )
      )
      .limit(30);
    // Busca ampla
    if (exactMatches.length > 0) return exactMatches;
    return await db.select(selectAllProductColumns())
      .from(products)
      .where(
        or(
          ilike(products.name, `%${query}%`),
          ilike(products.category, `%${query}%`),
          ilike(products.brand, `%${query}%`),
          ilike(products.barcode, `%${query}%`),
          ilike(products.code, `%${query}%`),
          ilike(products.conversion, `%${query}%`),
          ilike(products.description, `%${query}%`)
        )
      )
      .limit(30);
  }

  async getProductByClientReference(clientRef: string): Promise<Product | undefined> {
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
    // Busca exata
    const exactMatches = await db.select(selectAllProductColumns())
      .from(products)
      .where(
        or(
          eq(products.code, clientRef),
          eq(products.name, clientRef),
          eq(products.conversion, clientRef)
        )
      );
    if (exactMatches.length > 0) return exactMatches[0];
    // Busca ampla
    const productsWithSimilarRef = await db.select(selectAllProductColumns())
      .from(products)
      .where(
        or(
          ilike(products.conversion, `%${clientRef}%`),
          ilike(products.code, `%${clientRef}%`),
          ilike(products.name, `%${clientRef}%`)
        )
      )
      .limit(5);
    if (productsWithSimilarRef.length > 0) return productsWithSimilarRef[0];
    return undefined;
  }

  async saveProductConversion(productId: number, clientRef: string): Promise<Product | undefined> {
    const [updatedProduct] = await db.update(products).set({ conversion: clientRef, updatedAt: new Date() }).where(eq(products.id, productId)).returning();
    return updatedProduct;
  }

  async importProducts(productsList: InsertProduct[]): Promise<number> {
    const productsToInsert = productsList.map(product => ({
      ...product,
      stockQuantity: product.stockQuantity || 0,
      active: product.active !== false,
      equivalentBrands: Array.isArray(product.equivalentBrands) ? product.equivalentBrands as string[] : null
    }));
    const result = await db.insert(products).values(productsToInsert).returning();
    return result.length;
  }
} 