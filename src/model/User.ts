import { prisma } from "../database"
import { UserRole } from "../generated/prisma/enums"

export interface UserInterface {
  username: string
  email: string,
  password: string,
  role?: UserRole
}
export default class User {
  static getByEmail = async (email:string) => {
    return await prisma.user.findUnique({ where: { email } })
  }

  static createUser = async (data: UserInterface) => {
    return data
  }

  static findById = async (id: string) => {
    return await prisma.user.findUnique({ 
      where: 
      { id }, 
      include: { 
        created_by_user: true, 
        created_users: true 
      }
    })
  }
}