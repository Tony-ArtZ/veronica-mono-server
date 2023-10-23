import mongoose from "mongoose";

const memorySchema = new mongoose.Schema({
    data: {type: String, required: true},
    category: {type: String, required: true},
    tags: [String],
});

export const Memory = mongoose.model("memory", memorySchema);