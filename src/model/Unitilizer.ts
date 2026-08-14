import { prisma } from "../database/index.js";

export interface Unitizer {
  posicao: string;
  unitizador: string;
  direcao: string;
  plano?: string;
  data: string;
  itens: {
    id: string;
    idExpedicao: string;
    item: string;
    peso: number;
    expFixedNumber: string;
    matricula: string;
    cepDestino: string;
    postagem: number;
    data: string;
    idEstacao: number;
    idTelaPagina: string;
    posicao: string;
    devolucao: string;
    dataMaximaEntrega: string;
  }[];
}

export default class Unitilizer {
  static closeUnit = async (data: Unitizer, userId: string) => {
    const actualDate = new Date();

    const day = String(actualDate.getDate()).padStart(2, "0");
    const month = String(actualDate.getMonth() + 1).padStart(2, "0");
    const year = actualDate.getFullYear();

    const hours = String(actualDate.getHours()).padStart(2, "0");
    const minutes = String(actualDate.getMinutes()).padStart(2, "0");
    const seconds = String(actualDate.getSeconds()).padStart(2, "0");

    const formattedDate = `${day}/${month}/${year} - ${hours}:${minutes}:${seconds}`;

    const unitilizer = await prisma.unitilizer.create({
      data: {
        open_at: data.data,
        closed_at: formattedDate,
        destination: data.direcao,
        number: +data.posicao,
        unitilizer: data.unitizador,
        closed_by_userId: userId,
      },
      include: {
        closed_by_user: true,
      },
    });

    console.log(data);

    if (data.itens && data.itens.length > 0) {
      const objects = data.itens.map((i) => ({
        label: i.item,
        unitilizer_id: unitilizer.id,
      }));

      const objectsSaved = await prisma.objects.createMany({
        data: objects,
      });
      console.log(`Objetos salvos: ${objectsSaved}`);
    }

    const { closed_by_user, ...unitilizerData } = unitilizer;

    return {
      data: unitilizerData,
      user: {
        name: closed_by_user.username,
      },
    };
  };

  static totalObjectsToday = async () => {
    const now = new Date();

    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayNextMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1,
    );

    const objects = await prisma.objects.count({
      where: {
        created_at: {
          gte: firstDay,
          lte: firstDayNextMonth
        },
      },
    });

    return objects;
  };
}
