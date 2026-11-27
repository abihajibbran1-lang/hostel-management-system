import { findAssignedEscalation, listAssignedEscalations } from "../../../data/repositories/complaints/escalation-repository.ts";
import { encodeComplaintCursor, type ComplaintListQuery } from "./complaint-contract.ts";

export async function managerComplaintQueue(managerId: string, { limit, cursor }: ComplaintListQuery) {
  const records = await listAssignedEscalations(managerId, limit + 1, cursor);
  const complaints = records.slice(0, limit);
  return {
    complaints,
    nextCursor: records.length > limit ? encodeComplaintCursor(complaints[limit - 1].id) : null,
  };
}

export function managerComplaintDetail(managerId: string, id: string) {
  return findAssignedEscalation(managerId, id);
}
