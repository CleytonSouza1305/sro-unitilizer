import { prisma } from "../database/index.js";

interface CloseUnitInput {
  number: string;
  unitilizer: string;
  destination: string;
  date: string;
  objects: { data: string[]; quantity: number };
}

export default class Unitilizer {
  static closeUnit = async (data: CloseUnitInput, userId: string) => {
    const actualDate = new Date();

    const day = String(actualDate.getDate()).padStart(2, "0");
    const month = String(actualDate.getMonth() + 1).padStart(2, "0");
    const year = actualDate.getFullYear();

    const hours = String(actualDate.getHours()).padStart(2, "0");
    const minutes = String(actualDate.getMinutes()).padStart(2, "0");
    const seconds = String(actualDate.getSeconds()).padStart(2, "0");

    const formattedDate = `${day}/${month}/${year} - ${hours}:${minutes}:${seconds}`;

    const unitilizer = await prisma.$transaction(async (tx) => {
      const newUnitilizer = await tx.unitilizer.create({
        data: {
          open_at: data.date,
          closed_at: formattedDate,
          destination: data.destination,
          number: +data.number,
          unitilizer: data.unitilizer,
          closed_by_userId: userId,
        },
      });

      if (data.objects?.data?.length > 0) {
        await tx.objects.createMany({
          data: data.objects.data.map((l) => ({
            label: l,
            unitilizer_id: newUnitilizer.id
          })),
        });
      }

      return newUnitilizer;
    });

    return unitilizer;
  };

  static totalObjectsToday = async () => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    return await prisma.objects.count({
      where: {
        created_at: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    });
  };
}
