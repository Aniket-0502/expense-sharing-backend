# Expense Sharing Backend

An expense sharing platform backend inspired by Splitwise, built with modern web technologies and best practices.

## 🎯 Overview

This backend system provides a comprehensive solution for managing shared expenses among groups of users. It features robust group management, flexible expense splitting, accurate balance calculations, and intelligent settlement suggestions.

## ✨ Key Features

### 👥 User Management

- Email-based user identification for intuitive API interactions
- Secure JWT-based authentication
- Internal UUID management for data integrity

### 🏘️ Group Management

- Create and manage expense groups
- Multiple administrators per group support
- Role-based access control (Admin/Member)
- Member invitation and removal
- Smart admin constraints (prevents leaving if last admin)

### 💰 Expense Tracking

- Add expenses with flexible split options:
  - **Equal**: Split evenly among participants
  - **Exact**: Specify exact amounts per person
  - **Percentage**: Split by percentage distribution
- Automatic validation of expense participants
- Payer verification and participation enforcement

### 📊 Balance & Settlement

- Real-time balance calculations per user
- Positive balance = amount to receive
- Negative balance = amount to pay
- Intelligent settlement suggestions based on shared expense history
- Participation-aware settlements (only between users who shared expenses)

### 🔒 Security & Authorization

- JWT-based authentication on all endpoints
- Group membership verification
- Admin privilege enforcement
- Prevents unauthorized access to group data

## 🛠️ Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma 7
- **Authentication**: JWT
- **Containerization**: Docker
- **API Testing**: Postman

## 📋 API Reference

### Group Endpoints

| Method   | Endpoint                           | Access        | Description              |
| -------- | ---------------------------------- | ------------- | ------------------------ |
| `POST`   | `/groups`                          | Authenticated | Create a new group       |
| `GET`    | `/groups/:groupId`                 | Member        | Get group details        |
| `POST`   | `/groups/:groupId/members`         | Admin         | Add member by email      |
| `POST`   | `/groups/:groupId/members/promote` | Admin         | Promote member to admin  |
| `DELETE` | `/groups/:groupId/members`         | Admin         | Remove member from group |
| `POST`   | `/groups/:groupId/leave`           | Member        | Leave group              |

### Expense Endpoints

| Method | Endpoint                    | Access | Description       |
| ------ | --------------------------- | ------ | ----------------- |
| `POST` | `/groups/:groupId/expenses` | Member | Add a new expense |

**Example Request Body:**

```json
{
  "description": "Team Dinner",
  "amount": 3000,
  "payerEmail": "alice@example.com",
  "splitType": "EQUAL",
  "splits": [
    { "email": "alice@example.com", "value": 1 },
    { "email": "bob@example.com", "value": 1 },
    { "email": "charlie@example.com", "value": 1 }
  ]
}
```

### Balance Endpoints

| Method | Endpoint                    | Access | Description                             |
| ------ | --------------------------- | ------ | --------------------------------------- |
| `GET`  | `/groups/:groupId/balances` | Member | Get balances and settlement suggestions |

### Settlement Endpoints

| Method | Endpoint                       | Access | Description      |
| ------ | ------------------------------ | ------ | ---------------- |
| `POST` | `/groups/:groupId/settlements` | Member | Record a payment |

**Example Request Body:**

```json
{
  "fromEmail": "bob@example.com",
  "toEmail": "alice@example.com",
  "amount": 1500
}
```

## 🗄️ Database Schema

The database is designed with data integrity and historical accuracy in mind:

- **Users**: Core user information with email-based identification
- **Groups**: Expense sharing groups
- **GroupMembers**: Membership records with roles and soft deletes
- **Expenses**: Expense records with split type
- **ExpenseSplits**: Individual split allocations
- **Settlements**: Payment records between users

Key design decisions:

- Soft deletes (`leftAt` timestamp) preserve historical data
- UUID primary keys for security
- Proper indexing for query optimization
- Referential integrity with foreign key constraints

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Docker & Docker Compose
- npm or yarn

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd expense-sharing-backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env` file in the root directory:

   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/expense_sharing"
   JWT_SECRET="your_secure_jwt_secret_here"
   ```

4. **Start PostgreSQL with Docker**

   ```bash
   docker-compose up -d
   ```

5. **Run database migrations**

   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3000`

### Using Prisma Studio (Optional)

To view and manage your database visually:

```bash
npx prisma studio
```

## 🏗️ Architecture & Design

### Project Structure

```
├── src/
│   ├── config/          # Configuration files (Prisma, etc.)
│   ├── middlewares/     # Auth & validation middleware
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic layer
│   ├── repositories/    # Database access layer
│   └── types/           # TypeScript type definitions
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── migrations/      # Database migrations
└── docker-compose.yml   # Docker configuration
```

### Design Principles

1. **Email-Based APIs**: User-friendly interface hiding internal UUIDs
2. **Service/Repository Pattern**: Clean separation of concerns
3. **Strong Validation**: Prevents inconsistent financial states
4. **Participation-Aware Logic**: Settlements only between users who shared expenses
5. **Soft Deletes**: Preserves historical data integrity
6. **Authorization First**: Every operation validates membership and permissions

## 🔮 Future Enhancements

- [ ] Pagination for expenses and settlements
- [ ] Expense editing and deletion with audit trail
- [ ] Group expense summaries and reports
- [ ] Real-time notifications
- [ ] Idempotency keys for settlements
- [ ] Comprehensive E2E test suite
- [ ] Rate limiting and request throttling
- [ ] Export functionality (CSV, PDF)
- [ ] Multi-currency support

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---
