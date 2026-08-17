# 🌸 OtakuCircle - Social Anime Discovery Platform

![Project Status](https://img.shields.io/badge/status-production%20ready-success)
![CI](https://github.com/KhushangSingh/OtakuCircle/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/badge/license-MIT-blue)
![Stack](https://img.shields.io/badge/stack-MERN%20%2B%20Python-blueviolet)

**OtakuCircle** is a full-stack social cataloging application for anime enthusiasts. It allows users to track their watch history, discover new anime via AI-powered recommendations, and connect with friends to share suggestions.

---

## 🏗️ Architecture
OtakuCircle is built using a modern microservice-inspired architecture, separating concerns into three distinct layers:

1. **Client (Frontend):** React + Vite SPA. Handled by Nginx in production.
2. **Server (Backend API):** Node.js + Express. Handles authentication, database interactions, and business logic.
3. **ML Service:** Python + FastAPI. Dedicated service for generating cosine similarity recommendations using SentenceTransformers.

---

## 🌟 Key Features

### 🎬 Anime Tracking & Discovery
* **Comprehensive Database:** Browse over 2,000+ anime titles fetched from the Jikan API.
* **Watchlist Management:** Track anime status (Watching, Completed, On Hold, etc.) and progress.
* **Detailed Views:** See synopsis, ratings, genres, and cast details.
* **Real-time Search:** Fuzzy search for anime titles instantly.

### 🧠 AI-Powered Recommendations
* **Smart Suggestions:** Uses a Python Microservice with **Cosine Similarity** & **Sentence Transformers** to recommend anime based on your unique watch history.
* **Semantic Search:** Search for anime by "vibe" or plot description (e.g., *"sad anime about music"*), not just keywords.

### 🤝 Social Networking
* **Friend System:** Send and accept friend requests.
* **Direct Recommendations:** Recommend specific anime directly to a friend's inbox.
* **Activity Feed:** See what your friends are watching and rating.
* **User Profiles:** View stats like total watch time, favorite genres, and compatibility scores.

### 🔐 Secure & Modern
* **Authentication:** Secure JWT-based login and registration with password hashing.
* **Responsive UI:** Fully responsive design built with React and Tailwind CSS.

---

## 🛠️ Tech Stack

### **Frontend**
* **Framework:** React (Vite)
* **Styling:** Tailwind CSS
* **Routing:** React Router DOM
* **Search:** Fuse.js

### **Backend**
* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** MongoDB (Mongoose ODM)
* **Authentication:** JSON Web Tokens (JWT), BcryptJS

### **Machine Learning Service**
* **Framework:** Python FastAPI (Served with Waitress)
* **Libraries:** Scikit-learn, SentenceTransformers, Pandas, NumPy
* **Model:** Cosine Similarity on Vector Embeddings

---

## 🚀 Quick Start Guide

You can run the entire stack locally using **Docker Compose**, or manually start each service.

### 🐳 Option 1: Docker (Recommended)
**Prerequisites:** Docker and Docker Compose installed.

1. Clone the repository:
   ```bash
   git clone https://github.com/KhushangSingh/OtakuCircle.git
   cd OtakuCircle
   ```
2. Create environment files:
   - Create `server/.env` based on `server/.env.example`
   - Create `client/.env` based on `client/.env.example`
3. Start all services:
   ```bash
   docker-compose up --build
   ```
4. Access the application:
   - Frontend: `http://localhost:80`
   - Backend API: `http://localhost:5000`
   - ML Service: `http://localhost:8000`

### 🖥️ Option 2: Manual Setup
If you prefer running without Docker, follow the manual installation steps:

```bash
# 1. Install Backend Dependencies
cd server
npm install
npm run dev

# 2. Install Frontend Dependencies (In a new terminal)
cd client
npm install
npm run dev

# 3. Install Python Dependencies (In a new terminal)
cd ml_service
pip install -r requirements.txt
python main.py
```

---
*Built with ❤️ by the OtakuCircle Team*