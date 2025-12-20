import { Router, Response } from "express";
import {
  authMiddleware,
  AuthenticatedRequest,
} from "../middlewares/auth.middleware";
import { BalanceService } from "../services/balance.service";
import { UserRepository } from "../repositories/user.repository";

const router = Router();

export function createBalanceRoutes(
  balanceService: BalanceService,
  userRepository: UserRepository
) {
  // =========================
  // GET GROUP BALANCES
  // =========================
  router.get(
    "/groups/:groupId/balances",
    authMiddleware,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { groupId } = req.params;
        const userId = req.userId!;

        const result = await balanceService.getGroupBalances(userId, groupId);

        // =========================
        // COLLECT USER IDS
        // =========================
        const userIds = new Set<string>();

        result.balances.forEach((b) => userIds.add(b.userId));
        result.settlements.forEach((s) => {
          userIds.add(s.fromUserId);
          userIds.add(s.toUserId);
        });

        // =========================
        // FETCH USERS
        // =========================
        const users = await userRepository.getByIds(Array.from(userIds));

        const idToEmail = new Map(users.map((u) => [u.id, u.email]));

        // =========================
        // MAP RESPONSE
        // =========================
        const response = {
          balances: result.balances.map((b) => ({
            email: idToEmail.get(b.userId),
            netAmount: b.netAmount,
          })),
          settlements: result.settlements.map((s) => ({
            from: idToEmail.get(s.fromUserId),
            to: idToEmail.get(s.toUserId),
            amount: s.amount,
          })),
        };

        res.json(response);
      } catch (err: any) {
        mapBalanceErrors(err, res);
      }
    }
  );

  return router;
}

// =========================
// ERROR MAPPER
// =========================
function mapBalanceErrors(err: Error, res: Response) {
  switch (err.message) {
    case "NOT_GROUP_MEMBER":
      return res.status(403).json({ error: err.message });

    default:
      return res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
}
