import express from "express";
import { Todo } from "../models/todo.js";
import mongoose from "mongoose";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const todo = await Todo.find();
    res.json(todo);
  } catch (error) {
    res.json({ message: error.message, error });
  }
});

router.post("/", async (req, res) => {
  try {
    const { task, dueDate } = req.body;
    const todo = new Todo({ task, dueDate });
    await todo.save();
    res.json({ message: "successful" });
  } catch (error) {
    res.json({ message: error.message, error });
  }
});

router.delete("/", async (req, res) => {
  try {
    const { index } = req.body;
    const todo = await Todo.find();
    await Todo.deleteOne({ _id: todo[index]._id });
    res.json({ message: "successful" });
  } catch (error) {
    res.json({ message: error.message, error });
  }
});

export { router as todoRouter };
