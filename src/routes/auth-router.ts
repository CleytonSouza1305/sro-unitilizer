import { Router } from "express";
import { loginController, me, registerController } from "../controllers/user-controller.js";
import { authorizationByToken, authorizationPermission } from "../middleware/authorization-middleware.js";

const authRouter = Router()

authRouter.post('/login', loginController);

// 🔒 ROTA PROTEGIDA
authRouter.post(
  '/register', 
  authorizationByToken,      
  authorizationPermission,   
  registerController     
);

authRouter.get(
  '/me', 
  authorizationByToken,
  me
)
export default authRouter