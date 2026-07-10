import { config } from "dotenv";
import { RequestHandler } from "express";
import { puppeteerService, Unitizer } from "../services/PuppeteerService.js";
import { HttpError } from "../error/HttpError.js";
import Unitilizer from "../model/Unitilizer.js";
config();

const getUnitilizer: RequestHandler = async (req, res, next) => {
  try {
    const unitilizerData = await puppeteerService.getUnitilizer();

    return res.json(unitilizerData);
  } catch (e) {
    next(e);
  }
};

const closeUnitilizer: RequestHandler = async (req, res, next) => {
  try {
    const { unitilizers } = req.body;

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

    const data = await puppeteerService.getUnitilizer();

    const results: {
      closeds: Unitizer[];
      error: { unitilizer: string; reason: string }[];
    } = {
      closeds: [],
      error: [],
    };

    for (let i = 0; i < unitilizers.length; i++) {
      const currentUnit = unitilizers[i];

      const isValidUnitilizer = data.find(
        (el) => el.unitizador === currentUnit,
      );

      if (!isValidUnitilizer) {
        results.error.push({
          unitilizer: currentUnit,
          reason: "Não encontrado na base de destino",
        });
        continue;
      }

      if (isValidUnitilizer.plano.toLowerCase().includes("cajamar")) {
        const date = new Date();
        date.setHours(0, 0, 0, 0);

        const dateString = isValidUnitilizer.data.split("-")[0].trim();
        const [day, month, year] = dateString.split("/");

        const unitilizerDate = new Date(+year, +month - 1, +day);
        if (date <= unitilizerDate) {
          results.error.push({
            unitilizer: currentUnit,
            reason: `Bloqueado: Não é permitido fechar "${isValidUnitilizer.destination}" no mesmo dia da abertura.`,
          });
          continue;
        }

        continue;
      }
      
      const wasClosed = await puppeteerService.closeUnitilizer(
        isValidUnitilizer.unitizador,
      );

      if (wasClosed?.success) {
        results.closeds.push(isValidUnitilizer);
        continue;
      } else {
        results.error.push({
          unitilizer: currentUnit,
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
        if (!currentData) {
          throw new HttpError(
            "UNITILIZER_NOT_EXISTS",
            404,
            "Ocorreu um erro ao salvar as unidades fechadas, item não encontrado.",
          );
        }

        i++;
      }
    } catch (e) {
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
  try {
    const objects = await Unitilizer.totalObjectsToday();
    res.json(objects);
  } catch (e) {
    next(e);
  }
};

const getAvaliableUnit: RequestHandler = async (req, res, next) => {
  try {
    const data = await puppeteerService.searchUnitilizer();
    res.json(data);
  } catch (e) {
    next(e);
  }
};

const dowloadUnitReq: RequestHandler = async (req, res, next) => {
  try {
    const data = req.body.positions;

    const unitilizers = await puppeteerService.downloadUnit(data);
    res.json(unitilizers);
  } catch (e) {
    next(e);
  }
};

export {
  getUnitilizer,
  closeUnitilizer,
  allObjects,
  getAvaliableUnit,
  dowloadUnitReq,
};
