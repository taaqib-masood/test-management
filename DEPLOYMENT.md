# 🚀 Zero-Cost Deployment Guide

Deploy your **LTTS Test Portal** for free using **MongoDB Atlas**, **Render**, and **Vercel**.

---

## 🛑 Quick Checklist
- [ ] **MongoDB Atlas**: Database cluster created & connection string ready.
- [ ] **GitHub**: Project pushed to a public/private repository.
- [ ] **Render**: Backend service created.
- [ ] **Vercel**: Frontend project imported.

---

## Phase 1: Database (MongoDB Atlas)

1. **Log in** to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. **Create Cluster**: Select **Shared (Free)** -> **M0 Sandbox** -> **Create**.
3. **Database Access**:
   - Go to **Security** -> **Database Access**.
   - **Add New Database User**.
   - Method: **Password**.
   - Username: `admin` (or your choice).
   - Password: **Create a strong password and SAVE IT**.
   - Role: **Read and write to any database**.
   - Click **Add User**.
4. **Network Access** (Critical Step):
   - Go to **Security** -> **Network Access**.
   - **Add IP Address**.
   - Click **Allow Access from Anywhere** (`0.0.0.0/0`).
   - Click **Confirm**. (Wait for "Active" status).
5. **Get Connection String**:
   - Go to **Database** -> **Connect** -> **Drivers**.
   - Copy the string: `mongodb+srv://admin:<password>@cluster0...`
   - **Replace `<password>`** with your actual password in a text editor. Keep this safe.

---

## Phase 2: Backend (Render)

1. **Log in** to [Render](https://render.com/).
2. **New +** -> **Web Service**.
3. **Connect GitHub**: Select your repo `ltts-test-portal`.
4. **Configuration**:
   - **Name**: `ltts-backend`
   - **Root Directory**: `server` (⚠️ Important)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: `Free`
5. **Environment Variables** (Advanced):
   - `MONGO_URI`: (Paste your Atlas connection string from Phase 1)
   - `JWT_SECRET`: (Generate a random string, e.g., `mysecretkey123`)
   - `CORS_ORIGIN`: `*` (Temporarily allow all, update later to Vercel URL)
   - `NODE_ENV`: `production`
6. **Deploy**: Click **Create Web Service**.
7. **Wait**: It will take a few minutes. Once "Live", copy the **backend URL** (e.g., `https://ltts-backend.onrender.com`).
   - _Test it_: Go to `https://ltts-backend.onrender.com/health`. You should see `{"status":"ok"}`.

---

## Phase 3: Frontend (Vercel)

1. **Log in** to [Vercel](https://vercel.com/).
2. **Add New** -> **Project** -> Import `ltts-test-portal`.
3. **Framework Preset**: Ensure `Angular` is selected.
4. **Root Directory**: Edit and select `client`.
5. **Build Output**: Vercel usually detects `dist/client/browser`. If build fails, check this.
6. **Environment Variables**:
   *Since we used `fileReplacements` in Angular, we need to update the file in code or use a build script. For simplicity:*
   
   **Option A (Recommended for Beginners): Code Update**
   1. Open `client/src/environments/environment.prod.ts` locally.
   2. Change `apiUrl` to your **Render Backend URL**:
      ```typescript
      export const environment = {
        production: true,
        apiUrl: 'https://ltts-backend.onrender.com/api' // No trailing slash, allow /api
      };
      ```
   3. Commit and push: `git add . && git commit -m "Update API URL" && git push`.
   4. Vercel will auto-redeploy.

7. **Deploy**: Click **Deploy**.

---

## Phase 4: Final Security Config

1. Copy your **Vercel Frontend URL** (e.g., `https://ltts-portal.vercel.app`).
2. Go to **Render** -> **Environment Variables**.
3. Edit `CORS_ORIGIN` -> Paste your Vercel URL.
4. Save Changes. This ensures only your frontend can talk to your backend.

---

## ⚡ Troubleshooting

- **Backend "Internal Server Error"**: Check Render Logs. Usually incorrect `MONGO_URI` password or missing IP whitelist in Atlas.
- **Frontend "Connection Refused"**: Check Console (F12). If CORS error, check Phase 4. If 404, check `apiUrl` in `environment.prod.ts`.
- **Render Cold Start**: Free tier spins down after inactivity. First request takes ~50s.
