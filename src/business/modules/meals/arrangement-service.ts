import type { Prisma } from "@prisma/client";
import { AuthUserRepository } from "../../../data/repositories/auth/auth-user-repository.ts";
import { RoomRepository } from "../../../data/repositories/schedules/room-repository.ts";
import { MenuRepository } from "../../../data/repositories/meals/menu-repository.ts";
import { MealArrangementRepository, withMealTransaction, type Ticket } from "../../../data/repositories/meals/arrangement-repository.ts";
import { NotificationService } from "../../notifications/notification-service.ts";
import { RoomService } from "../schedules/room-service.ts";
import { getPublishedMenu } from "./menu-service.ts";
import { menuDateString, toMenuDate } from "./menu-contract.ts";
import { noticeDeadline, reservationDeadline, type MealApprovalInput, type MealNoticeInput, type MealSlot } from "./arrangement-contract.ts";

export class ArrangementError extends Error {
  readonly status: 400 | 403 | 409 | 503;
  constructor(status: ArrangementError["status"], message: string) {
    super(message);
    this.status = status;
  }
}

function presentation(ticket: Ticket) {
  return {
    id: ticket.id, mealDate: menuDateString(ticket.mealDate), mealType: ticket.mealType,
    status: ticket.status, reservedAt: ticket.reservedAt,
    items: ticket.snapshots.map((item) => ({
      name: item.itemNameSnapshot, date: menuDateString(item.mealDateSnapshot),
      mealType: item.mealTypeSnapshot, portionCount: item.portionCount,
    })),
  };
}

async function publishedSlot(tx: Prisma.TransactionClient, slot: MealSlot) {
  const { items } = await getPublishedMenu(slot.date, new MenuRepository(tx));
  const item = items.find(({ mealType }) => mealType === slot.mealType);
  if (!item) throw new ArrangementError(400, "Choose a meal from a published menu.");
  return item;
}

async function notifyKitchen(tx: Prisma.TransactionClient, type: "meal_reservation" | "meal_collection_difficulty", id: string) {
  const recipients = await new AuthUserRepository(tx).listActiveUserIdsByRole("KITCHEN_STAFF");
  if (!recipients.length) throw new ArrangementError(503, "Kitchen Staff are unavailable. Try again later.");
  for (const recipientUserId of recipients) {
    await new NotificationService().dispatchInTransaction(tx, {
      recipientUserId, type, relatedModule: "meals", relatedEntityId: id,
      title: type === "meal_reservation" ? "New meal reservation" : "Meal collection notice",
      message: "Open Meal arrangements for details.",
      deduplicationKey: `meal:${type}:${id}:${recipientUserId}`,
    });
  }
}

function timingCheck(now: Date, deadline: Date | null, message: string) {
  if (!deadline || now >= deadline) throw new ArrangementError(400, message);
}

function intakeWarden(wardenId: string) {
  return wardenId === process.env.MEAL_INTAKE_WARDEN_ID?.trim().toLowerCase();
}

export async function approveMealCommitment(wardenId: string, input: MealApprovalInput, clock = () => new Date()) {
  return withMealTransaction(async (tx) => {
    const rooms = new RoomService(new RoomRepository(tx));
    const student = await new AuthUserRepository(tx).getAccountStatus(input.studentId);
    const house = (await rooms.getVerifiedMembership(input.studentId))?.houseId;
    if (!student?.isActive || student.role !== "STUDENT" ||
        !(house ? await rooms.wardenManagesHouse(wardenId, house) : intakeWarden(wardenId))) {
      throw new ArrangementError(403, "You cannot approve this student.");
    }
    await publishedSlot(tx, input);
    timingCheck(clock(), reservationDeadline(input.date), "The reservation cutoff has passed.");
    const approval = await new MealArrangementRepository(tx).approve({
      studentId: input.studentId, approvedBy: wardenId, mealDate: toMenuDate(input.date), mealType: input.mealType,
    });
    return { id: approval.id };
  });
}

