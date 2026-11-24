import type { ComplaintRecord } from "../../../data/repositories/complaints/complaint-repository.ts";

export function toComplaintResponse(complaint: ComplaintRecord) {
  return {
    id: complaint.id,
    trackingReference: complaint.id,
    category: complaint.category,
    roomNumber: complaint.roomNumber,
    description: complaint.description,
    urgencyFlag: complaint.urgencyFlag,
    status: complaint.status,
    outcome: complaint.outcome,
    submittedAt: complaint.submittedAt,
    createdAt: complaint.createdAt,
  };
}
