import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "AUTH_HEADER_MISSING" });
  }

  const parts = authHeader.split(" ");

  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({ error: "INVALID_AUTH_HEADER" });
  }

  const token = parts[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId?: string;
    };

    if (!payload.userId) {
      return res.status(401).json({ error: "INVALID_TOKEN_PAYLOAD" });
    }

    req.userId = payload.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: "INVALID_OR_EXPIRED_TOKEN" });
  }
}
