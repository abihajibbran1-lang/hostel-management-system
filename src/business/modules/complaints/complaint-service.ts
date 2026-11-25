import type {
  ComplaintListQuery,
  CreateComplaintInput,
} from "./complaint-contract.ts";
import { RoomService } from "../schedules/room-service.ts";
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
  private readonly getSubmittedHouseId: (userId: string) => Promise<string | null>;

  constructor(
    complaints: ComplaintStore = new ComplaintRepository(),
    clock: () => Date = () => new Date(),
    getSubmittedHouseId: (userId: string) => Promise<string | null> = async (userId) =>
      (await new RoomService().getVerifiedMembership(userId))?.houseId ?? null,
  ) {
    this.complaints = complaints;
    this.clock = clock;
    this.getSubmittedHouseId = getSubmittedHouseId;
  }

  async create(userId: string, input: CreateComplaintInput) {
    const submittedHouseId = await this.getSubmittedHouseId(userId);
    return this.complaints.createWithInitialHistory({
      submittedBy: userId,
      submittedHouseId,
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
