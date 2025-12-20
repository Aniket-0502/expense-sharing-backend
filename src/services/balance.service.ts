import { ExpenseRepository } from "../repositories/expense.repository";
import { SettlementRepository } from "../repositories/settlement.repository";
import { GroupMemberRepository } from "../repositories/group-member.repository";

type Balance = {
  userId: string;
  netAmount: number; // +ve = to receive, -ve = to pay
};

type SettlementSuggestion = {
  fromUserId: string;
  toUserId: string;
  amount: number;
};

export class BalanceService {
  constructor(
    private expenseRepository: ExpenseRepository,
    private settlementRepository: SettlementRepository,
    private groupMemberRepository: GroupMemberRepository
  ) {}

  async getGroupBalances(
    userId: string,
    groupId: string
  ): Promise<{
    balances: Balance[];
    settlements: SettlementSuggestion[];
  }> {
    // =========================
    // MEMBERSHIP CHECK
    // =========================
    const membership = await this.groupMemberRepository.getMember(
      groupId,
      userId
    );

    if (!membership || membership.leftAt !== null) {
      throw new Error("NOT_GROUP_MEMBER");
    }

    // =========================
    // FETCH DATA
    // =========================
    const expenses = await this.expenseRepository.getExpensesByGroup(groupId);
    const splits = await this.expenseRepository.getExpenseSplitsByGroup(
      groupId
    );
    const settlements = await this.settlementRepository.getSettlementsByGroup(
      groupId
    );

    // =========================
    // INIT BALANCE MAP
    // =========================
    const balanceMap = new Map<string, number>();

    const ensure = (uid: string) => {
      if (!balanceMap.has(uid)) balanceMap.set(uid, 0);
    };

    // =========================
    // APPLY EXPENSES
    // =========================
    // Payer gets credited; split users get debited
    for (const expense of expenses) {
      ensure(expense.payerId);
      balanceMap.set(
        expense.payerId,
        balanceMap.get(expense.payerId)! + expense.amount
      );
    }

    for (const split of splits) {
      ensure(split.userId);
      balanceMap.set(
        split.userId,
        balanceMap.get(split.userId)! - split.amount
      );
    }

    // =========================
    // APPLY SETTLEMENTS
    // =========================
    // fromUser gets credited; toUser gets debited
    for (const s of settlements) {
      ensure(s.fromUserId);
      ensure(s.toUserId);

      balanceMap.set(s.fromUserId, balanceMap.get(s.fromUserId)! + s.amount);
      balanceMap.set(s.toUserId, balanceMap.get(s.toUserId)! - s.amount);
    }

    // =========================
    // PARTICIPATION MAP
    // =========================
    // user -> set of users they shared an expense with
    const participation = new Map<string, Set<string>>();

    const addEdge = (a: string, b: string) => {
      if (!participation.has(a)) participation.set(a, new Set());
      participation.get(a)!.add(b);
    };

    // For each expense, connecting all participants with each other
    const splitsByExpense = new Map<string, string[]>();
    for (const split of splits) {
      if (!splitsByExpense.has(split.expenseId)) {
        splitsByExpense.set(split.expenseId, []);
      }
      splitsByExpense.get(split.expenseId)!.push(split.userId);
    }

    for (const users of splitsByExpense.values()) {
      for (let i = 0; i < users.length; i++) {
        for (let j = i + 1; j < users.length; j++) {
          addEdge(users[i], users[j]);
          addEdge(users[j], users[i]);
        }
      }
    }

    // =========================
    // PREPARE BALANCES
    // =========================
    const balances: Balance[] = Array.from(balanceMap.entries()).map(
      ([uid, amt]) => ({
        userId: uid,
        netAmount: amt,
      })
    );

    const creditors = balances
      .filter((b) => b.netAmount > 0)
      .map((b) => ({ ...b }));

    const debtors = balances
      .filter((b) => b.netAmount < 0)
      .map((b) => ({ ...b }));

    // =========================
    // SETTLEMENT SUGGESTIONS
    // =========================
    const suggestions: SettlementSuggestion[] = [];

    for (const debtor of debtors) {
      let remainingDebt = -debtor.netAmount;

      for (const creditor of creditors) {
        if (remainingDebt === 0) break;
        if (creditor.netAmount === 0) continue;

        // Participation-aware check
        const allowed =
          participation.get(debtor.userId)?.has(creditor.userId) ?? false;

        if (!allowed) continue;

        const pay = Math.min(remainingDebt, creditor.netAmount);

        if (pay > 0) {
          suggestions.push({
            fromUserId: debtor.userId,
            toUserId: creditor.userId,
            amount: pay,
          });

          remainingDebt -= pay;
          creditor.netAmount -= pay;
        }
      }
    }

    return {
      balances,
      settlements: suggestions,
    };
  }
}
