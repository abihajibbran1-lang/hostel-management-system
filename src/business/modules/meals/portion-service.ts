import {
  findPortionLogByRequest, inPortionTransaction, listPortionRecords, lockPortionLog, storePortionAudit,
  storePortionLog, type PortionRecord,
} from "../../../data/repositories/meals/portion-repository.ts";
import { MenuRepository } from "../../../data/repositories/meals/menu-repository.ts";
import { getPublishedMenu } from "./menu-service.ts";
import { menuDateString, toMenuDate } from "./menu-contract.ts";
import type { PortionAuditInput, PortionLogInput } from "./portion-contract.ts";

export class PortionError extends Error {
  readonly status: 400 | 404 | 409;
  constructor(status: PortionError["status"], message: string) {
    super(message);
    this.status = status;
  }
}

function present(log: PortionRecord) {
  return {
    id: log.id, date: menuDateString(log.mealDate), mealType: log.mealType, name: log.itemNameSnapshot,
    portionCount: log.portionCount, loggedBy: log.loggedBy, loggedAt: log.loggedAt,
    audit: log.audit && {
      recordedBy: log.audit.recordedBy, recordedAt: log.audit.recordedAt, description: log.audit.description,
      expectedPortions: log.audit.expectedPortions, observedPortions: log.audit.observedPortions,
      passed: log.audit.expectedPortions === log.audit.observedPortions,
      discrepancyId: log.discrepancy?.id ?? null,
    },
  };
}

export async function getPortionLogs(date: string) {
  return (await listPortionRecords(toMenuDate(date))).map(present);
}

export async function getPortionMenu(date: string) {
  return (await getPublishedMenu(date)).items;
}

function confirmSameLog(log: PortionRecord, input: PortionLogInput) {
  if (menuDateString(log.mealDate) !== input.date || log.mealType !== input.mealType || log.portionCount !== input.portionCount) {
    throw new PortionError(409, "This request ID was already used for a different allocation.");
  }
  return present(log);
}

export function logPortions(actorId: string, input: PortionLogInput) {
  return inPortionTransaction(async (tx) => {
    const replay = await findPortionLogByRequest(tx, actorId, input.requestId);
    if (replay) return confirmSameLog(replay, input);
    const { items } = await getPublishedMenu(input.date, new MenuRepository(tx));
    const item = items.find(({ mealType }) => mealType === input.mealType);
    if (!item) throw new PortionError(400, "Choose a meal from a published menu.");
    return confirmSameLog(await storePortionLog(tx, {
      mealDate: toMenuDate(input.date), mealType: item.mealType, menuItemId: item.id,
      itemNameSnapshot: item.name, portionCount: input.portionCount, loggedBy: actorId, requestId: input.requestId,
    }), input);
  });
}

export function verifyPortions(actorId: string, id: string, input: PortionAuditInput) {
  return inPortionTransaction(async (tx) => {
    const log = await lockPortionLog(tx, id);
    if (!log) throw new PortionError(404, "Portion log not found.");
    const description = input.description || null;
    if (log.audit) {
      if (log.audit.recordedBy !== actorId || log.audit.observedPortions !== input.observedPortions || log.audit.description !== description) {
        throw new PortionError(409, "This portion log already has a final audit.");
      }
      return present(log);
    }
    return present(await storePortionAudit(tx, {
      portionLogId: id, recordedBy: actorId, expectedPortions: log.portionCount,
      observedPortions: input.observedPortions, description, recordedAt: new Date(),
    }));
  });
}
