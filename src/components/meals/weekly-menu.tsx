"use client";

import { useEffect, useState, type FormEvent } from "react";
import { MEAL_LABELS, MEAL_TYPES, menuDateSchema, menuDateString, menuWeekDates, menuWeekStart, toMenuDate } from "../../business/modules/meals/menu-contract.ts";

type MenuItem = { id: string; date: string; mealType: keyof typeof MEAL_LABELS; name: string; description: string | null };
type KitchenMenu = { id: string; weekStart: string; status: "DRAFT" | "PUBLISHED" | "ARCHIVED"; items: MenuItem[] };

function hostelToday() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts();
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

const inputStyle = "rounded border border-slate-400 bg-white p-2";
const buttonStyle = "rounded border border-slate-400 bg-white px-3 py-2 disabled:opacity-50";

async function fetchMenu<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...options });
  const body = await response.json() as { data: T; error?: { message?: string; details?: { message: string }[] } };
  if (response.status === 401 || response.status === 403) throw new Error("Sign in with the account required for this page.");
  if (!response.ok) throw new Error(body.error?.details?.[0]?.message ?? body.error?.message ?? "Could not load or save this menu.");
  return body.data;
}

export function StudentMealMenu() {
  const [date, setDate] = useState(hostelToday);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setItems([]);
    setError("");
    if (!menuDateSchema.safeParse(date).success) {
      setLoading(false);
      setError("Choose a valid date.");
      return;
    }
    setLoading(true);
    fetchMenu<{ items: MenuItem[] }>(`/api/meals/menu?date=${encodeURIComponent(date)}`, { signal: controller.signal })
      .then(({ items }) => { if (!controller.signal.aborted) setItems(items); })
      .catch((error: Error) => { if (!controller.signal.aborted) setError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [date]);

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Meal menu</h1>
      <label className="flex items-center gap-2">Date
        <input className={inputStyle} type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      </label>
      {loading && <p role="status">Loading menu…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && !items.length && <p>No published menu for this date.</p>}
      <ul className="grid gap-3 sm:grid-cols-3">
        {items.map((item) => <li key={item.id} className="space-y-1 rounded border bg-white p-4">
          <h2 className="font-semibold">{MEAL_LABELS[item.mealType]}</h2>
          <p>{item.name}</p>
          {item.description && <p className="text-sm text-slate-700">{item.description}</p>}
        </li>)}
      </ul>
    </main>
  );
}

export function KitchenWeeklyMenu() {
  const [week, setWeek] = useState(() => menuDateString(menuWeekStart(toMenuDate(hostelToday()))));
  const [menu, setMenu] = useState<KitchenMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [formVersion, setFormVersion] = useState(0);
  const [weekLoaded, setWeekLoaded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setMenu(null);
    setWeekLoaded(false);
    setError("");
    setNotice("");
    if (!menuDateSchema.safeParse(week).success) {
      setError("Choose a date within the week.");
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchMenu<{ menu: KitchenMenu | null }>(`/api/meals/menus?weekStart=${encodeURIComponent(week)}`, { signal: controller.signal })
      .then(({ menu }) => {
        if (!controller.signal.aborted) {
          setMenu(menu);
          setWeekLoaded(true);
        }
      })
      .catch((error: Error) => { if (!controller.signal.aborted) setError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [week]);

  const slots = menu ? menuWeekDates(menu.weekStart).flatMap((date) =>
    MEAL_TYPES.map((mealType) => ({
      date, mealType, key: `${date}:${mealType}`,
      saved: menu.items.find((item) => item.date === date && item.mealType === mealType),
    })),
  ) : [];

  async function createMenu() {
    setError("");
    setNotice("");
    setSaving(true);
    try {
      const result = await fetchMenu<{ menu: KitchenMenu }>("/api/meals/menus", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ weekStart: week }),
      });
      setMenu(result.menu);
      setNotice("Draft created.");
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!menu) return;
    const publishing = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "publish";
    const fields = new FormData(event.currentTarget);
    let filled = 0;
    const entries = slots.flatMap(({ date, mealType, key, saved }) => {
      const name = String(fields.get(`${key}:name`) ?? "").trim();
      const description = String(fields.get(`${key}:description`) ?? "").trim() || null;
      if (name) filled++;
      return name !== (saved?.name ?? "") || description !== (saved?.description ?? null)
        ? [{ date, mealType, name, description }] : [];
    });
    setError("");
    setNotice("");
    if (publishing && filled !== slots.length) {
      setError("Enter breakfast, lunch and dinner for all seven days before publishing.");
      return;
    }
    if (!entries.length && !publishing) {
      setNotice("No menu changes to save.");
      return;
    }
    setSaving(true);
    try {
      const path = `/api/meals/menus/${menu.id}`;
      if (entries.length) {
        const saved = await fetchMenu<{ menu: KitchenMenu }>(path, {
          method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: entries }),
        });
        setMenu(saved.menu);
        setFormVersion((version) => version + 1);
      }
      if (publishing) {
        const { menu } = await fetchMenu<{ menu: KitchenMenu }>(`${path}/publish`, { method: "POST" });
        setMenu(menu);
        setFormVersion((version) => version + 1);
      }
      setNotice(publishing ? "Menu published." : "Menu saved.");
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Manage weekly menu</h1>
      <label className="flex flex-wrap items-center gap-2">Choose a date in the menu week
        <input type="date" className={inputStyle} value={week} disabled={saving} onChange={(event) => {
          const date = event.target.value;
          setWeek(menuDateSchema.safeParse(date).success ? menuDateString(menuWeekStart(toMenuDate(date))) : date);
        }} />
      </label>
      {loading && <p role="status">Loading menu…</p>}
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!loading && weekLoaded && !menu && <button type="button" className={buttonStyle} disabled={saving} onClick={() => void createMenu()}>Create draft</button>}
      {menu && (
        <form method="post" key={`${menu.id}:${formVersion}`} onSubmit={save} className="space-y-4">
          <p className="capitalize">{menu.status.toLowerCase()}</p>
          <fieldset className="space-y-4" disabled={saving || menu.status === "ARCHIVED"}>
            {menuWeekDates(menu.weekStart).map((date) => (
              <section key={date} className="space-y-2 rounded border bg-white p-4">
                <h2 className="font-semibold">{date}</h2>
                <div className="grid gap-3 sm:grid-cols-3">
                  {slots.filter((slot) => slot.date === date).map(({ key, mealType, saved }) => (
                    <div key={key} className="space-y-2">
                      <label className="block">{MEAL_LABELS[mealType]}
                        <input className={`block w-full ${inputStyle}`} name={`${key}:name`} defaultValue={saved?.name} />
                      </label>
                      <label className="block">Description (optional)
                        <input className={`block w-full ${inputStyle}`} name={`${key}:description`} defaultValue={saved?.description ?? ""} />
                      </label>
                    </div>
                  ))}
                </div>
              </section>
            ))}
            <button type="submit" className={buttonStyle}>Save menu</button>{" "}
            {menu.status === "DRAFT" && <button type="submit" value="publish" className={buttonStyle}>Save and publish</button>}
          </fieldset>
        </form>
      )}
    </main>
  );
}
