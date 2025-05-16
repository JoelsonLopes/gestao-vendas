import { Router } from "express";
import { storage } from "../repositories";
import { isAuthenticated, isAdmin } from "../middlewares/auth";
import { insertRegionSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

// Get all regions
router.get("/regions", isAuthenticated, async (req, res) => {
  try {
    const regions = await storage.region.listRegions();
    res.json(regions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching regions" });
  }
});

// Create region (admin only)
router.post("/regions", isAdmin, async (req, res) => {
  try {
    const validatedData = insertRegionSchema.parse(req.body);
    const region = await storage.region.createRegion(validatedData);
    res.status(201).json(region);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Validation failed", 
        errors: error.errors 
      });
    }
    res.status(500).json({ message: "Error creating region" });
  }
});

// Update region (admin only)
router.put("/regions/:id", isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = insertRegionSchema.partial().parse(req.body);
    const region = await storage.region.updateRegion(id, validatedData);
    if (!region) {
      return res.status(404).json({ message: "Region not found" });
    }
    res.json(region);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Validation failed", 
        errors: error.errors 
      });
    }
    res.status(500).json({ message: "Error updating region" });
  }
});

// Delete region (admin only)
router.delete("/regions/:id", isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const success = await storage.region.deleteRegion(id);
    if (!success) {
      return res.status(404).json({ message: "Region not found" });
    }
    res.json({ message: "Region deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting region" });
  }
});

export default router; 