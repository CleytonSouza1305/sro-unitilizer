import { Handler } from "express"
import { UserRequestLoginSchema, UserRequestSchema } from "../schemas/UserRequest"
import User from "../model/User"
import { HttpError } from "../error/HttpError"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

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


export { registerController, loginController }