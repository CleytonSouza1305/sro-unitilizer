import { ErrorRequestHandler } from "express";
import { HttpError } from "../error/HttpError";

export const errorMiddleware: ErrorRequestHandler = (error, req, res, next) => {
  if (error) {
    if (error instanceof HttpError) {
      return res
        .status(error.status)
        .json({
          status: error.status,
          code: error.code,
          message: error.message,
        });
    } else {
      console.error("[FATAL ERROR]:", error);

      return res.status(500).json({
        status: 500,
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred. Please try again later.",
      });
    }
  } else {
    next();
  }
};
