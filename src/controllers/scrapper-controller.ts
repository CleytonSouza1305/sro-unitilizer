import { config } from "dotenv";
import { RequestHandler } from "express";
import { puppeteerService, Unitizer } from "../services/PuppeteerService";
import { HttpError } from "../error/HttpError";
import Unitilizer from "../model/Unitilizer";
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

const closeUnitilizer: RequestHandler = async (req, res, next) => {
  try {
    const { unitilizers } = req.body;

    if (!url) {
      throw new HttpError(
        "MISSING_URL",
        400,
        "A URL de destino é obrigatória.",
      );
    }

    if (
      !unitilizers ||
      !Array.isArray(unitilizers) ||
      unitilizers.length === 0
    ) {
      throw new HttpError(
        "MISSING_DATA",
        400,
        "É necessário fornecer um array de unitizadores.",
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

    const data = await puppeteerService.getUnitilizer(url);

    const results: {
      closeds: Unitizer[];
      error: { unit: string; reason: string }[];
    } = {
      closeds: [],
      error: [],
    };

    for (let i = 0; i < unitilizers.length; i++) {
      const currentUnit = unitilizers[i];

      const isValidUnitilizer = data.find(
        (el) => el.unitilizer === currentUnit,
      );

      if (!isValidUnitilizer) {
        results.error.push({
          unit: currentUnit,
          reason: "Não encontrado na base de destino",
        });
        continue;
      }

      if (isValidUnitilizer.destination.toLowerCase().includes("cajamar")) {
        const date = new Date();
        date.setHours(0, 0, 0, 0);

        const dateString = isValidUnitilizer.date.split("-")[0].trim();
        const [day, month, year] = dateString.split("/");

        const unitilizerDate = new Date(+year, +month - 1, +day);
        if (date <= unitilizerDate) {
          results.error.push({
            unit: currentUnit,
            reason: `Bloqueado: Não é permitido fechar "${isValidUnitilizer.destination}" no mesmo dia da abertura.`,
          });
          continue;
        }

        continue;
      }

      const wasClosed = await puppeteerService.closeUnitilizer(
        url,
        isValidUnitilizer.unitilizer,
      );

      if (wasClosed?.success) {
        results.closeds.push(isValidUnitilizer);
        continue;
      } else {
        results.error.push({
          unit: currentUnit,
          reason: "O serviço do robô não retornou confirmação de sucesso.",
        });
      }
    }

    if (!req.user) {
      throw new HttpError(
        "UNAUTHORIZED",
        401,
        "Usuário não autenticado para realizar esta operação.",
      );
    }

    try {
      for (let i = 0; i < results.closeds.length; i++) {
        const currentData = results.closeds[i];
        await Unitilizer.closeUnit(currentData, req.user.id);
      }
    } catch (error) {
      throw new HttpError(
        "DATABASE_SAVE_FAILED",
        500,
        "Ocorreu um erro ao salvar as unidades fechadas no banco de dados.",
      );
    }

    res.json({ results });
  } catch (e) {
    next(e);
  }
};

const allObjects: RequestHandler = async (req, res, next) => {
  const objects = await Unitilizer.totalObjects()
  res.json(objects)
}

export { getUnitilizer, closeUnitilizer, allObjects };