export function reserveMeal(userId: string, slot: MealSlot, clock = () => new Date()) {
  return withMealTransaction(async (tx) => {
    const repo = new MealArrangementRepository(tx);
    await repo.lockRequest(userId, `reservation:${slot.date}:${slot.mealType}`);
    const mealDate = toMenuDate(slot.date);
    const existing = await repo.findTicket(userId, mealDate, slot.mealType);
    if (existing) return presentation(existing);

    timingCheck(clock(), reservationDeadline(slot.date), "The reservation cutoff has passed.");
    if (!(await repo.findApproval(userId, mealDate, slot.mealType))) {
      throw new ArrangementError(403, "A Warden must approve your commitment for this meal.");
    }
    const item = await publishedSlot(tx, slot);
    const membership = await new RoomService(new RoomRepository(tx)).getVerifiedMembership(userId);
    const ticket = await repo.createTicket({
      userId, submittedHouseId: membership?.houseId ?? null, mealDate, mealType: slot.mealType,
      snapshots: { create: {
        menuItemId: item.id, itemNameSnapshot: item.name, mealDateSnapshot: mealDate,
        mealTypeSnapshot: slot.mealType, portionCount: 1,
      } },
    });
    await notifyKitchen(tx, "meal_reservation", ticket.id);
    return presentation(ticket);
  });
}

function presentNotice(notice: Awaited<ReturnType<MealArrangementRepository["createNotice"]>>) {
  return {
    id: notice.id, reservationId: notice.reservationId, mealDate: menuDateString(notice.mealDate),
    mealType: notice.mealType, explanation: notice.explanation, submittedAt: notice.submittedAt,
  };
}

export function submitCollectionNotice(userId: string, input: MealNoticeInput, clock = () => new Date()) {
  return withMealTransaction(async (tx) => {
    const repo = new MealArrangementRepository(tx);
    await repo.lockRequest(userId, `notice:${input.requestId}`);
    const existing = await repo.findNotice(userId, input.requestId);
    if (existing) {
      if (menuDateString(existing.mealDate) !== input.date || existing.mealType !== input.mealType ||
          existing.explanation !== input.explanation || existing.reservationId !== (input.reservationId ?? null)) {
        throw new ArrangementError(409, "This request ID was already used for a different notice.");
      }
      return presentNotice(existing);
    }
    const window = await repo.findWindow(input.mealType);
    const deadline = noticeDeadline(input.date, window?.opensAt);
    if (!deadline) throw new ArrangementError(503, "Collection hours for this meal have not been configured.");
    if (clock() > deadline) throw new ArrangementError(400, "The advance notice cutoff has passed.");
    await publishedSlot(tx, input);
    const mealDate = toMenuDate(input.date);
    if (input.reservationId) {
      const owned = await repo.findTicket(userId, mealDate, input.mealType);
      if (owned?.id !== input.reservationId) throw new ArrangementError(400, "Choose one of your reservations for this meal.");
    }
    const membership = await new RoomService(new RoomRepository(tx)).getVerifiedMembership(userId);
    const notice = await repo.createNotice({
      userId, submittedHouseId: membership?.houseId ?? null, reservationId: input.reservationId,
      requestId: input.requestId, mealDate, mealType: input.mealType, explanation: input.explanation,
    });
    await notifyKitchen(tx, "meal_collection_difficulty", notice.id);
    return presentNotice(notice);
  });
}

export async function getMealArrangements(actor: { userId: string; role: "STUDENT" | "WARDEN" | "KITCHEN_STAFF" }, date: string) {
  const scope = actor.role === "STUDENT" ? { userId: actor.userId }
    : actor.role === "WARDEN" ? {
      houseIds: await new RoomService().listAssignedHouseIds(actor.userId),
      intake: intakeWarden(actor.userId),
    } : {};
  const { tickets, notices } = await new MealArrangementRepository().list(scope, toMenuDate(date));
  return {
    tickets: tickets.map((ticket) => ({
      ...presentation(ticket), ...(actor.role !== "STUDENT" ? { studentId: ticket.userId } : {}),
    })),
    notices: notices.map((notice) => ({
      ...presentNotice(notice), ...(actor.role !== "STUDENT" ? { studentId: notice.userId } : {}),
    })),
    windows: await new MealArrangementRepository().listWindows(),
  };
}

export function getCollectionWindows() {
  return new MealArrangementRepository().listWindows();
}

export function updateCollectionWindow(input: Prisma.MealCollectionWindowCreateInput) {
  return new MealArrangementRepository().updateWindow(input);
}
