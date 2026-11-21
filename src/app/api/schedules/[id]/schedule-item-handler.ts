import { PersonalScheduleService, isScheduleValidationError } from "../../../../business/modules/schedules/personal-schedule-service.ts";
import { toPersonalScheduleResponse } from "../../../../business/modules/schedules/personal-schedule-response.ts";
import {
  personalScheduleIdSchema,
  updatePersonalScheduleSchema,
} from "../../../../business/modules/schedules/personal-schedule-contract.ts";
import {
  apiForbidden,
  apiInternalError,
  apiNotFound,
  apiSuccess,
  apiValidationError,
} from "../../../../shared/api/response.ts";
import { getStudentScheduleIdentity } from "../schedule-request-auth.ts";
import { parseJsonBody } from "../../../../shared/validation/parse-request.ts";
import { validateRequestOrigin } from "../../../../shared/security/origin-validation.ts";

type PersonalScheduleItemPort = Pick<PersonalScheduleService, "getOwned" | "updateOwned">;
type ItemContext = { params: Promise<{ id: string }> };

async function parseScheduleId(context: ItemContext) {
  const params = await context.params;
  return personalScheduleIdSchema.safeParse(params.id);
}

export function createPersonalScheduleGetHandler(scheduleService?: PersonalScheduleItemPort) {
  return async function getSchedule(request: Request, context: ItemContext) {
    const identity = getStudentScheduleIdentity(request);

    if (!identity.ok) {
      return identity.response;
    }

    const scheduleId = await parseScheduleId(context);
    if (!scheduleId.success) {
      return apiValidationError(scheduleId.error);
    }

    try {
      const schedule = await (scheduleService ?? new PersonalScheduleService()).getOwned(
        identity.userId,
        scheduleId.data,
      );

      return schedule
        ? apiSuccess({ schedule: toPersonalScheduleResponse(schedule) })
        : apiNotFound();
    } catch {
      return apiInternalError();
    }
  };
}

export function createPersonalScheduleUpdateHandler(scheduleService?: PersonalScheduleItemPort) {
  return async function updateSchedule(request: Request, context: ItemContext) {
    if (validateRequestOrigin(request) !== "same-origin") {
      return apiForbidden();
    }

    const identity = getStudentScheduleIdentity(request);

    if (!identity.ok) {
      return identity.response;
    }

    const scheduleId = await parseScheduleId(context);
    if (!scheduleId.success) {
      return apiValidationError(scheduleId.error);
    }

    const body = await parseJsonBody(request, updatePersonalScheduleSchema);
    if (!body.success) {
      return apiValidationError(body.error);
    }

    try {
      const schedule = await (scheduleService ?? new PersonalScheduleService()).updateOwned(
        identity.userId,
        scheduleId.data,
        body.data,
      );

      return schedule
        ? apiSuccess({ schedule: toPersonalScheduleResponse(schedule) })
        : apiNotFound();
    } catch (error) {
      return isScheduleValidationError(error)
        ? apiValidationError(error)
        : apiInternalError();
    }
  };
}
