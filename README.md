# Bank Referral System 🚀

A full-stack referral tracking system with a React (Vite) frontend and a Node.js and Express backend backed by PostgreSQL. It demonstrates an introducer and beneficiary referral rule and exposes simple APIs to create accounts and view assignments.

## Architecture 🧱

- Frontend: React with Vite ⚛️
- Backend: Node.js with Express 🧰
- Database: PostgreSQL 🐘
- Communication: REST over HTTP with CORS enabled 🔗

Data flow in development: frontend on port 5173 communicates with backend on port 5000, which connects to PostgreSQL.

## Tech Stack 🧑‍💻

- Frontend ⚛️
  - Framework: React (19.x)
  - Build tool: Vite (7.x)
  - Linting: ESLint (9.x) with React Hooks and React Refresh plugins
- Backend 🖥️
  - Runtime: Node.js (CommonJS)
  - Web framework: Express (5.x)
  - Middleware: CORS, express.json (body parsing)
  - Database client: pg (8.x)
  - Dev tooling: nodemon (3.x)
- Database 🗄️
  - PostgreSQL
- Tooling 🧰
  - Package manager: npm

## Repository Structure 🗂️

Top-level folders include backend and frontend directories. The backend contains controllers, routes, a database configuration file, and the Express server. The frontend contains the React application source, public assets, and Vite configuration.

## Referral Logic (Accounts) 🔁

When creating an account via the backend API:

- Each account has the fields: id, introducer_id, and beneficiary_id 👤
- The beneficiary assignment depends on the introducer's referral count at the time of creation:
  - If the introducer's total referrals including the new one is an odd number, beneficiary_id equals introducer_id ➕
  - If it is an even number, beneficiary_id is set to the beneficiary of the introducer's introducer when available; otherwise it remains null ➗

## API Endpoints 🔌

- Health ❤️

  - GET /health returns a simple status payload indicating the API is running

- Accounts 📇

  - GET /accounts returns all accounts with account_id, introducer_id, and beneficiary_id, ordered by id ascending
  - POST /addAccount creates a single account. Expected body includes account_id and introducer_id, both numeric
  - POST /addAccountsBulk creates multiple accounts in a single transaction. Expected body is a non-empty array of items, each with account_id and introducer_id, both numeric

- Referrals (sample route) 🔁
  - GET /api/referrals returns rows from a referrals table if it exists in the database

## Database Setup 🧩

Ensure PostgreSQL is installed, running, and that a database (for example, bankdb) is created. On backend startup, the server ensures there is an accounts table with columns id, introducer_id, and beneficiary_id. If you wish to use the sample referrals route, create a referrals table with at least id, referrer_id, referred_id, and a timestamp column.

## Configuration ⚙️

Database connection settings are located in backend/db.js. Update the user, host, database name, password, and port to match your local environment. For production, prefer environment variables and avoid committing secrets. Typical variables include PGUSER, PGPASSWORD, PGHOST, PGDATABASE, and PGPORT.

## Getting Started 🏁

Prerequisites ✅

- Node.js 18 or newer and npm
- PostgreSQL 13 or newer

Steps 📋

1. Backend 🖥️

- Navigate to the backend directory
- Install dependencies with npm install
- Start the development server with npm start (listens on port 5000 by default)

2. Frontend ⚛️

- Navigate to the frontend directory
- Install dependencies with npm install
- Start the development server with npm run dev (serves on port 5173 by default)

Ensure both servers are running so the frontend can communicate with the backend via CORS.

## Scripts 🧾

- Backend

  - npm start: runs the Express server with nodemon on port 5000

- Frontend
  - npm run dev: starts the Vite development server
  - npm run build: generates a production build
  - npm run preview: previews the production build
  - npm run lint: runs ESLint

## Notes and Best Practices 📝

- Do not commit real database credentials. Use environment variables or a secret manager for sensitive values
- Input validation is enforced for account creation; account_id and introducer_id must be numbers
- Bulk account creation is executed within a transaction to help maintain consistency
- Adjust ports and CORS settings as needed for deployment behind proxies or different environments

## Troubleshooting 🧯

- If the backend cannot connect to PostgreSQL, verify credentials, host, port, and that the database exists
- If port 5000 is in use, stop the process occupying it or change the backend port
- If the frontend cannot reach the backend in development, confirm both servers are running and that CORS and URLs are configured correctly

## License ⚖️

This project is provided as-is. Add or update the license information if you intend to distribute the project.
