import { Router } from "express";
import { loginController, registerController } from "../controllers/user-controller";
import { authorizationByToken, authorizationPermission } from "../middleware/authorization-middleware";

const authRouter = Router()

authRouter.post('/login', loginController);

// 🔒 ROTA PROTEGIDA
authRouter.post(
  '/register', 
  authorizationByToken,      
  authorizationPermission,   
  registerController     
);

export default authRouter