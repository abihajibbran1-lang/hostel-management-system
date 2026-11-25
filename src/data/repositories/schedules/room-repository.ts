import { Prisma } from "@prisma/client";
import { prisma } from "../../database/prisma.ts";

type RoomTransaction = Pick<Prisma.TransactionClient, "house" | "houseWarden" | "room" | "roomResident">;
const membershipContext = {
  room: { select: { id: true, roomNumber: true, houseId: true, capacity: true } },
} satisfies Prisma.RoomResidentInclude;

export class RoomRepository {
  private readonly client: RoomTransaction;

  constructor(client: RoomTransaction = prisma) {
    this.client = client;
  }

  createHouse(name: string) {
    return this.client.house.create({ data: { name } });
  }

  async assignWarden(houseId: string, userId: string, primary: boolean) {
    await this.client.houseWarden.upsert({
      where: { houseId_userId: { houseId, userId } },
      create: { houseId, userId },
      update: {},
    });
    if (primary) {
      await this.client.house.update({ where: { id: houseId }, data: { primaryWardenId: userId } });
    }
  }

  async removeWarden(houseId: string, userId: string) {
    await this.client.house.updateMany({
      where: { id: houseId, primaryWardenId: userId }, data: { primaryWardenId: null },
    });
    await this.client.houseWarden.deleteMany({ where: { houseId, userId } });
  }

  createRoom(data: { houseId: string; roomNumber: string; capacity: number; block?: string; floor?: string }) {
    return this.client.room.create({ data });
  }

  findRoom(id: string) {
    return this.client.room.findUnique({ where: { id } });
  }

  listHouses(wardenId?: string) {
    return this.client.house.findMany({
      where: wardenId ? { wardens: { some: { userId: wardenId } } } : {},
      orderBy: { name: "asc" },
      include: {
        rooms: { orderBy: { roomNumber: "asc" } },
        wardens: { select: { userId: true } },
      },
    });
  }

  async wardenManagesHouse(userId: string, houseId: string) {
    return (await this.client.houseWarden.findUnique({
      where: { houseId_userId: { houseId, userId } }, select: { houseId: true },
    })) !== null;
  }

  async listAssignedHouseIds(userId: string) {
    const rows = await this.client.houseWarden.findMany({
      where: { userId }, select: { houseId: true },
    });
    return rows.map(({ houseId }) => houseId);
  }

  async getPrimaryWardenId(houseId: string) {
    return (await this.client.house.findUnique({
      where: { id: houseId }, select: { primaryWardenId: true },
    }))?.primaryWardenId ?? null;
  }

  findCurrentMembership(userId: string) {
    return this.client.roomResident.findFirst({
      where: { userId, endedAt: null }, include: membershipContext,
    });
  }

  async verifiedResidents(roomId: string) {
    return this.client.roomResident.findMany({
      where: { roomId, endedAt: null, verifiedAt: { not: null }, student: { isActive: true, role: "STUDENT" } },
      select: { userId: true, student: { select: { fullName: true } } },
      orderBy: { userId: "asc" },
    });
  }

  listCurrentMemberships(houseId?: string, wardenId?: string) {
    return this.client.roomResident.findMany({
      where: {
        endedAt: null,
        room: {
          houseId,
          ...(wardenId ? { house: { wardens: { some: { userId: wardenId } } } } : {}),
        },
      },
      include: membershipContext,
      orderBy: [{ assignedAt: "desc" }, { id: "desc" }],
    });
  }

  countResidents(roomId: string) {
    return this.client.roomResident.count({ where: { roomId, endedAt: null } });
  }

  endMembership(id: string, endedAt: Date, endedBy: string) {
    return this.client.roomResident.update({ where: { id }, data: { endedAt, endedBy } });
  }

  createMembership(data: Prisma.RoomResidentUncheckedCreateInput) {
    return this.client.roomResident.create({ data, include: membershipContext });
  }

  verifyMembership(id: string, verifiedAt: Date, verifiedBy: string) {
    return this.client.roomResident.update({
      where: { id }, data: { verifiedAt, verifiedBy }, include: membershipContext,
    });
  }
}

export async function withRoomTransaction<T>(run: (repository: RoomRepository, client: Prisma.TransactionClient) => Promise<T>) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await prisma.$transaction(
        (client) => run(new RoomRepository(client), client),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (attempt >= 3 || !(error instanceof Prisma.PrismaClientKnownRequestError) ||
          error.code !== "P2034") throw error;
    }
  }
}
