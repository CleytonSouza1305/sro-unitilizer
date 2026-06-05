import { prisma } from "../database";

interface CloseUnitInput {
  number: string;
  unitilizer: string;
  destination: string;
  date: string;
  objects: { data: string[]; quantity: number };
}

export default class Unitilizer {
  static closeUnit = async (data: CloseUnitInput, userId: string) => {
    const unitilizer = await prisma.unitilizer.create({
      data: {
        date: data.date,
        destination: data.destination,
        number: +data.number,
        unitilizer: data.unitilizer,
        closed_by_userId: userId,
        objects: {
          createMany: {
            data: data.objects.data.map((l) => ({
              label: l,
            })),
          },
        },
      },
    });

    return unitilizer;
  };

  static totalObjects = async () => {
    return await prisma.objects.count();
  };
}
