import express, { Router } from "express";
import { Auth } from "../models/auth-storage.js";

const router = Router();

router.post("/refreshtoken", async (req, res) => {
  try {
    const { refresh_token } = req.body;
    const token = await Auth.findOneAndUpdate(
      { type: "refresh_token" },
      { type: "refresh_token", token: refresh_token },
      { upsert: true }
    );
    res.json({ message: "successful" });
  } catch (error) {
    res.json({ message: error.message, error });
  }
});

router.get("/refreshtoken", async (req, res) => {
  try {
    const token = await Auth.findOne({ type: "refresh_token" });
    res.json(token);
  } catch (error) {
    res.json({ message: error.message, error });
  }
});

export { router as authStorageRouter };
