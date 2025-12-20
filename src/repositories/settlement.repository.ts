import { prisma } from "../config/prisma";
import { Settlement } from "@prisma/client";

export class SettlementRepository {
  async createSettlement(data: {
    groupId: string;
    fromUserId: string;
    toUserId: string;
    amount: number;
  }): Promise<Settlement> {
    return prisma.settlement.create({
      data: {
        groupId: data.groupId,
        fromUserId: data.fromUserId,
        toUserId: data.toUserId,
        amount: data.amount,
      },
    });
  }

  async getSettlementsByGroup(groupId: string): Promise<Settlement[]> {
    return prisma.settlement.findMany({
      where: {
        groupId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }
}
