import mongoose from "mongoose";
import "dotenv/config";

// Function to connect to the MongoDB database
export const connectDB = async () => {
  try {
   mongoose.connection.on('connected', () => console.log("Database connected successfully"));
   
    await mongoose.connect(`mongodb+srv://chatapp:chatapp123@cluster0.vfrxblc.mongodb.net/chatapp`);
  } catch (error) {
      console.error(error);
    }
  }