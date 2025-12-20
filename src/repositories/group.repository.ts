import { prisma } from "../config/prisma";
import { Group } from "@prisma/client";

export class GroupRepository {
  async createGroup(name: string): Promise<Group> {
    return prisma.group.create({
      data: {
        name,
      },
    });
  }

  async getById(groupId: string): Promise<Group | null> {
    return prisma.group.findUnique({
      where: { id: groupId },
    });
  }
}
