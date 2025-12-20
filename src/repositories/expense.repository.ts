import { prisma } from "../config/prisma";
import { Expense, ExpenseSplit, SplitType } from "@prisma/client";

export class ExpenseRepository {
  async createExpense(
    data: {
      groupId: string;
      payerId: string;
      description: string;
      amount: number;
      splitType: SplitType;
    },
    splits: {
      userId: string;
      amount: number;
    }[]
  ): Promise<Expense> {
    return prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          groupId: data.groupId,
          payerId: data.payerId,
          description: data.description,
          amount: data.amount,
          splitType: data.splitType,
        },
      });

      await tx.expenseSplit.createMany({
        data: splits.map((split) => ({
          expenseId: expense.id,
          userId: split.userId,
          amount: split.amount,
        })),
      });

      return expense;
    });
  }

  async getExpensesByGroup(groupId: string): Promise<Expense[]> {
    return prisma.expense.findMany({
      where: {
        groupId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  async getExpenseSplitsByGroup(groupId: string): Promise<ExpenseSplit[]> {
    return prisma.expenseSplit.findMany({
      where: {
        expense: {
          groupId,
        },
      },
    });
  }
}
