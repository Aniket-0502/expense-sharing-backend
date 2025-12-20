import { GroupMemberRepository } from "../repositories/group-member.repository";
import { SettlementRepository } from "../repositories/settlement.repository";
import { ExpenseRepository } from "../repositories/expense.repository";
import { UserRepository } from "../repositories/user.repository";

type AddSettlementInput = {
  fromEmail: string;
  toEmail: string;
  amount: number;
};

export class SettlementService {
  constructor(
    private groupMemberRepository: GroupMemberRepository,
    private settlementRepository: SettlementRepository,
    private expenseRepository: ExpenseRepository,
    private userRepository: UserRepository
  ) {}

  async addSettlement(
    actorUserId: string,
    groupId: string,
    input: AddSettlementInput
  ) {
    const { fromEmail, toEmail, amount } = input;

    // =========================
    // BASIC VALIDATIONS
    // =========================
    if (amount <= 0) {
      throw new Error("INVALID_SETTLEMENT_AMOUNT");
    }

    if (fromEmail === toEmail) {
      throw new Error("INVALID_SETTLEMENT_USERS");
    }

    // =========================
    // ACTOR MEMBERSHIP CHECK
    // =========================
    const actor = await this.groupMemberRepository.getMember(
      groupId,
      actorUserId
    );
    if (!actor || actor.leftAt !== null) {
      throw new Error("NOT_GROUP_MEMBER");
    }

    // =========================
    // RESOLVE USERS BY EMAIL
    // =========================
    const fromUser = await this.userRepository.getByEmail(fromEmail);
    const toUser = await this.userRepository.getByEmail(toEmail);

    if (!fromUser || !toUser) {
      throw new Error("INVALID_SETTLEMENT_USERS");
    }

    if (fromUser.id === toUser.id) {
      throw new Error("INVALID_SETTLEMENT_USERS");
    }

    // =========================
    // MEMBERSHIP CHECKS
    // =========================
    const fromMember = await this.groupMemberRepository.getMember(
      groupId,
      fromUser.id
    );
    const toMember = await this.groupMemberRepository.getMember(
      groupId,
      toUser.id
    );

    if (
      !fromMember ||
      fromMember.leftAt !== null ||
      !toMember ||
      toMember.leftAt !== null
    ) {
      throw new Error("INVALID_SETTLEMENT_USERS");
    }

    // =========================
    // FETCH DATA FOR DERIVATION
    // =========================
    const expenses = await this.expenseRepository.getExpensesByGroup(groupId);
    const splits = await this.expenseRepository.getExpenseSplitsByGroup(
      groupId
    );
    const settlements = await this.settlementRepository.getSettlementsByGroup(
      groupId
    );

    // =========================
    // DERIVE NET BALANCES
    // =========================
    const balance = new Map<string, number>();
    const ensure = (u: string) => {
      if (!balance.has(u)) balance.set(u, 0);
    };

    for (const e of expenses) {
      ensure(e.payerId);
      balance.set(e.payerId, balance.get(e.payerId)! + e.amount);
    }
    for (const s of splits) {
      ensure(s.userId);
      balance.set(s.userId, balance.get(s.userId)! - s.amount);
    }
    for (const s of settlements) {
      ensure(s.fromUserId);
      ensure(s.toUserId);
      balance.set(s.fromUserId, balance.get(s.fromUserId)! + s.amount);
      balance.set(s.toUserId, balance.get(s.toUserId)! - s.amount);
    }

    const fromNet = balance.get(fromUser.id) ?? 0;
    const toNet = balance.get(toUser.id) ?? 0;

    // from must owe, to must be owed
    if (fromNet >= 0 || toNet <= 0) {
      throw new Error("INVALID_SETTLEMENT_DIRECTION");
    }

    // =========================
    // PARTICIPATION-AWARE CHECK
    // =========================
    const participantsByExpense = new Map<string, string[]>();
    for (const s of splits) {
      if (!participantsByExpense.has(s.expenseId)) {
        participantsByExpense.set(s.expenseId, []);
      }
      participantsByExpense.get(s.expenseId)!.push(s.userId);
    }

    const participation = new Map<string, Set<string>>();
    const addEdge = (a: string, b: string) => {
      if (!participation.has(a)) participation.set(a, new Set());
      participation.get(a)!.add(b);
    };

    for (const users of participantsByExpense.values()) {
      for (let i = 0; i < users.length; i++) {
        for (let j = i + 1; j < users.length; j++) {
          addEdge(users[i], users[j]);
          addEdge(users[j], users[i]);
        }
      }
    }

    const allowed = participation.get(fromUser.id)?.has(toUser.id) ?? false;

    if (!allowed) {
      throw new Error("NO_SHARED_EXPENSE_HISTORY");
    }

    // =========================
    // OUTSTANDING CHECK
    // =========================
    const outstanding = Math.min(-fromNet, toNet);
    if (amount > outstanding) {
      throw new Error("AMOUNT_EXCEEDS_OUTSTANDING");
    }

    // =========================
    // PERSIST SETTLEMENT
    // =========================
    return this.settlementRepository.createSettlement({
      groupId,
      fromUserId: fromUser.id,
      toUserId: toUser.id,
      amount,
    });
  }
}
