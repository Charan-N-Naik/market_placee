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

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
