import { ErrorRequestHandler } from "express";
import { HttpError } from "../error/HttpError.js";
import { ZodError } from "zod";

function randomMessageForZod(field: string) {
  const messagesList = [
    {
      field: "username",
      status: 400,
      message: "O nome de usuário informado é inválido.",
    },
    {
      field: "username",
      status: 400,
      message:
        "Não conseguimos validar o seu nome de usuário. Verifique e tente novamente.",
    },
    {
      field: "username",
      status: 400,
      message: "Por favor, insira um nome de usuário válido.",
    },

    {
      field: "email",
      status: 400,
      message: "O formato do e-mail digitado não é válido.",
    },
    {
      field: "email",
      status: 400,
      message: "Por favor, insira um endereço de e-mail válido.",
    },
    {
      field: "email",
      status: 401,
      message: "E-mail inválido ou não reconhecido.",
    },

    {
      field: "password",
      status: 400,
      message: "A senha informada não atende aos requisitos de segurança.",
    },
    {
      field: "password",
      status: 401,
      message: "Senha inválida. Por favor, verifique os dados digitados.",
    },
    {
      field: "password",
      status: 401,
      message: "Não foi possível validar a sua senha.",
    },

    {
      field: "role",
      status: 400,
      message: "O cargo ou permissão selecionada é inválida.",
    },
    {
      field: "role",
      status: 403,
      message: "Perfil de usuário não reconhecido pelo sistema.",
    },
  ];

  const filtered = messagesList.filter((m) => m.field === field);

  const finalMessage =
    filtered.length > 0 ? filtered[Math.floor(Math.random() * filtered.length)]
      : { status: 500, message: "Os dados informados são inválidos." };

  return {
    status: finalMessage.status,
    code: "INTERNAL_SERVER_ERROR",
    message: finalMessage.message,
  };
}

export const errorMiddleware: ErrorRequestHandler = (error, req, res, next) => {
  if (error) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({
        status: error.status,
        code: error.code,
        message: error.message,
      });
    } else if (error instanceof ZodError) {
      const fields = error.issues.map((e) => e.path.join(", "));
      const errorMessage = randomMessageForZod(fields[0]);
      return res
        .status(errorMessage.status)
        .json({ code: errorMessage.code, message: errorMessage.message });
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
