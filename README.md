# HackSynapse

A monorepo containing the full-stack application with **npm workspaces**.

## Structure

```
hacksynapse/
├── web/          # Frontend — Vite + React + TailwindCSS
├── backend/      # Backend  — AdonisJS 6 API
├── package.json  # Root workspace config
└── README.md
```

## Prerequisites

- **Node.js** >= 18
- **npm** >= 7 (for workspace support)
- **PostgreSQL** (for backend)

## Getting Started

### 1. Install all dependencies (from root)

```bash
npm install
```

This installs dependencies for **both** `web` and `backend` via npm workspaces — a single `node_modules` is hoisted at the root where possible.

### 2. Set up environment variables

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your database credentials, API keys, etc.

# Web
cp web/.env.example web/.env   # if applicable
```

### 3. Run database migrations

```bash
npm run migrate
```

### 4. Start development

```bash
# Run both web and backend simultaneously
npm run dev

# Or run them individually
npm run dev:web       # Starts Vite dev server
npm run dev:backend   # Starts AdonisJS dev server
```

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start both web & backend in dev mode |
| `npm run dev:web` | Start only the frontend |
| `npm run dev:backend` | Start only the backend |
| `npm run build` | Build both packages |
| `npm run build:web` | Build only the frontend |
| `npm run build:backend` | Build only the backend |
| `npm run lint` | Lint both packages |
| `npm run test` | Run backend tests |
| `npm run migrate` | Run database migrations |
| `npm run migrate:fresh` | Fresh database migration |
| `npm run seed` | Seed the database |
| `npm run typecheck` | Type-check all workspaces |
| `npm run clean` | Remove all node_modules |

## Working with Workspaces

Run any script in a specific workspace:

```bash
# Pattern
npm run <script> --workspace=<web|backend>

# Examples
npm run dev --workspace=web
npm run build --workspace=backend
npm install axios --workspace=web     # Add a dep to web only
```
