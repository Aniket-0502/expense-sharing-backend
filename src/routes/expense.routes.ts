import { Router, Response } from "express";
import { ExpenseService } from "../services/expense.service";
import {
  authMiddleware,
  AuthenticatedRequest,
} from "../middlewares/auth.middleware";

const router = Router();

export function createExpenseRoutes(expenseService: ExpenseService) {
  // =========================
  // ADD EXPENSE
  // =========================
  router.post(
    "/groups/:groupId/expenses",
    authMiddleware,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { groupId } = req.params;
        const actorUserId = req.userId!;
        const { description, amount, payerEmail, splitType, splits } = req.body;

        const expense = await expenseService.addExpense(actorUserId, groupId, {
          description,
          amount,
          payerEmail,
          splitType,
          splits, // [{ email, value }]
        });

        res.status(201).json(expense);
      } catch (err: any) {
        mapExpenseErrors(err, res);
      }
    }
  );

  return router;
}

// =========================
// ERROR MAPPER
// =========================
function mapExpenseErrors(err: Error, res: Response) {
  switch (err.message) {
    case "NOT_GROUP_MEMBER":
    case "PAYER_NOT_GROUP_MEMBER":
      return res.status(403).json({ error: err.message });

    case "INVALID_AMOUNT":
    case "INVALID_SPLIT":
    case "INVALID_SPLIT_SUM":
    case "INVALID_PERCENTAGE_SUM":
    case "ZERO_SPLIT_NOT_ALLOWED":
    case "DUPLICATE_SPLIT_USER":
    case "PAYER_MUST_BE_PARTICIPANT":
    case "INVALID_SPLIT_USER":
    case "PAYER_NOT_FOUND":
      return res.status(400).json({ error: err.message });

    default:
      return res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
}
