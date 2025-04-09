import Router from "express";
import { getAllUsers, Login, Register, saveUser } from "../controllers/userController";

const router = Router();

router.post("/users", saveUser);
router.get("/users",getAllUsers);

router.post("/login",Login);
router.post("/register",Register);
export default router;