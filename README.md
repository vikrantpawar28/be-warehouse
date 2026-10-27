# Warehouse Management System - Backend API

Robust backend REST API service for Warehouse Management built with Node.js, Express, Sequelize ORM, and PostgreSQL.

## Features

- **User Management**: Comprehensive user lifecycle management, role assignments, region/hub associations, and status toggles.
- **Granular RBAC (Role-Based Access Control)**:
  - Dynamic Role definitions.
  - Modular Permissions and Permission Bundles.
  - Route-level and action-level authorization checks.
- **Organization Hierarchy**:
  - **Regions**: Geographical distribution and oversight.
  - **Hubs**: Operational warehouse facilities mapped to regions.
- **Audit Logging**: Comprehensive action audit logging tracking entities, operations, timestamps, and client IP addresses.
- **Security & Performance**:
  - JWT-based authentication with refresh token support.
  - Bcrypt password hashing.
  - Express Rate Limiting & Helmet headers protection.
  - PostgreSQL pooling via Sequelize.

---

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Sequelize v6
- **Authentication**: JSON Web Tokens (jsonwebtoken), Bcrypt
- **File Uploads**: Multer, AWS S3 Client

---

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- PostgreSQL database instance

### Installation

1. Clone repository:
   ```bash
   git clone https://github.com/vikrantpawar28/be-warehouse.git
   cd be-warehouse
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Copy `.env.example` to `.env` and update credentials:
   ```bash
   cp .env.example .env
   ```

4. Seed Initial Permissions & Roles:
   ```bash
   npm run seed
   ```

5. Start the Server:
   - Development mode (with nodemon):
     ```bash
     npm run dev
     ```
   - Production mode:
     ```bash
     npm start
     ```

---

## Key API Modules

| Endpoint Route | Description |
|---|---|
| `/users` | User management (CRUD, status, assign region/hub) |
| `/roles` | Role definitions and permission assignments |
| `/regions` | Geographical regions and primary hubs |
| `/hubs` | Warehouse operational hubs |
| `/docs` | Document uploads and file handling |

---

## License

ISC
