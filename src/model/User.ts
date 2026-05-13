import { prisma } from "../database"

export default class User {
  static getByEmail = async (email:string) => {
    return await prisma.user.findUnique({ where: { email } })
  }
}