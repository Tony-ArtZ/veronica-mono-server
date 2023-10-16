import mongoose from "mongoose";

const todoSchema = new mongoose.Schema({
    task: {type:String, required:true},
    dueDate: {type:Date}
});

export const Todo = mongoose.model("todos", todoSchema); 