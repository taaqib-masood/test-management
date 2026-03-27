# 🎓 LTTS Test Portal

A full-stack assessment platform built with **Angular (v19)** and **Node.js/Express**. Designed for creating, managing, and conducting secure online tests with real-time analytics.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Angular](https://img.shields.io/badge/frontend-Angular_19-red)
![Node](https://img.shields.io/badge/backend-Node.js-green)
![MongoDB](https://img.shields.io/badge/database-MongoDB-green)

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- MongoDB (Local or Atlas URL)

### One-Click Run (Windows)
Double-click `run.bat`

### One-Click Run (Linux/Mac)
```bash
chmod +x run.sh
./run.sh
```

### Manual Setup
```bash
# 1. Install Dependencies
npm install
cd client && npm install
cd ../server && npm install

# 2. Setup Environment
# Create server/.env from example
cp server/.env.example server/.env

# 3. Run Development Servers
npm run dev
```
- Frontend: `http://localhost:4200`
- Backend: `http://localhost:5000`

---

## 🏗 Architecture

The project follows a standard MEAN stack architecture:

```
ltts-test-portal/
├── client/                 # Angular Frontend
│   ├── src/app/components  # UI Components (Pages)
│   ├── src/app/services    # HTTP Services (API, Auth)
│   ├── src/environments    # Config (Dev/Prod URLs)
│   └── ...
├── server/                 # Node.js Backend
│   ├── config/             # DB Connection
│   ├── controllers/        # Business Logic
│   ├── models/             # Mongoose Schemas covers
│   ├── routes/             # API Endpoints
│   └── ...
└── ...
```

### Key Features
- **Role-Based Auth**: Admin (Create Tests) vs Student (Take Tests)
- **Secure Testing**: Tab-switch detection, fullscreen enforcement (optional), preventing copy-paste.
- **Analytics**: Per-question difficulty analysis, time tracking, export to Excel.
- **Question Bank**: Bulk upload support via Excel.

---

## 🛠 Handover Guide: How to Extend

### 1. Adding a New Question Type
1. **Backend**: Update `server/models/Question.js` to include new schema fields (e.g., `matchingPairs`).
2. **Frontend**:
   - Update `create-test` component to allow selecting this type.
   - Update `test-engine` component to render the new input UI.
   - Update `result-page` to display the answer correctly.

### 2. Modifying the Assessment Logic
- **Scoring**: Logic resides in `server/controllers/attemptController.js` -> `submitAttempt`.
- **Anti-Cheating**: Tab-switch triggers are in `client/.../test-engine.component.ts`.

### 3. Database Schema
- **User**: Auth & Roles.
- **Test**: Config (duration, questions, access code).
- **Question**: Text, options, correct answer, difficulty.
- **Attempt**: Student's answers, score, time taken, logs.

---

## 📦 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for a step-by-step guide to deploying on **Vercel + Render + MongoDB Atlas** for free.

---

## 🤝 Contributing

1. Fork the repo
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
