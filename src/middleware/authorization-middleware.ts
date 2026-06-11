import { Handler } from "express";
import { HttpError } from "../error/HttpError.js";
import User from "../model/User.js";
import jwt, { JwtPayload } from "jsonwebtoken";
import { UserRole } from "../generated/prisma/enums.js";

interface UserCompletInterface {
  id: string
  username: string;
  email: string;
  password: string;
  role?: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserCompletInterface | JwtPayload
      isAuthorized?: boolean;
    }
  }
}

export const authorizationPermission: Handler = (req, res, next) => {
  try {
    if (!req.user) {
      throw new HttpError(
        "UNAUTHENTICATED",
        401,
        "You must be logged in to perform this action.",
      );
    }

    if (req.user.role === "USER") {
      throw new HttpError(
        "INSUFFICIENT_PERMISSIONS",
        403,
        "Access denied. This operation requires administrative privileges.",
      );
    }

    next()
  } catch (e) {
    next(e);
  }
};

export const authorizationByToken: Handler = async (req, res, next) => {
  try {
    const authorizationHeader = req.headers.authorization;
    if (!authorizationHeader) {
      throw new HttpError("MISSING_AUTHORIZATION", 401, "Authorization header missing.");
    }


    const token = authorizationHeader.split(" ")[1];
    if (!token) {
      throw new HttpError("MISSING_TOKEN", 401, "No token informed.");
    }

    const key = process.env.JWT_SECRET;
    if (!key) {
      throw new HttpError("INTERNAL_SERVER_ERROR", 500, "Secret key not found in environment variables.");
    }

    const decoded = jwt.verify(token, key);

    if (typeof decoded !== "object" || !("id" in decoded)) {
      throw new HttpError("INVALID_TOKEN", 401, "Invalid token.");
    }

    const encryptedUser = decoded as JwtPayload & { id: string };

    const user = await User.findById(encryptedUser.id);
    if (!user) {
      throw new HttpError("USER_NOT_FOUND", 404, "User not found on database.");
    }

    req.isAuthorized = true; 
    req.user = user;

    next();
  } catch (e) {
    next(e);
  }
};

