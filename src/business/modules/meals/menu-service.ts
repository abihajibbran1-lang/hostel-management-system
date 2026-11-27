import { MenuRepository, markMenuPublished, withLockedMenu, writeMenuItems, type MenuRecord } from "../../../data/repositories/meals/menu-repository.ts";
import { MEAL_TYPES, menuDateString, menuWeekDates, menuWeekStart, toMenuDate, type MenuEdit } from "./menu-contract.ts";

export class MenuError extends Error {
  readonly status: 400 | 404 | 409;

  constructor(status: MenuError["status"], message: string) {
    super(message);
    this.status = status;
  }
}

export function validateMenuSlots(weekStart: string, items: MenuEdit["items"]) {
  const allowed = new Set(menuWeekDates(weekStart));
  if (items.some(({ date }) => !allowed.has(date))) throw new MenuError(400, "Every item must belong to the selected week.");
}

export function hasCompleteMenu(menu: Pick<MenuRecord, "weekStartDate" | "items">) {
  const slots = new Set(menu.items.map(({ mealDate, mealType }) => `${menuDateString(mealDate)}:${mealType}`));
  return menuWeekDates(menuDateString(menu.weekStartDate))
    .every((date) => MEAL_TYPES.every((type) => slots.has(`${date}:${type}`)));
}

function editableMenu(menu: MenuRecord | null): MenuRecord {
  if (!menu) throw new MenuError(404, "Menu not found.");
  if (menu.status === "ARCHIVED") throw new MenuError(409, "Archived menus cannot be edited.");
  return menu;
}

function presentItems(items: MenuRecord["items"]) {
  return items.map(({ id, mealDate, mealType, itemName, description }) => ({
    id, date: menuDateString(mealDate), mealType, name: itemName, description,
  }));
}

function presentMenu(menu: MenuRecord) {
  return {
    id: menu.id,
    weekStart: menuDateString(menu.weekStartDate),
    status: menu.status,
    items: presentItems(menu.items),
  };
}

export async function getPublishedMenu(date: string) {
  const day = toMenuDate(date);
  const menu = await new MenuRepository().findPublishedDay(menuWeekStart(day), day);
  return { date, items: menu ? presentItems(menu.items) : [] };
}

export async function getKitchenMenu(weekStart: string) {
  const menu = await new MenuRepository().findWeek(toMenuDate(weekStart));
  return menu ? presentMenu(menu) : null;
}

export async function createDraftMenu(weekStart: string, actorId: string) {
  const menu = await new MenuRepository().createDraft(toMenuDate(weekStart), actorId);
  if (!menu) throw new MenuError(409, "A menu already exists for this week.");
  return presentMenu(menu);
}

export function saveMenu(id: string, input: MenuEdit) {
  return withLockedMenu(id, async (current, tx) => {
    const menu = editableMenu(current);
    validateMenuSlots(menuDateString(menu.weekStartDate), input.items);
    return presentMenu(await writeMenuItems(tx, id, input.items));
  });
}

export function publishMenu(id: string) {
  return withLockedMenu(id, async (current, tx) => {
    const menu = editableMenu(current);
    if (!hasCompleteMenu(menu)) throw new MenuError(400, "Enter breakfast, lunch and dinner for all seven days before publishing.");
    return presentMenu(menu.status === "PUBLISHED" ? menu : await markMenuPublished(tx, id));
  });
}
