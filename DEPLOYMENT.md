# 🚀 OtakuCircle Deployment Guide

This guide walks you through deploying OtakuCircle to production while keeping your local development environment fully functional.

## 1. Push to GitHub
First, create your remote GitHub repository and push your code:
1. Go to [GitHub](https://github.com/new) and create a new repository called `OtakuCircle`.
2. Do **not** initialize it with a README or `.gitignore`.
3. Open a terminal in `C:\Users\khush\Documents\Projects\OtakuCircle` and run the commands provided by GitHub:
   ```bash
   git remote add origin https://github.com/KhushangSingh/OtakuCircle.git
   git branch -M main
   git push -u origin main
   ```

## 2. Deploying the Backend (Node.js) & ML Service (Python)
We recommend deploying both the backend and python ML service to [Render](https://render.com) or [Railway](https://railway.app) since they have great free-tier options.

### A. Deploy ML Service (Python)
1. Go to **Render Dashboard** → **New Web Service**.
2. Connect your GitHub repository and select the `OtakuCircle` repo.
3. Configure the service:
   - **Root Directory**: `ml_service` (Important!)
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python main.py`
4. Wait for the deployment to finish, and copy the **Service URL** (e.g., `https://otakucircle-ml.onrender.com`).

### B. Deploy Backend Service (Node.js)
1. Go to **Render Dashboard** → **New Web Service**.
2. Connect your GitHub repository and select `OtakuCircle`.
3. Configure the service:
   - **Root Directory**: `server` (Important!)
   - **Build Command**: `npm install`
   - **Start Command**: `npm start` (or `node server.js`)
4. **Environment Variables**: Add the following in Render:
   - `MONGO_URI`: Your MongoDB Atlas URI.
   - `JWT_SECRET`: A secure random string for JWT signatures.
   - `ML_SERVICE_URL`: The URL you got from the previous step (e.g., `https://otakucircle-ml.onrender.com`).
5. Wait for deployment, and copy the **Service URL** (e.g., `https://otakucircle-api.onrender.com`).

## 3. Deploying the Frontend (React + Vite)
We recommend deploying the frontend to [Vercel](https://vercel.com).
1. Go to **Vercel** → **Add New Project**.
2. Import your `OtakuCircle` GitHub repository.
3. Configure the project:
   - **Root Directory**: `client` (Important!)
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. **Environment Variables**: Add the following variable:
   - `VITE_API_URL`: The URL of your deployed Node.js backend from step 2B (e.g., `https://otakucircle-api.onrender.com/api`).
5. Click **Deploy**.

## 4. Local Development vs. Production
Your project is configured to automatically use the correct URLs:
- **Locally**: When you run `npm run dev` in `client`, it connects to `http://localhost:5000/api` because `VITE_API_URL` is undefined locally.
- **Production**: Vercel injects the `VITE_API_URL`, so your live site connects to the live backend.
- Same logic applies to the backend connecting to the Python ML service via `ML_SERVICE_URL`.
