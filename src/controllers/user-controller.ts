import { Handler } from "express"
import { UserRequestLoginSchema, UserRequestSchema } from "../schemas/UserRequest.js"
import User, { UserFilter } from "../model/User"
import { HttpError } from "../error/HttpError.js"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { UserRole } from "@prisma/client"

const registerController: Handler = async (req, res, next) => {
  try {
    if (!req.body) {
      throw new HttpError('MISSING_JSON', 500, 'O formato JSON não esta corretamente informado.')
    }

    const body = UserRequestSchema.parse(req.body)

    const existUser = await User.getByEmail(body.email)
    if (existUser) {
      throw new HttpError(
        'DUPLICATED_EMAIL', 
        409, 
        'Este endereço de e-mail já está cadastrado. Por favor, faça login ou utilize um e-mail diferente.'
      )
    }

    const hashedPass = bcrypt.hashSync(body.password, 12)

    const data = {
      ...body
    }
    
    data.password = hashedPass
    const newUser = await User.createUser(data)
    res.status(201).json(newUser)
  } catch (e) {
    next(e)
  }
}

const loginController: Handler = async (req, res, next) => {
  try {
    const body = UserRequestLoginSchema.parse(req.body)

    const existUser = await User.getByEmail(body.email)
    if (!existUser) {
      throw new HttpError('UNAUTHORIZED', 401, 'Credenciais inválidas.')
    }

    const isValidPass = bcrypt.compareSync(body.password, existUser.password)
    if (!isValidPass) {
      throw new HttpError('UNAUTHORIZED', 401, 'Credenciais inválidas.')
    }

    const payload = { id: existUser.id, email: existUser.email, role: existUser.role }

    const key = process.env.JWT_SECRET;
    if (!key) {
      throw new HttpError("INTERNAL_SERVER_ERROR", 500, "Secret key not found in environment variables.");
    }

    const token = jwt.sign(payload, key, { expiresIn: '7d' })

    res.json({ token })
  } catch (e) {
    next(e)
  }
}

const me: Handler = async (req, res, next) => {
  try {
    res.json(req.user)
  } catch (e) {
    next(e)
  }
}

const usersReq: Handler = async (req, res, next) => {
  try {

    const {
      page = 1,
      limit = 10,
      sortBy = "created_at",
      username,
      role,
      order = "asc",
    } = req.query

     const pageSize = Number(page) - 1;
    const limitSize = Number(limit)

    const filter: UserFilter = {
      page: pageSize,
      limit: limitSize,
      where: {},
      order: order === "desc" ? "desc" : "asc",
      sortBy: String(sortBy)
    }

    if (username) {
      filter.where.username = {
        contains: String(username),
        mode: "insensitive"
      }
    }
    


    if (role) {
      String(role).toLowerCase()
      if (role !== "user" && role !== "delivery" && role !== "admin") {
        throw new HttpError('INVALID_FIELD', 400, 'Invalid role format field');
      }
      filter.where.role = {
        equals: String(role) as UserRole ,
        mode: "insensitive"
      }
    }

    filter.page = pageSize;
    filter.limit = limitSize;
    filter.sortBy = String(sortBy)

    const user = await User.allUsers(filter)
    res.json(user)
  } catch (e) {
    next(e)
  }
}

export { registerController, loginController, me, usersReq }