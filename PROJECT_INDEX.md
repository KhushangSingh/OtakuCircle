# 📘 OtakuCircle - Project Documentation Index

**Project Status**: ✅ Production Ready (v1.0)
**Last Updated**: December 2025

---

## 🗂️ Source Code Inventory

### 1. Frontend Client (`client/`)
**Stack:** React + Vite + Tailwind CSS
- **`src/pages/`**:
  - `Home.jsx`: Landing page with trending/genre grids.
  - `AnimeDetails.jsx`: Detailed view with "Add to List" functionality.
  - `Profile.jsx`: User stats, watch history, and friend list.
  - `Recommendations.jsx`: AI-powered suggestion feed.
  - `Login.jsx`: Authentication handling (Login/Signup toggle).
- **`src/components/`**:
  - `Navbar.jsx`: Global navigation, real-time search, notifications.
- **`src/hooks/`**:
  - `useSearch.js`: Client-side fuzzy search logic.

### 2. Backend Server (`server/`)
**Stack:** Node.js + Express + MongoDB (Mongoose)
- **`controllers/`**:
  - `authController.js`: JWT issuance and validation.
  - `animeController.js`: Data fetching and list management.
  - `socialController.js`: Friend graph and notification logic.
  - `recommendationController.js`: Bridge to Python ML service.
  - `userController.js`: Profile management and stats aggregation.
- **`models/`**: `User.js`, `Anime.js`, `Notification.js`.
- **`middleware/`**: `authMiddleware.js` (JWT Protection).
- **`server.js`**: Route orchestration and server configuration.

### 3. ML Microservice (`ml_service/`)
**Stack:** Python + FastAPI + SentenceTransformers
- **`main.py`**: API exposing `/predict` (Recommendations) and `/search` (Semantic Search).
- **`build_search_index.py`**: Generates vector embeddings for anime data.
- **`seed_animes.py`**: Scraper/Seeder for populating MongoDB from Jikan API.
- **`requirements.txt`**: Python dependencies.

---

## 🚀 Quick Start

### Prerequisites
* Node.js (v16+)
* Python (v3.8+)
* MongoDB Atlas URI

### 1. Initialization (One-Time Only)
```bash

# Database Seeding
cd ml_service
python seed_animes.py       # Fetches data from Jikan API (takes ~5-10 mins)
python build_search_index.py # Generates vector embeddings for search/recs


#Running the App

#Terminal 1: ML Service
cd ml_service
python -m uvicorn main:app --reload --port 8000

#Terminal 2: Backend API
cd server
npm run dev

#Terminal 3: Frontend Client
cd client
npm run dev