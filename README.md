# 🌸 OtakuCircle - Social Anime Discovery Platform

![Project Status](https://img.shields.io/badge/status-production%20ready-success)
![License](https://img.shields.io/badge/license-MIT-blue)
![Stack](https://img.shields.io/badge/stack-MERN%20%2B%20Python-blueviolet)

**OtakuCircle** is a full-stack social cataloging application for anime enthusiasts. It allows users to track their watch history, discover new anime via AI-powered recommendations, and connect with friends to share suggestions.

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
* **State/Data:** Axios, React Hooks
* **Search:** Fuse.js

### **Backend**
* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** MongoDB (Mongoose ODM)
* **Authentication:** JSON Web Tokens (JWT), BcryptJS

### **Machine Learning Service**
* **Framework:** Python FastAPI
* **Libraries:** Scikit-learn, SentenceTransformers, Pandas, NumPy
* **Model:** Cosine Similarity on Vector Embeddings

---

## 🚀 Quick Start Guide

To run the application locally, you need to start three separate services.

### Prerequisites
* Node.js (v16+)
* Python (v3.8+)
* MongoDB Atlas URI

### 1. Installation
Clone the repository and install dependencies for all services:

```bash
# 1. Install Backend Dependencies
cd server
npm install

# 2. Install Frontend Dependencies
cd ../client
npm install

# 3. Install Python Dependencies
cd ../ml_service
pip install -r requirements.txt