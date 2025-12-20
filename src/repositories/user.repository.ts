import { prisma } from "../config/prisma";
import { User } from "@prisma/client";

export class UserRepository {
  async getById(userId: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id: userId },
    });
  }

  async getByIds(userIds: string[]): Promise<User[]> {
    if (userIds.length === 0) {
      return [];
    }

    return prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
    });
  }

  async getByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }
}
