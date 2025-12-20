import { SplitType } from "@prisma/client";
import { ExpenseRepository } from "../repositories/expense.repository";
import { GroupMemberRepository } from "../repositories/group-member.repository";
import { UserRepository } from "../repositories/user.repository";

type SplitInput = {
  email: string;
  value: number; // amount or percentage depending on split type
};

export class ExpenseService {
  constructor(
    private expenseRepository: ExpenseRepository,
    private groupMemberRepository: GroupMemberRepository,
    private userRepository: UserRepository
  ) {}

  async addExpense(
    actorUserId: string,
    groupId: string,
    input: {
      description: string;
      amount: number;
      payerEmail: string;
      splitType: SplitType;
      splits: SplitInput[];
    }
  ) {
    const { description, amount, payerEmail, splitType, splits } = input;

    // =========================
    // BASIC VALIDATIONS
    // =========================
    if (amount <= 0) {
      throw new Error("INVALID_AMOUNT");
    }

    if (!splits || splits.length === 0) {
      throw new Error("INVALID_SPLIT");
    }

    // =========================
    // ACTOR MEMBERSHIP CHECK
    // =========================
    const actorMembership = await this.groupMemberRepository.getMember(
      groupId,
      actorUserId
    );

    if (!actorMembership || actorMembership.leftAt !== null) {
      throw new Error("NOT_GROUP_MEMBER");
    }

    // =========================
    // RESOLVE PAYER
    // =========================
    const payer = await this.userRepository.getByEmail(payerEmail);
    if (!payer) {
      throw new Error("PAYER_NOT_FOUND");
    }

    const payerMembership = await this.groupMemberRepository.getMember(
      groupId,
      payer.id
    );

    if (!payerMembership || payerMembership.leftAt !== null) {
      throw new Error("PAYER_NOT_GROUP_MEMBER");
    }

    // =========================
    // RESOLVE & VALIDATE SPLIT USERS
    // =========================
    const seenUserIds = new Set<string>();
    const resolvedSplits: { userId: string; value: number }[] = [];

    for (const split of splits) {
      if (split.value <= 0) {
        throw new Error("ZERO_SPLIT_NOT_ALLOWED");
      }

      const user = await this.userRepository.getByEmail(split.email);
      if (!user) {
        throw new Error("INVALID_SPLIT_USER");
      }

      if (seenUserIds.has(user.id)) {
        throw new Error("DUPLICATE_SPLIT_USER");
      }

      const member = await this.groupMemberRepository.getMember(
        groupId,
        user.id
      );

      if (!member || member.leftAt !== null) {
        throw new Error("INVALID_SPLIT_USER");
      }

      seenUserIds.add(user.id);
      resolvedSplits.push({ userId: user.id, value: split.value });
    }

    if (!seenUserIds.has(payer.id)) {
      throw new Error("PAYER_MUST_BE_PARTICIPANT");
    }

    // =========================
    // NORMALIZE SPLITS
    // =========================
    let normalizedSplits: { userId: string; amount: number }[] = [];

    if (splitType === SplitType.EQUAL) {
      const perUser = Math.floor(amount / resolvedSplits.length);
      const remainder = amount - perUser * resolvedSplits.length;

      normalizedSplits = resolvedSplits.map((s) => ({
        userId: s.userId,
        amount: s.userId === payer.id ? perUser + remainder : perUser,
      }));
    }

    if (splitType === SplitType.EXACT) {
      const total = resolvedSplits.reduce((sum, s) => sum + s.value, 0);

      if (total !== amount) {
        throw new Error("INVALID_SPLIT_SUM");
      }

      normalizedSplits = resolvedSplits.map((s) => ({
        userId: s.userId,
        amount: s.value,
      }));
    }

    if (splitType === SplitType.PERCENTAGE) {
      const percentageSum = resolvedSplits.reduce((sum, s) => sum + s.value, 0);

      if (percentageSum !== 100) {
        throw new Error("INVALID_PERCENTAGE_SUM");
      }

      let allocated = 0;

      normalizedSplits = resolvedSplits.map((s) => {
        const splitAmount = Math.floor((amount * s.value) / 100);
        allocated += splitAmount;

        return {
          userId: s.userId,
          amount: splitAmount,
        };
      });

      const remainder = amount - allocated;

      normalizedSplits = normalizedSplits.map((s) =>
        s.userId === payer.id ? { ...s, amount: s.amount + remainder } : s
      );
    }

    // =========================
    // FINAL SAFETY CHECK
    // =========================
    const finalSum = normalizedSplits.reduce((sum, s) => sum + s.amount, 0);

    if (finalSum !== amount) {
      throw new Error("INTERNAL_SPLIT_ERROR");
    }

    // =========================
    // PERSIST EXPENSE
    // =========================
    return this.expenseRepository.createExpense(
      {
        groupId,
        payerId: payer.id,
        description,
        amount,
        splitType,
      },
      normalizedSplits
    );
  }
}
