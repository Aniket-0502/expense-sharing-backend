import express from "express";
import cors from "cors";
import "dotenv/config";
import { prisma } from "./config/prisma";

// Repositories
import { UserRepository } from "./repositories/user.repository";
import { GroupRepository } from "./repositories/group.repository";
import { GroupMemberRepository } from "./repositories/group-member.repository";
import { ExpenseRepository } from "./repositories/expense.repository";
import { SettlementRepository } from "./repositories/settlement.repository";

// Services
import { GroupService } from "./services/group.service";
import { ExpenseService } from "./services/expense.service";
import { BalanceService } from "./services/balance.service";
import { SettlementService } from "./services/settlement.service";

// Routes
import { createGroupRoutes } from "./routes/group.routes";
import { createExpenseRoutes } from "./routes/expense.routes";
import { createBalanceRoutes } from "./routes/balance.routes";
import { createSettlementRoutes } from "./routes/settlement.routes";

const app = express();

// =========================
// CONFIG
// =========================
const PORT = process.env.PORT || 3000;
const API_BASE_PATH = "/api/v1";

// =========================
// GLOBAL MIDDLEWARE
// =========================
app.use(cors());
app.use(express.json());

// =========================
// REPOSITORIES
// =========================
const userRepository = new UserRepository();
const groupRepository = new GroupRepository();
const groupMemberRepository = new GroupMemberRepository();
const expenseRepository = new ExpenseRepository();
const settlementRepository = new SettlementRepository();

// =========================
// SERVICES
// =========================
const groupService = new GroupService(
  groupRepository,
  groupMemberRepository,
  userRepository
);

const expenseService = new ExpenseService(
  expenseRepository,
  groupMemberRepository,
  userRepository
);

const balanceService = new BalanceService(
  expenseRepository,
  settlementRepository,
  groupMemberRepository
);

const settlementService = new SettlementService(
  groupMemberRepository,
  settlementRepository,
  expenseRepository,
  userRepository
);

// =========================
// ROUTE MOUNTING
// =========================
app.use(API_BASE_PATH, createGroupRoutes(groupService));
app.use(API_BASE_PATH, createExpenseRoutes(expenseService));
app.use(API_BASE_PATH, createBalanceRoutes(balanceService, userRepository));

app.use(API_BASE_PATH, createSettlementRoutes(settlementService));

// =========================
// HEALTH CHECK
// =========================
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// =========================
// SERVER START
// =========================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API base path: ${API_BASE_PATH}`);
});

// =========================
// GRACEFUL SHUTDOWN
// =========================
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
