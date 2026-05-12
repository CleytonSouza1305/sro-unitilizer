import { config } from "dotenv";
import { RequestHandler } from "express";
import { puppeteerService } from "../services/PuppeteerService";
import { HttpError } from "../error/HttpError";
config();

const url = process.env.SCRAPE_URL;

const getUnitilizer: RequestHandler = async (req, res, next) => {
  try {
    if (!url) {
      throw new HttpError(
        "MISSING_URL",
        400,
        "A URL de destino é obrigatória.",
      );
    }

    const user = process.env.PUPPETEER_USER;
    const pass = process.env.PUPPETEER_PASS;

    if (!user || !pass) {
      throw new HttpError(
        "INTERNAL_CONFIG_ERROR",
        500,
        "Credenciais do serviço não configuradas no ambiente.",
      );
    }

    const isConnected = await puppeteerService.connectAndLogin(url, user, pass);

    if (!isConnected) {
      throw new HttpError(
        "PUPPETEER_AUTH_FAILED",
        401,
        "Não foi possível autenticar no serviço de expedição.",
      );
    }

    const unitilizerData = await puppeteerService.getUnitilizer(url);

    return res.json(unitilizerData);
  } catch (e) {
    next(e);
  }
};

export { getUnitilizer };
