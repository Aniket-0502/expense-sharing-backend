import { prisma } from "../config/prisma";
import { GroupMember, GroupRole } from "@prisma/client";

export class GroupMemberRepository {
  async addMember(
    groupId: string,
    userId: string,
    role: GroupRole
  ): Promise<GroupMember> {
    return prisma.groupMember.create({
      data: {
        groupId,
        userId,
        role,
      },
    });
  }

  async getMember(
    groupId: string,
    userId: string
  ): Promise<GroupMember | null> {
    return prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
    });
  }

  async getMembersByGroup(groupId: string): Promise<GroupMember[]> {
    return prisma.groupMember.findMany({
      where: {
        groupId,
        leftAt: null,
      },
    });
  }

  async updateRole(
    groupId: string,
    userId: string,
    role: GroupRole
  ): Promise<GroupMember> {
    return prisma.groupMember.update({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
      data: {
        role,
      },
    });
  }

  async markLeft(groupId: string, userId: string): Promise<GroupMember> {
    return prisma.groupMember.update({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
      data: {
        leftAt: new Date(),
      },
    });
  }

  async countAdmins(groupId: string): Promise<number> {
    return prisma.groupMember.count({
      where: {
        groupId,
        role: GroupRole.ADMIN,
        leftAt: null,
      },
    });
  }
}
