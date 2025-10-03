import express from "express";
import { signup, login, checkAuth, updateProfile } from "../controllers/userController.js";
import { protectRoute } from "../middleware/auth.js";
import { getUsersForSidebar } from "../controllers/messageController.js"; // ✅ Add this

const userRouter = express.Router();

userRouter.post("/signup", signup);
userRouter.post("/login", login);
userRouter.get("/check", protectRoute, checkAuth);
userRouter.put("/update-profile", protectRoute, updateProfile);

userRouter.get("/users", protectRoute, getUsersForSidebar); // ✅ Add this route



export default userRouter;