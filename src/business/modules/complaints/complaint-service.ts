import type {
  ComplaintListQuery,
  CreateComplaintInput,
} from "./complaint-contract.ts";
import {
  ComplaintRepository,
  type ComplaintListPage,
  type ComplaintRecord,
  type ComplaintWrite,
} from "../../../data/repositories/complaints/complaint-repository.ts";

export type ComplaintStore = {
  createWithInitialHistory(write: ComplaintWrite): Promise<ComplaintRecord>;
  listForOwner(submittedBy: string, query: ComplaintListQuery): Promise<ComplaintListPage>;
  findOwned(submittedBy: string, id: string): Promise<ComplaintRecord | null>;
};

export class ComplaintService {
  private readonly complaints: ComplaintStore;
  private readonly clock: () => Date;

  constructor(
    complaints: ComplaintStore = new ComplaintRepository(),
    clock: () => Date = () => new Date(),
  ) {
    this.complaints = complaints;
    this.clock = clock;
  }

  create(userId: string, input: CreateComplaintInput) {
    return this.complaints.createWithInitialHistory({
      submittedBy: userId,
      category: input.category,
      roomNumber: input.roomNumber,
      description: input.description,
      urgencyFlag: input.urgencyFlag,
      submittedAt: this.clock(),
    });
  }

  listForOwner(userId: string, query: ComplaintListQuery) {
    return this.complaints.listForOwner(userId, query);
  }

  getOwned(userId: string, id: string) {
    return this.complaints.findOwned(userId, id);
  }
}
