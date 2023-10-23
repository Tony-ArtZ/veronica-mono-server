import express from "express";
import { Memory } from "../models/memory.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { category, tags } = req.body;
    const memory = await Memory.find({ category, tags: tags[0] });
    res.json(memory);
  } catch (error) {
    res.json({ message: error.message, error });
  }
});

router.put("/", async (req, res) => {
  const { data, category, tags } = req.body;

  try {
    const memory = new Memory({ data, category, tags });
    await memory.save();
    res.json({ message: "successful" });
  } catch (error) {
    res.json({ message: error.message, error });
  }
});

export { router as memoryRouter };
