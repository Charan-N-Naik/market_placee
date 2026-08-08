# 🌾 KisanBazaar — Direct Agricultural Marketplace & AI Ecosystem

[![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20Vite%20%7C%20Tailwind-61DAFB?logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express-339933?logo=node.js)](https://nodejs.org/)
[![Python ML](https://img.shields.io/badge/ML%20Engine-Python%20%7C%20Flask%20%7C%20PyTorch-3776AB?logo=python)](https://python.org/)
[![Database](https://img.shields.io/badge/Database-MongoDB%20%7C%20SQLite-47A248?logo=mongodb)](https://mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**KisanBazaar** is a next-generation agricultural marketplace and AI advisory platform designed to bridge the gap between farmers and buyers. By combining direct fair-trade crop commerce with computer vision quality verification, real-time market price analytics, multilingual AI advisory (supporting English, Kannada, Tulu, and Hindi), and live delivery tracking, KisanBazaar empowers agricultural communities with transparent, technology-driven solutions.

---

## 🌟 Key Features

### 🚜 For Farmers
- **Direct Produce Listing**: Easily list crops with produce details, grade, price per quintal/kg, location, and harvesting dates.
- **AI Crop Quality Verification**: Upload crop images to receive automated quality grades and verification certificates backed by computer vision models.
- **Market Price Intelligence**: Access live market prices (Mandi rates) across districts to get fair value for produce.
- **Government Schemes Advisory**: Instant guidance on national and state agricultural schemes (PM-KISAN, crop insurance, subsidies).

### 🛒 For Buyers & Wholesalers
- **Verified Crop Catalog**: Browse and filter crops by type, state, organic certification, quality score, and price.
- **Interactive State Crop Map**: Visual regional maps powered by Leaflet to source crops directly from farm clusters.
- **Secure Payments & Escrow**: Integrated Razorpay payment processing for seamless transactions.
- **Live Logistics Tracking**: Real-time Socket.IO tracking of active orders from farm pickup to destination delivery.

### 🤖 Multi-Tier AI Advisory (AgriChat)
- **Multilingual Support**: Interactive chat in English, Kannada, Tulu, and Hindi.
- **Pesticide & Disease Diagnosis**: Instant crop disease classification and recommended eco-friendly treatment plans.
- **Speech & Audio Assistant**: Built-in voice input and speech synthesis for accessible operation.

---

## 🏗️ System Architecture

```
market_place/
├── frontend/                # React 18 + Vite + TailwindCSS Frontend Application
│   ├── src/
│   │   ├── components/      # UI components (CropCard, Map, ChatWidget, AICropAnalyzer)
│   │   ├── context/         # Auth, Cart, Language, and Listing Contexts
│   │   ├── pages/           # Farmer/Buyer Dashboards, Intelligence Hub, Market Trends
│   │   └── i18n/            # Multilingual translations (EN, KN, TU, HI)
│   └── vite.config.js
│
├── backend/
│   ├── node/                # Express.js Core Backend Service
│   │   ├── controllers/     # API Business Logic
│   │   ├── models/          # MongoDB Mongoose Schemas (User, Crop, Order, Scheme)
│   │   ├── routes/          # RESTful Endpoints
│   │   ├── services/        # AgriChat Orchestrator, Razorpay, Cloudinary, Nodemailer
│   │   └── server.js
│   │
│   └── python/              # Flask ML & Computer Vision Microservice
│       ├── app.py           # ML API endpoints
│       ├── ml_model.py      # Crop Quality & Disease Classification Models
│       └── verification/    # Image Authenticity & Geolocation EXIF Validator
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
Make sure you have the following installed on your environment:
- **Node.js** (v18.x or higher)
- **Python** (v3.9 or higher)
- **MongoDB** (Local instance or MongoDB Atlas URI)

---

### 📦 Installation & Setup

#### 1. Clone the Repository
```bash
git clone https://github.com/Charan-N-Naik/market_placee.git
cd market_placee
```

#### 2. Node.js Backend Setup
```bash
cd backend/node
npm install
```
Create a `.env` file in `backend/node/`:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/kisanbazaar
JWT_SECRET=your_jwt_secret_key
GEMINI_API_KEY=your_google_gemini_api_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
```
Run the Node.js backend:
```bash
npm run dev
```

#### 3. Python ML Microservice Setup
```bash
cd ../python
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```
Run the Flask ML service:
```bash
python app.py
```

#### 4. Frontend Application Setup
```bash
cd ../../frontend
npm install
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 18, Vite, TailwindCSS, Lucide Icons, Framer Motion, Recharts, Leaflet Maps |
| **Node Backend** | Node.js, Express.js, Socket.IO, Mongoose, Razorpay, Cloudinary, Nodemailer |
| **AI / ML Service** | Python, Flask, PyTorch / Scikit-Learn, Pillow, OpenCV, EXIF-read |
| **Database** | MongoDB (Primary Store), SQLite (ML Metadata & Local Caching) |
| **AI Integrations** | Google Gemini 2.0 API (`@google/genai`), Speech Recognition / Web Speech API |

---

## 📸 Core Screenshots & Features

- **Farmer Dashboard**: Full inventory control, yield analytics, and instant verification status.
- **Buyer Portal**: Filter crops by region, view Leaflet supply maps, and place escrow-protected bulk orders.
- **AgriChat Assistant**: Voice-enabled multilingual advisor providing customized agricultural insights.
- **Verification Engine**: Automated EXIF geolocation and image authenticity validation for listed produce.

---

## 🤝 Contributing

Contributions are welcome! KisanBazaar follows a **protected branch workflow** to ensure code quality and stability on the `main` branch.

---

### 🔐 Branch Protection Policy

The `main` branch is protected with the following ruleset enforced via GitHub Branch Rulesets:

| Rule | Status |
| :--- | :--- |
| **Block force pushes to `main`** | ✅ Enabled |
| **Restrict deletions of `main`** | ✅ Enabled |
| **Require a Pull Request before merging** | ✅ Enabled |
| **Required approvals before merge** | ✅ Minimum 1 (Admin review) |
| **Dismiss stale reviews on new push** | ✅ Enabled |
| **Direct push to `main`** | ❌ Not allowed for contributors |

> **Only the repository admin can approve and merge Pull Requests into `main`.**

---

### 🔄 Contributor Workflow

Follow these steps to contribute to KisanBazaar:

**1. Get Access**
- You must be added as a collaborator with **Write** permission by the admin.

**2. Clone the Repository**
```bash
git clone https://github.com/Charan-N-Naik/market_placee.git
cd market_placee
```

**3. Create Your Own Branch**
> ⚠️ Never commit directly to `main`. Always work on a dedicated branch.
```bash
# For a new feature
git checkout -b feature/your-feature-name

# For a bug fix
git checkout -b bugfix/issue-description

# For documentation updates
git checkout -b docs/update-description
```

**4. Make Your Changes & Commit**
```bash
git add .
git commit -m "feat: describe your change clearly"
```

**5. Push Your Branch to GitHub**
```bash
git push origin feature/your-feature-name
```

**6. Open a Pull Request**
- Go to the repository on GitHub.
- Click **"Compare & pull request"** for your branch.
- Fill in the PR title and description explaining **what** and **why**.
- Submit the PR — it will be assigned to the admin for review.

**7. Wait for Admin Review**
- The admin will review your code, request changes if needed, or approve.
- ✅ Once approved, **only the admin will merge** your PR into `main`.
- ❌ Contributors **cannot merge** their own PRs into `main`.

---

### 📋 Branch Naming Convention

| Type | Pattern | Example |
| :--- | :--- | :--- |
| Feature | `feature/name` | `feature/crop-filter-map` |
| Bug Fix | `bugfix/name` | `bugfix/login-redirect` |
| Documentation | `docs/name` | `docs/api-endpoints` |
| Hotfix | `hotfix/name` | `hotfix/payment-crash` |

---

### ✅ PR Checklist

Before submitting your Pull Request, make sure:
- [ ] Code runs without errors locally
- [ ] No `.env` files or secrets are committed
- [ ] Descriptive commit messages are used
- [ ] PR description clearly explains the changes
- [ ] Tested the affected feature end-to-end

---

## 👥 Guide for Collaborators — How to Use This Repo

> This section is specifically for team members who have been added as collaborators to the **KisanBazaar** repository.

---

### 🔔 Step 1 — Accept Your Invitation

1. Check your email inbox for a **GitHub collaboration invite** from `Charan-N-Naik`.
2. Click **"View Invitation"** in the email → Click **"Accept Invitation"** on GitHub.
3. You now have **Write access** to the repository.

> Alternatively, go directly to:
> `https://github.com/Charan-N-Naik/market_placee/invitations`

---

### 💻 Step 2 — Set Up the Project Locally

**Clone the repository** (do this only once):
```bash
git clone https://github.com/Charan-N-Naik/market_placee.git
cd market_placee
```

**Install all dependencies:**
```bash
# Node.js Backend
cd backend/node
npm install

# Python ML Service
cd ../python
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt

# Frontend
cd ../../frontend
npm install
```

**Create your local `.env` file** in `backend/node/` (ask the admin for values):
```env
PORT=5000
MONGO_URI=your_mongo_uri
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

> ⚠️ **Never commit your `.env` file.** It is already in `.gitignore`.

---

### 🌿 Step 3 — Always Work on Your Own Branch

> ❌ You **cannot push directly to `main`** — it is protected.
> ✅ Always create and work on your own branch.

```bash
# First, make sure your local main is up to date
git checkout main
git pull origin main

# Create your working branch
git checkout -b feature/your-name-feature-description
```

**Examples:**
```bash
git checkout -b feature/akshay-crop-filter
git checkout -b bugfix/ashmit-login-fix
git checkout -b docs/chandrakant-api-docs
```

---

### 💾 Step 4 — Save & Commit Your Work

After making changes to the code:

```bash
# See what files you changed
git status

# Stage all your changes
git add .

# Commit with a clear message
git commit -m "feat: add crop filter by region on buyer dashboard"
```

**Commit message format:**
| Prefix | Use for |
| :--- | :--- |
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation update |
| `style:` | UI/CSS changes only |
| `refactor:` | Code restructure (no new feature) |

---

### 🚀 Step 5 — Push Your Branch to GitHub

```bash
git push origin feature/your-name-feature-description
```

If it's your **first push** on that branch:
```bash
git push --set-upstream origin feature/your-name-feature-description
```

---

### 🔁 Step 6 — Open a Pull Request (PR)

1. Go to → [https://github.com/Charan-N-Naik/market_placee](https://github.com/Charan-N-Naik/market_placee)
2. You'll see a yellow banner: **"Compare & pull request"** → Click it.
3. Fill in the PR form:
   - **Title**: Short description of your change
   - **Description**: What you changed, why, and how to test it
4. Make sure the base branch is **`main`** and compare branch is **your branch**.
5. Click **"Create pull request"**.

> 📌 Your PR will be reviewed by the admin. You **cannot merge it yourself**.

---

### 🔄 Step 7 — Handle Review Feedback

The admin may:

| Action | What you should do |
| :--- | :--- |
| ✅ **Approved** | Admin will merge. Your changes are live on `main`! |
| 💬 **Request changes** | Fix the issues on your same branch, commit & push again |
| ❌ **Closed without merge** | Discuss with admin before re-submitting |

**To update your branch after review feedback:**
```bash
# Make your fixes
git add .
git commit -m "fix: address review comments on crop filter"
git push origin feature/your-name-feature-description
```
> The PR updates automatically — no need to open a new one.

---

### 🔃 Step 8 — Keep Your Branch Updated

If `main` has been updated while you're working, sync your branch:
```bash
git checkout main
git pull origin main
git checkout feature/your-name-feature-description
git merge main
```
Resolve any merge conflicts, then:
```bash
git add .
git commit -m "merge: sync with latest main"
git push origin feature/your-name-feature-description
```

---

### ⛔ What Collaborators Cannot Do

| Action | Allowed? |
| :--- | :--- |
| Create a new branch | ✅ Yes |
| Push to your own branch | ✅ Yes |
| Open a Pull Request | ✅ Yes |
| Comment on PRs | ✅ Yes |
| Push directly to `main` | ❌ No — blocked by ruleset |
| Merge a PR into `main` | ❌ No — admin only |
| Delete the `main` branch | ❌ No — blocked by ruleset |
| Force push to `main` | ❌ No — blocked by ruleset |

---

### 📞 Need Help?

- Open a **GitHub Issue** in the repo describing your problem.
- Contact the admin: **Charan N Naik** (`Charan-N-Naik` on GitHub).

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
