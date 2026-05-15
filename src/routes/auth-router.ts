import { Router } from "express";
import { register } from "../controllers/user-controller";

const authRouter = Router()

authRouter.post('/register', register)

export default authRouter