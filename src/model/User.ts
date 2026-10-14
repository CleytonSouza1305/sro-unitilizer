import { prisma } from "../database";
import { UserRole } from "../generated/prisma/enums.js";

export interface UserInterface {
  username: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface UserFilter {
  page: number, 
  limit: number, 
  select?: {}, 
  sortBy?: string,
  order: "asc" | "desc", 
  where: {
    username?: { contains?: string, mode: "insensitive" | "default" },
    role?: { equals?: UserRole, mode: "insensitive" | "default" }
  }
}


export default class User {
  static getByEmail = async (email: string) => {
    return await prisma.user.findUnique({
      where: { email },
      select: { email: true, id: true, role: true, password: true },
    });
  };

  static createUser = async (data: UserInterface) => {
    return data;
  };

  static findById = async (id: string) => {
    return await prisma.user.findUnique({
      where: { id },
      include: {
        created_by_user: true,
        created_users: true,
      },
    });
  };

  static allUsers = async (filter: UserFilter) => {
    const users = await prisma.user.findMany({
      skip: filter.page,
      take: filter.limit,
      select: {
        email: true,
        role: true,
        username: true,
        created_at: true,
        id: true
      },
      orderBy: { [filter.sortBy]: filter.order },
      where: filter.where
    })
    return users
  }
}
