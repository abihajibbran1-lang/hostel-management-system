import { z } from "zod";
import type { AuthenticatedIdentity } from "../auth/jwt-service.ts";
import { AuthService } from "../auth/auth-service.ts";
import { AuthUserRepository } from "../../../data/repositories/auth/auth-user-repository.ts";
import { RoomRepository, withRoomTransaction } from "../../../data/repositories/schedules/room-repository.ts";

const id = z.string().uuid();
const name = z.string().trim().min(1).max(120);
export const roomCommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("createHouse"), name }).strict(),
  z.object({ action: z.literal("createRoom"), houseId: id, roomNumber: name,
    capacity: z.number().int().positive().max(2_147_483_647),
    block: name.optional(), floor: name.optional() }).strict(),
  z.object({ action: z.literal("assignWarden"), houseId: id, userId: id, primary: z.boolean() }).strict(),
  z.object({ action: z.literal("removeWarden"), houseId: id, userId: id }).strict(),
  z.object({ action: z.literal("placeStudent"), roomId: id, userId: id }).strict(),
  z.object({ action: z.literal("verifyMembership"), userId: id, membershipId: id }).strict(),
]);

export const roomManagementQuerySchema = z.object({ houseId: id.optional() }).strict();
type RoomCommand = z.infer<typeof roomCommandSchema>;

export class RoomManagementError extends Error {
  readonly kind: "forbidden" | "not-found" | "invalid";

  constructor(kind: RoomManagementError["kind"], message: string) {
    super(message);
    this.kind = kind;
  }
}

function forbidden(): never {
  throw new RoomManagementError("forbidden", "Room management access is not allowed.");
}

async function requireAssignedHouse(repository: RoomRepository, actor: AuthenticatedIdentity, houseId: string) {
  if (actor.role !== "WARDEN" || !(await repository.wardenManagesHouse(actor.userId, houseId))) forbidden();
}

export class RoomService {
  private readonly rooms: RoomRepository;
  private readonly auth: AuthService;

  constructor(rooms = new RoomRepository(), auth = new AuthService()) {
    this.rooms = rooms;
    this.auth = auth;
  }

  async getVerifiedMembership(userId: string) {
    const membership = await this.rooms.findCurrentMembership(userId);
    return membership?.verifiedAt ? membership.room : null;
  }

  findRoom(roomId: string) {
    return this.rooms.findRoom(roomId);
  }

  verifiedResidents(roomId: string) {
    return this.rooms.verifiedResidents(roomId);
  }

  async getActivePrimaryWarden(houseId: string) {
    const userId = await this.rooms.getPrimaryWardenId(houseId);
    const account = userId ? await this.auth.getAccountStatus(userId) : null;
    return account?.isActive && account.role === "WARDEN" ? account.userId : null;
  }

  wardenManagesHouse(userId: string, houseId: string) {
    return this.rooms.wardenManagesHouse(userId, houseId);
  }

  listAssignedHouseIds(userId: string) {
    return this.rooms.listAssignedHouseIds(userId);
  }

  async getDirectory(actor: AuthenticatedIdentity, houseId?: string) {
    if (actor.role !== "MANAGER" && actor.role !== "WARDEN") forbidden();
    return withRoomTransaction(async (rooms) => {
      if (actor.role === "WARDEN" && houseId) {
        await requireAssignedHouse(rooms, actor, houseId);
      }
      const wardenId = actor.role === "WARDEN" ? actor.userId : undefined;
      return {
        role: actor.role,
        houses: await rooms.listHouses(wardenId),
        memberships: await rooms.listCurrentMemberships(houseId, wardenId),
      };
    });
  }

  async execute(actor: AuthenticatedIdentity, command: RoomCommand) {
    if (actor.role !== "MANAGER" && actor.role !== "WARDEN") forbidden();
    if (actor.role !== "MANAGER" &&
        command.action !== "placeStudent" && command.action !== "verifyMembership") forbidden();
    if (command.action === "assignWarden") {
      const account = await this.auth.getAccountStatus(command.userId);
      if (!account?.isActive || account.role !== "WARDEN") {
        throw new RoomManagementError("invalid", "An active Warden account is needed.");
      }
    }

    return withRoomTransaction(async (rooms, client) => {
      switch (command.action) {
        case "createHouse":
          return rooms.createHouse(command.name);
        case "createRoom": {
          const { houseId, roomNumber, capacity, block, floor } = command;
          return rooms.createRoom({ houseId, roomNumber, capacity, block, floor });
        }
        case "assignWarden":
          await rooms.assignWarden(command.houseId, command.userId, command.primary);
          return {};
        case "removeWarden":
          await rooms.removeWarden(command.houseId, command.userId);
          return {};
        case "verifyMembership": {
          if (actor.role !== "WARDEN") forbidden();
          const membership = await rooms.findCurrentMembership(command.userId);
          if (!membership || membership.id !== command.membershipId ||
              !(await rooms.wardenManagesHouse(actor.userId, membership.room.houseId))) {
            throw new RoomManagementError("not-found", "Current membership not found.");
          }
          return membership.verifiedAt
            ? membership
            : rooms.verifyMembership(membership.id, new Date(), actor.userId);
        }
        case "placeStudent": {
          const room = await rooms.findRoom(command.roomId);
          if (!room) throw new RoomManagementError("not-found", "Room not found.");
          const previous = await rooms.findCurrentMembership(command.userId);
          if (actor.role === "WARDEN") {
            await requireAssignedHouse(rooms, actor, room.houseId);
            if (!previous || !previous.verifiedAt || previous.room.houseId !== room.houseId) forbidden();
          }
          const account = await new AuthService(new AuthUserRepository(client)).getAccountStatus(command.userId);
          if (!account?.isActive || account.role !== "STUDENT") {
            throw new RoomManagementError("invalid", "An active Student account is needed.");
          }
          if (previous?.roomId === room.id) {
            throw new RoomManagementError("invalid", "The student already belongs to this room.");
          }
          if (await rooms.countResidents(room.id) >= room.capacity) {
            throw new RoomManagementError("invalid", "The room is at capacity.");
          }

          const now = new Date();
          if (previous) {
            await rooms.endMembership(previous.id, now, actor.userId);
            const { flagTransferredAssignments } = await import("./responsibility-service.ts");
            await flagTransferredAssignments(client, command.userId, previous.roomId, now);
          }
          return rooms.createMembership({
            assignedAt: now, assignedBy: actor.userId, roomId: room.id, userId: command.userId,
            previousId: previous?.id,
            changeType: previous ? "transfer" : "assignment",
            ...(actor.role === "WARDEN" ? { verifiedAt: now, verifiedBy: actor.userId } : {}),
          });
        }
      }
    });
  }
}
