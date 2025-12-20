import { GroupRole } from "@prisma/client";
import { GroupRepository } from "../repositories/group.repository";
import { GroupMemberRepository } from "../repositories/group-member.repository";
import { UserRepository } from "../repositories/user.repository";

export class GroupService {
  constructor(
    private groupRepository: GroupRepository,
    private groupMemberRepository: GroupMemberRepository,
    private userRepository: UserRepository
  ) {}

  // =========================
  // CREATE GROUP
  // =========================
  async createGroup(creatorUserId: string, name: string) {
    const group = await this.groupRepository.createGroup(name);

    await this.groupMemberRepository.addMember(
      group.id,
      creatorUserId,
      GroupRole.ADMIN
    );

    return group;
  }

  // =========================
  // ADD MEMBER (by email)
  // =========================
  async addMember(adminUserId: string, groupId: string, email: string) {
    const adminMembership = await this.groupMemberRepository.getMember(
      groupId,
      adminUserId
    );

    if (!adminMembership || adminMembership.leftAt !== null) {
      throw new Error("NOT_GROUP_MEMBER");
    }

    if (adminMembership.role !== GroupRole.ADMIN) {
      throw new Error("NOT_GROUP_ADMIN");
    }

    const user = await this.userRepository.getByEmail(email);
    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    const existingMembership = await this.groupMemberRepository.getMember(
      groupId,
      user.id
    );

    if (existingMembership && existingMembership.leftAt === null) {
      throw new Error("USER_ALREADY_MEMBER");
    }

    return this.groupMemberRepository.addMember(
      groupId,
      user.id,
      GroupRole.MEMBER
    );
  }

  // =========================
  // PROMOTE TO ADMIN (by email)
  // =========================
  async promoteToAdmin(adminUserId: string, groupId: string, email: string) {
    const adminMembership = await this.groupMemberRepository.getMember(
      groupId,
      adminUserId
    );

    if (!adminMembership || adminMembership.leftAt !== null) {
      throw new Error("NOT_GROUP_MEMBER");
    }

    if (adminMembership.role !== GroupRole.ADMIN) {
      throw new Error("NOT_GROUP_ADMIN");
    }

    const user = await this.userRepository.getByEmail(email);
    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    const member = await this.groupMemberRepository.getMember(groupId, user.id);

    if (!member || member.leftAt !== null) {
      throw new Error("USER_NOT_GROUP_MEMBER");
    }

    if (member.role === GroupRole.ADMIN) {
      return member;
    }

    return this.groupMemberRepository.updateRole(
      groupId,
      user.id,
      GroupRole.ADMIN
    );
  }

  // =========================
  // REMOVE MEMBER (by email)
  // =========================
  async removeMember(adminUserId: string, groupId: string, email: string) {
    const adminMembership = await this.groupMemberRepository.getMember(
      groupId,
      adminUserId
    );

    if (!adminMembership || adminMembership.leftAt !== null) {
      throw new Error("NOT_GROUP_MEMBER");
    }

    if (adminMembership.role !== GroupRole.ADMIN) {
      throw new Error("NOT_GROUP_ADMIN");
    }

    const user = await this.userRepository.getByEmail(email);
    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    const member = await this.groupMemberRepository.getMember(groupId, user.id);

    if (!member || member.leftAt !== null) {
      throw new Error("USER_NOT_GROUP_MEMBER");
    }

    if (member.role === GroupRole.ADMIN) {
      const adminCount = await this.groupMemberRepository.countAdmins(groupId);

      if (adminCount <= 1) {
        throw new Error("CANNOT_REMOVE_LAST_ADMIN");
      }
    }

    return this.groupMemberRepository.markLeft(groupId, user.id);
  }

  // =========================
  // LEAVE GROUP (self)
  // =========================
  async leaveGroup(userId: string, groupId: string) {
    const membership = await this.groupMemberRepository.getMember(
      groupId,
      userId
    );

    if (!membership || membership.leftAt !== null) {
      throw new Error("NOT_GROUP_MEMBER");
    }

    if (membership.role === GroupRole.ADMIN) {
      const adminCount = await this.groupMemberRepository.countAdmins(groupId);

      if (adminCount <= 1) {
        throw new Error("CANNOT_LEAVE_LAST_ADMIN");
      }
    }

    return this.groupMemberRepository.markLeft(groupId, userId);
  }

  // =========================
  // GET GROUP
  // =========================
  async getGroup(userId: string, groupId: string) {
    const membership = await this.groupMemberRepository.getMember(
      groupId,
      userId
    );

    if (!membership || membership.leftAt !== null) {
      throw new Error("NOT_GROUP_MEMBER");
    }

    const group = await this.groupRepository.getById(groupId);

    if (!group) {
      throw new Error("GROUP_NOT_FOUND");
    }

    return group;
  }
}
