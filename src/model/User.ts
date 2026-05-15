import { prisma } from "../database"
import { UserRole } from "../generated/prisma/enums"

interface UserInterface {
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
    console.log(data)
  }
}