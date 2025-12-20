import { Router, Response } from "express";
import { GroupService } from "../services/group.service";
import {
  authMiddleware,
  AuthenticatedRequest,
} from "../middlewares/auth.middleware";

const router = Router();

export function createGroupRoutes(groupService: GroupService) {
  // =========================
  // CREATE GROUP
  // =========================
  router.post(
    "/groups",
    authMiddleware,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { name } = req.body;
        const userId = req.userId!;

        const group = await groupService.createGroup(userId, name);
        res.status(201).json(group);
      } catch (err: any) {
        res.status(400).json({ error: err.message });
      }
    }
  );

  // =========================
  // GET GROUP
  // =========================
  router.get(
    "/groups/:groupId",
    authMiddleware,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { groupId } = req.params;
        const userId = req.userId!;

        const group = await groupService.getGroup(userId, groupId);
        res.json(group);
      } catch (err: any) {
        mapGroupErrors(err, res);
      }
    }
  );

  // =========================
  // ADD MEMBER (by email)
  // =========================
  router.post(
    "/groups/:groupId/members",
    authMiddleware,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { groupId } = req.params;
        const { email } = req.body;
        const adminUserId = req.userId!;

        const member = await groupService.addMember(
          adminUserId,
          groupId,
          email
        );

        res.status(201).json(member);
      } catch (err: any) {
        mapGroupErrors(err, res);
      }
    }
  );

  // =========================
  // PROMOTE TO ADMIN (by email)
  // =========================
  router.post(
    "/groups/:groupId/members/promote",
    authMiddleware,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { groupId } = req.params;
        const { email } = req.body;
        const adminUserId = req.userId!;

        const updated = await groupService.promoteToAdmin(
          adminUserId,
          groupId,
          email
        );

        res.json(updated);
      } catch (err: any) {
        mapGroupErrors(err, res);
      }
    }
  );

  // =========================
  // REMOVE MEMBER (by email)
  // =========================
  router.delete(
    "/groups/:groupId/members",
    authMiddleware,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { groupId } = req.params;
        const { email } = req.body;
        const adminUserId = req.userId!;

        const result = await groupService.removeMember(
          adminUserId,
          groupId,
          email
        );

        res.json(result);
      } catch (err: any) {
        mapGroupErrors(err, res);
      }
    }
  );

  // =========================
  // LEAVE GROUP (self)
  // =========================
  router.post(
    "/groups/:groupId/leave",
    authMiddleware,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { groupId } = req.params;
        const userId = req.userId!;

        const result = await groupService.leaveGroup(userId, groupId);
        res.json(result);
      } catch (err: any) {
        mapGroupErrors(err, res);
      }
    }
  );

  return router;
}

// =========================
// ERROR MAPPER
// =========================
function mapGroupErrors(err: Error, res: Response) {
  switch (err.message) {
    case "NOT_GROUP_MEMBER":
    case "NOT_GROUP_ADMIN":
      return res.status(403).json({ error: err.message });

    case "USER_NOT_FOUND":
    case "GROUP_NOT_FOUND":
      return res.status(404).json({ error: err.message });

    case "USER_ALREADY_MEMBER":
    case "CANNOT_REMOVE_LAST_ADMIN":
    case "CANNOT_LEAVE_LAST_ADMIN":
      return res.status(400).json({ error: err.message });

    default:
      return res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
}
