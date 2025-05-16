import { Router } from "express";
import { storage } from "../repositories";
import { isAuthenticated } from "../middlewares/auth";

const router = Router();

// Get dashboard stats
router.get("/stats/dashboard", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id ?? 0;
    const isAdmin = req.user?.role === 'admin';
    const orderStats = await storage.stats.getOrderStats(isAdmin ? null : userId);
    const productStats = await storage.stats.getProductStats();
    const clientStats = await storage.stats.getClientStats(isAdmin ? null : userId);
    res.json({ orders: orderStats, products: productStats, clients: clientStats });
  } catch (error) {
    res.status(500).json({ message: "Error fetching dashboard stats" });
  }
});

// Get sales by representative
router.get("/stats/sales-by-representative", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id ?? 0;
    const isAdmin = req.user?.role === 'admin';
    const salesByRep = await storage.stats.getSalesByRepresentative(isAdmin ? null : userId);
    res.json(salesByRep);
  } catch (error) {
    res.status(500).json({ message: "Error fetching sales by representative" });
  }
});

// Get sales by brand
router.get("/stats/sales-by-brand", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id ?? 0;
    const isAdmin = req.user?.role === 'admin';
    const salesByBrand = await storage.stats.getSalesByBrand(isAdmin ? null : userId);
    res.json(salesByBrand);
  } catch (error) {
    res.status(500).json({ message: "Error fetching sales by brand" });
  }
});

// Get top selling products
router.get("/stats/top-selling-products", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id ?? 0;
    const isAdmin = req.user?.role === 'admin';
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const topProducts = await storage.stats.getTopSellingProducts(limit, isAdmin ? null : userId);
    res.json(topProducts);
  } catch (error) {
    res.status(500).json({ message: "Error fetching top selling products" });
  }
});

export default router; 