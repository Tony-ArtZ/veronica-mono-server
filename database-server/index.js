import express from "express";
import "dotenv/config";
import mongoose from "mongoose";
import { todoRouter } from "./routes/todo.js";
import { authStorageRouter } from "./routes/auth-storage.js";
import { memoryRouter } from "./routes/memory.js";

const app = express();

app.get("/ping", (req, res) => {
    res.send("Pong!");
})

app.use(express.json());
app.use("/todo", todoRouter);
app.use("/storetoken", authStorageRouter);
app.use("/memory", memoryRouter)

export { app as databaseServer }
