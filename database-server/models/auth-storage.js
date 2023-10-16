import mongoose from "mongoose";

const authSchema = new mongoose.Schema({
    type: {type:String, requred: true, unique: true},
    token: {type:String, required:true}
});

export const Auth = mongoose.model("auth", authSchema); 