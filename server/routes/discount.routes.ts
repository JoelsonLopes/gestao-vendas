import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../middlewares/auth.middleware";

const router = Router();

// Get all discounts
router.get("/discounts", isAuthenticated, async (req, res) => {
  try {
    const discounts = await storage.discount.listDiscounts();
    res.json(discounts);
  } catch (error) {
    res.status(500).json({ message: "Error fetching discounts" });
  }
});

export default router; 