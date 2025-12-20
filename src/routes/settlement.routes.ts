import { Router, Response } from "express";
import {
  authMiddleware,
  AuthenticatedRequest,
} from "../middlewares/auth.middleware";
import { SettlementService } from "../services/settlement.service";

const router = Router();

export function createSettlementRoutes(settlementService: SettlementService) {
  // =========================
  // ADD SETTLEMENT
  // =========================
  router.post(
    "/groups/:groupId/settlements",
    authMiddleware,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { groupId } = req.params;
        const actorUserId = req.userId!;
        const { fromEmail, toEmail, amount } = req.body;

        const settlement = await settlementService.addSettlement(
          actorUserId,
          groupId,
          {
            fromEmail,
            toEmail,
            amount,
          }
        );

        res.status(201).json(settlement);
      } catch (err: any) {
        mapSettlementErrors(err, res);
      }
    }
  );

  return router;
}

// =========================
// ERROR MAPPER
// =========================
function mapSettlementErrors(err: Error, res: Response) {
  switch (err.message) {
    case "NOT_GROUP_MEMBER":
      return res.status(403).json({ error: err.message });

    case "INVALID_SETTLEMENT_AMOUNT":
    case "INVALID_SETTLEMENT_USERS":
    case "INVALID_SETTLEMENT_DIRECTION":
    case "AMOUNT_EXCEEDS_OUTSTANDING":
    case "NO_SHARED_EXPENSE_HISTORY":
      return res.status(400).json({ error: err.message });

    default:
      return res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
}
