"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import {
  karachiDateTimeToUtc,
  utcToKarachiDateTime,
} from "../../business/modules/schedules/personal-schedule-time.ts";
import {
  PersonalScheduleView,
  type PersonalScheduleViewItem,
  type PersonalScheduleViewState,
} from "./personal-schedule-view.ts";

type ScheduleResponse = {
  data?: { schedule?: PersonalScheduleViewItem; schedules?: PersonalScheduleViewItem[] };
  error?: { code?: string };
};

type ScheduleForm = {
  title: string;
  description: string;
  startAt: string;
  endAt: string;
};

const emptyForm: ScheduleForm = { title: "", description: "", startAt: "", endAt: "" };

function getKarachiToday() {
  return utcToKarachiDateTime(new Date()).slice(0, 10);
}

function getErrorState(body: ScheduleResponse): PersonalScheduleViewState {
  return body.error?.code === "VALIDATION_ERROR" ? "validation-error" : "network-error";
}

export function PersonalSchedule() {
  const [selectedDate, setSelectedDate] = useState(getKarachiToday);
  const [schedules, setSchedules] = useState<PersonalScheduleViewItem[]>([]);
  const [state, setState] = useState<PersonalScheduleViewState>("loading");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ScheduleForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadSchedules = useCallback(async (date: string) => {
    setState("loading");

    try {
      const response = await fetch(`/api/schedules?date=${encodeURIComponent(date)}`);
      const body = (await response.json()) as ScheduleResponse;

      if (!response.ok || !body.data?.schedules) {
        setState(getErrorState(body));
        return;
      }

      setSchedules(body.data.schedules);
      setState("ready");
    } catch {
      setState("network-error");
    }
  }, []);

  useEffect(() => {
    void loadSchedules(selectedDate);
  }, [loadSchedules, selectedDate]);

  function beginEdit(schedule: PersonalScheduleViewItem) {
    setEditingId(schedule.id);
    setForm({
      title: schedule.title,
      description: schedule.description ?? "",
      startAt: utcToKarachiDateTime(schedule.startAt),
      endAt: utcToKarachiDateTime(schedule.endAt),
    });
    setFormError(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
  }

  async function saveSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const startAt = karachiDateTimeToUtc(form.startAt);
    const endAt = karachiDateTimeToUtc(form.endAt);
    if (!startAt || !endAt || endAt <= startAt) {
      setFormError("Enter valid times, with the end later than the start.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        editingId ? `/api/schedules/${editingId}` : "/api/schedules",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title: form.title,
            description: form.description.trim() || null,
            startAt: startAt.toISOString(),
            endAt: endAt.toISOString(),
          }),
        },
      );
      const body = (await response.json()) as ScheduleResponse;

      if (!response.ok || !body.data?.schedule) {
        setFormError(
          body.error?.code === "VALIDATION_ERROR"
            ? "Check the activity details and time range."
            : "Your activity could not be saved. Please try again.",
        );
        return;
      }

      const activityDate = utcToKarachiDateTime(body.data.schedule.startAt).slice(0, 10);
      setSelectedDate(activityDate);
      resetForm();
      await loadSchedules(activityDate);
    } catch {
      setFormError("Your activity could not be saved. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl p-6 sm:p-8" aria-labelledby="schedule-heading">
      <header className="mb-6">
        <h1 id="schedule-heading" className="text-2xl font-semibold">My Schedule</h1>
        <p className="mt-1 text-sm text-slate-600">Your activities are private to your account.</p>
      </header>

      <label className="block max-w-xs text-sm font-medium" htmlFor="schedule-date">
        Day
        <input
          id="schedule-date"
          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2"
          type="date"
          value={selectedDate}
          onChange={(event) => setSelectedDate(event.currentTarget.value)}
        />
      </label>

      <div className="mt-4">
        <PersonalScheduleView
          schedules={schedules}
          state={state}
          onEdit={beginEdit}
          onRetry={() => void loadSchedules(selectedDate)}
        />
      </div>

      <form className="mt-8 space-y-4 rounded-xl border border-slate-200 bg-white p-5" onSubmit={saveSchedule}>
        <h2 className="text-lg font-semibold">{editingId ? "Edit activity" : "Add an activity"}</h2>
        <label className="block text-sm font-medium" htmlFor="schedule-title">
          Activity
          <input
            id="schedule-title"
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.currentTarget.value }))}
            required
          />
        </label>
        <label className="block text-sm font-medium" htmlFor="schedule-description">
          Description <span className="font-normal text-slate-500">(optional)</span>
          <textarea
            id="schedule-description"
            className="mt-1 block min-h-20 w-full rounded-md border border-slate-300 px-3 py-2"
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.currentTarget.value }))}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium" htmlFor="schedule-start">
            Starts (Karachi time)
            <input
              id="schedule-start"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
              type="datetime-local"
              value={form.startAt}
              onChange={(event) => setForm((current) => ({ ...current, startAt: event.currentTarget.value }))}
              required
            />
          </label>
          <label className="block text-sm font-medium" htmlFor="schedule-end">
            Ends (Karachi time)
            <input
              id="schedule-end"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
              type="datetime-local"
              value={form.endAt}
              onChange={(event) => setForm((current) => ({ ...current, endAt: event.currentTarget.value }))}
              required
            />
          </label>
        </div>
        {formError ? <p role="alert" className="text-sm text-red-700">{formError}</p> : null}
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            type="submit"
            disabled={saving}
          >
            {saving ? "Saving…" : editingId ? "Save changes" : "Add activity"}
          </button>
          {editingId ? (
            <button className="rounded-md border border-slate-300 px-4 py-2 text-sm" type="button" onClick={resetForm}>
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
