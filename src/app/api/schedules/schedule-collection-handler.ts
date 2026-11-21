import { PersonalScheduleService } from "../../../business/modules/schedules/personal-schedule-service.ts";
import { toPersonalScheduleResponse } from "../../../business/modules/schedules/personal-schedule-response.ts";
import {
  createPersonalScheduleSchema,
  listPersonalSchedulesQuerySchema,
} from "../../../business/modules/schedules/personal-schedule-contract.ts";
import {
  apiForbidden,
  apiInternalError,
  apiSuccess,
  apiValidationError,
} from "../../../shared/api/response.ts";
import { parseJsonBody } from "../../../shared/validation/parse-request.ts";
import { validateRequestOrigin } from "../../../shared/security/origin-validation.ts";
import { getStudentScheduleIdentity } from "./schedule-request-auth.ts";

type PersonalScheduleCollectionPort = Pick<PersonalScheduleService, "create" | "listForDate">;

export function createPersonalScheduleListHandler(
  scheduleService?: PersonalScheduleCollectionPort,
) {
  return async function listSchedules(request: Request) {
    const identity = getStudentScheduleIdentity(request);

    if (!identity.ok) {
      return identity.response;
    }

    const query = listPersonalSchedulesQuerySchema.safeParse({
      date: new URL(request.url).searchParams.get("date") ?? undefined,
    });

    if (!query.success) {
      return apiValidationError(query.error);
    }

    try {
      const schedules = await (scheduleService ?? new PersonalScheduleService()).listForDate(
        identity.userId,
        query.data.date,
      );

      return apiSuccess({ schedules: schedules.map(toPersonalScheduleResponse) });
    } catch {
      return apiInternalError();
    }
  };
}

export function createPersonalScheduleCreateHandler(
  scheduleService?: PersonalScheduleCollectionPort,
) {
  return async function createSchedule(request: Request) {
    if (validateRequestOrigin(request) !== "same-origin") {
      return apiForbidden();
    }

    const identity = getStudentScheduleIdentity(request);

    if (!identity.ok) {
      return identity.response;
    }

    const body = await parseJsonBody(request, createPersonalScheduleSchema);
    if (!body.success) {
      return apiValidationError(body.error);
    }

    try {
      const schedule = await (scheduleService ?? new PersonalScheduleService()).create(
        identity.userId,
        body.data,
      );

      return apiSuccess({ schedule: toPersonalScheduleResponse(schedule) }, 201);
    } catch {
      return apiInternalError();
    }
  };
}
