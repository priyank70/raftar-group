# Raftar Group - Digital Mandal Management System

A premium, production-ready full-stack web application for managing a digital mandal/committee system.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### Setup

1. **Backend Setup**
```bash
cd backend
npm install
# Copy .env.example to .env and configure
cp .env.example .env
# Start backend
npm run dev
```

2. **Seed Database** (first time)
```bash
cd backend
npm run seed
```

3. **Frontend Setup**
```bash
cd frontend
npm install
# Start frontend
npm run dev
```

### Login Credentials
- **Admin**: admin@raftar.com / Admin@123
- **Member**: rahul@raftar.com / Member@123

## 📁 Project Structure

```
raftar-group/
├── backend/              # Node.js + Express API
│   ├── src/
│   │   ├── config/      # Database config
│   │   ├── controllers/ # Route handlers
│   │   ├── middleware/  # Auth, upload, error handlers
│   │   ├── models/      # MongoDB schemas
│   │   ├── routes/      # API routes
│   │   ├── utils/       # JWT utilities
│   │   ├── server.ts    # Main server entry
│   │   └── seed.ts      # Database seeder
│   └── uploads/         # Uploaded files
│
├── frontend/             # Next.js 14 App Router
│   └── src/
│       ├── app/          # App pages
│       │   ├── login/    # Auth pages
│       │   └── dashboard/ # Protected pages
│       ├── components/   # Reusable components
│       ├── lib/          # API client, utils
│       └── store/        # Zustand stores
```

## 🎨 Features

- **Premium Dashboard** - Admin & Member views
- **Real-time Updates** - Socket.IO integration
- **Payment System** - QR code, screenshot upload, approval workflow
- **Penalty Engine** - Automatic 10%/day calculation
- **Advance Payments** - Multi-month coverage
- **Investment Management** - Voting system, interest calculator
- **Notifications** - Real-time alerts
- **Analytics** - Charts with Recharts
- **Reports** - CSV export
- **Role-based Access** - Admin & Member roles

## 🔧 Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Framer Motion, React Query, Zustand
- **Backend**: Node.js, Express.js, TypeScript, Socket.IO
- **Database**: MongoDB with Mongoose
- **Auth**: JWT with refresh tokens

## 📱 Mobile-First Design

Fully responsive with bottom navigation on mobile, sidebar on desktop.
# raftar-group
