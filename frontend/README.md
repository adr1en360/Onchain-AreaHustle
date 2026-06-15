# AreaHustle Frontend

A mobile-first, high-performance web application built with **TanStack Start**, **React**, and **TypeScript**, serving as the user portal for the AreaHustle onchain gig marketplace on Celo.

## 🚀 Tech Stack

- **Framework:** [TanStack Start](https://tanstack.com/router/latest/docs/framework/react/start/overview) (Full-stack React framework)
- **Routing:** [TanStack Router](https://tanstack.com/router) (Type-safe file-based routing)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **On-chain Integration:** [wagmi](https://wagmi.sh/) & [viem](https://viem.sh/) configured for **Celo Sepolia**
- **Wallet Connection:** RainbowKit or App-native connector for mobile-first web3 onboarding
- **Styling:** Custom Vanilla CSS for rapid, fluid animations and responsive dashboard layouts
- **Linting:** ESLint with type-aware rules

## 📁 Project Structure

The project follows TanStack Start's file-based routing conventions located in `src/routes/`.

```text
src/
├── components/     # Reusable UI components
├── routes/         # File-based routes (The heart of the app)
│   ├── __root.tsx  # The root layout/app shell
│   ├── index.tsx   # Home page (/)
│   └── ...         # Other routes
├── styles/         # Global styles
└── main.tsx        # Client entry point
```

## 🛠️ Routing Conventions

This project uses **TanStack Router**. Key conventions:

- `index.tsx` → `/`
- `about.tsx` → `/about`
- `users/$id.tsx` → `/users/:id` (Dynamic)
- `_layout.tsx` → Layout route (uses `<Outlet />`)
- `__root.tsx` → The mandatory global wrapper.

> **Note:** `routeTree.gen.ts` is auto-generated. Do not edit it manually.

## ⚡ Getting Started

### Prerequisites

- Node.js (Latest LTS recommended)
- npm or pnpm

### Installation

```bash
npm install
```

### Development

Start the development server with HMR and route generation:

```bash
npm run dev
```

### Build

```bash
npm run build
```
