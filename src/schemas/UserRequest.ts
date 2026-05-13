import z from "zod";

export const UserRequestSchema = z.object({
  username: z.string().min(2).max(100),
  email: z.email().min(2).max(100),
  password: z.string().min(2).max(100), 
  role: z.enum(['OWNER', 'ADMIN', 'MANAGER', 'USER']).optional()
})