import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated, isAdmin } from "../middlewares/auth.middleware";
import { insertProductSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

// Get all products
router.get("/products", isAuthenticated, async (req, res) => {
  try {
    const products = await storage.product.listProducts();
    res.json(products || []);
  } catch (error) {
    res.status(500).json({ message: "Error fetching products", details: error instanceof Error ? error.message : String(error) });
  }
});

// Buscar produto por ID
router.get("/products/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID de produto inválido" });
    }
    const product = await storage.product.getProduct(id);
    if (!product) {
      return res.status(404).json({ message: "Produto não encontrado" });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar produto" });
  }
});

// Buscar produto pelo código
router.get("/products/by-code/:code", isAuthenticated, async (req, res) => {
  try {
    const { code } = req.params;
    if (!code) {
      return res.status(400).json({ message: "Código do produto é obrigatório" });
    }
    const product = await storage.product.getProductByCode(code);
    if (!product) {
      return res.status(404).json({ message: "Produto não encontrado com este código" });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar produto pelo código" });
  }
});

// Search products - query param
router.get("/products/search", isAuthenticated, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ message: "Search query is required" });
    }
    const products = await storage.product.searchProducts(q);
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Error searching products" });
  }
});

// Search products by term in URL path
router.get("/products/search/:term", isAuthenticated, async (req, res) => {
  try {
    const { term } = req.params;
    if (!term) {
      return res.status(400).json({ message: "Search term is required" });
    }
    const products = await storage.product.searchProducts(term);
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Error searching products" });
  }
});

// Buscar produto por referência do cliente
router.get("/products/by-client-reference/:reference", isAuthenticated, async (req, res) => {
  try {
    const { reference } = req.params;
    if (!reference) {
      return res.status(400).json({ message: "Referência do cliente é obrigatória" });
    }
    const product = await storage.product.getProductByClientReference(reference);
    if (!product) {
      return res.status(404).json({ message: "Produto não encontrado para esta referência do cliente" });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar produto por referência do cliente" });
  }
});

// Salvar conversão de produto (admin only)
router.post("/products/:id/save-conversion", isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { clientRef } = req.body;
    if (!clientRef) {
      return res.status(400).json({ message: "Referência do cliente é obrigatória" });
    }
    const product = await storage.product.getProduct(id);
    if (!product) {
      return res.status(404).json({ message: "Produto não encontrado" });
    }
    const existingProduct = await storage.product.getProductByClientReference(clientRef);
    if (existingProduct && existingProduct.id !== id) {
      return res.status(400).json({ message: "Esta referência já está associada a outro produto", existingProduct });
    }
    const updatedProduct = await storage.product.saveProductConversion(id, clientRef);
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: "Erro ao salvar conversão de produto" });
  }
});

// Create product (admin only)
router.post("/products", isAdmin, async (req, res) => {
  try {
    const validatedData = insertProductSchema.parse(req.body);
    const product = await storage.product.createProduct(validatedData);
    res.status(201).json(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation failed", errors: error.errors });
    }
    res.status(500).json({ message: "Error creating product" });
  }
});

// Update product (admin only)
router.put("/products/:id", isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const product = await storage.product.getProduct(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    const validatedData = insertProductSchema.partial().parse(req.body);
    const updatedProduct = await storage.product.updateProduct(id, validatedData);
    res.json(updatedProduct);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation failed", errors: error.errors });
    }
    res.status(500).json({ message: "Error updating product" });
  }
});

// Import products (admin only)
router.post("/products/import", isAdmin, async (req, res) => {
  try {
    const products = req.body;
    if (!Array.isArray(products)) {
      return res.status(400).json({ message: "Expected array of products" });
    }
    const validatedProducts = [];
    const errors = [];
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      try {
        if (product.code) {
          const existingProduct = await storage.product.getProductByCode(product.code);
          if (existingProduct) {
            throw new Error(`Produto com código '${product.code}' já existe no sistema`);
          }
        }
        const processedProduct = {
          ...product,
          code: product.code || '',
          name: product.name || `Produto ${i+1}`,
          price: typeof product.price === 'number' ? product.price.toString() : (typeof product.price === 'string' ? product.price : '0'),
          stockQuantity: typeof product.stockQuantity === 'number' ? product.stockQuantity : (typeof product.stockQuantity === 'string' ? parseInt(product.stockQuantity) || 0 : 0),
          conversion: product.conversion || null,
          conversionBrand: product.conversionBrand || null
        };
        const validatedProduct = insertProductSchema.parse(processedProduct);
        validatedProducts.push(validatedProduct);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro de validação';
        errors.push({ row: i + 1, data: product, error: errorMessage });
        continue;
      }
    }
    if (validatedProducts.length === 0) {
      return res.status(400).json({ message: "Nenhum produto válido encontrado", errors, totalErrors: errors.length, totalSubmitted: products.length });
    }
    const count = await storage.product.importProducts(validatedProducts);
    res.status(201).json({ message: `${count} produtos importados com sucesso`, success: count, failed: errors.length, totalSubmitted: products.length, errors: errors.length > 0 ? errors : undefined });
  } catch (error) {
    res.status(500).json({ message: "Erro ao importar produtos", error: error instanceof Error ? error.message : 'Erro desconhecido' });
  }
});

export default router; 