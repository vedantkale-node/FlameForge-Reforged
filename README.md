<div align="center">

<img src="https://i.postimg.cc/wTYmZB8m/flameforge-hero.png" alt="FlameForge Reforged Hero" width="100%">

# 🔥 FlameForge (Reforged)
### *High-Performance Unofficial Genshin Impact Game Data & RESTful Engine*

[![Version](https://img.shields.io/badge/version-2.0.0-red.svg?style=for-the-badge)](./changelog.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![OpenAPI 3.0](https://img.shields.io/badge/OpenAPI-3.0-green.svg?style=for-the-badge&logo=openapi-initiative&logoColor=white)](#-api-endpoints--documentation)

<p align="center">
  <b>FlameForge Reforged</b> is a modular, developer-grade RESTful API and real-time game data scraper platform for <b>Genshin Impact</b>. Built from the ground up with TypeScript, Express, MongoDB, and Cloudinary CDN.
</p>

[Explore Swagger API Docs](https://flameforge.glitch.me/) · [Changelog](./changelog.md) · [Report Issue](https://github.com/vedantkale-node/flameforge-reforged/issues)

</div>

---

## 📑 Table of Contents

- [✨ Key Features](#-key-features)
- [⚡ Scraper Studio](#-hoyowiki-scraper-studio)
- [🔌 API Endpoints & Documentation](#-api-endpoints--documentation)
- [🛡️ Security & Architecture](#️-security--architecture)
- [🛠️ Tech Stack](#️-tech-stack)
- [🚀 Quick Start & Installation](#-quick-start--installation)
- [⚙️ Environment Configuration](#️-environment-configuration)
- [📜 Changelog](#-changelog)
- [👤 Author & License](#-author--license)

---

## ✨ Key Features

### 🌟 Deep Genshin Impact Dataset
- **Characters**: Complete attributes, region, vision, rarity, birthday, voice actors (EN, JP, CN, KR), full **Lv1–13 combat talent scaling matrices**, and **C1–C6 constellations**.
- **Weapons**: Base ATK, secondary stats, **Lv1–90 progression curves**, passive skill scaling, and awakened artwork.
- **Artifacts**: 2-Piece and 4-Piece bonus descriptions, plus individual piece artwork and lore for all **5 relic pieces** (Flower, Plume, Sands, Goblet, Circlet).

### ⚡ RESTful Query Engine
- **Multi-Dimensional Filtering**: Query by Vision (`pyro`, `hydro`, etc.), Weapon Type (`claymore`, `sword`, etc.), Rarity (`4`, `5`), Region (`mondstadt`, `inazuma`, etc.), or Family.
- **Payload Projections (`infoSize`)**: Use standard lightweight payloads for list views or `?infoSize=full` for full talent matrices and constellation trees.
- **Alias Flexibility**: Fully supports `/api/v1/*` as well as `/api/*` and `/v1/*` route mounts.

---

## 🕷️ HoYoWiki Scraper Studio

FlameForge Reforged features a high-speed concurrency crawler built using `p-limit` worker concurrency pools:

- **~15-Second Full Universe Ingestion**: Crawls and structures the entire HoYoWiki universe in seconds.
- **Live Preview Studio**: Test and inspect raw JSON payloads for any character, weapon, or artifact by URL or ID before committing to MongoDB.
- **Single & Category Sync**: Synchronize single items, entire categories, or the complete universe with real-time UI logging.
- **Concurrency Mutex Lock**: Built-in 15-minute lock prevents overlapping batch syncs and upstream rate limiting.
- **Automated Cloudinary Mirroring**: Automatically downloads and mirrors external HoYo asset URLs directly to Cloudinary CDN for permanent, zero-broken-link uptime.

---

## 🔌 API Endpoints & Documentation

Interactive API documentation with dark mode is hosted on the root path `/` powered by Swagger UI and OpenAPI 3.0.

| Method | Endpoint | Description | Query Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/characters` | Retrieve array of characters | `?vision=`, `?region=`, `?weapon=`, `?rarity=`, `?infoSize=` |
| `GET` | `/api/v1/character` | Fetch character by name / random | `?name=`, `?infoSize=` |
| `GET` | `/api/v1/weapons` | Retrieve array of weapons | `?rarity=`, `?family=`, `?type=`, `?infoSize=` |
| `GET` | `/api/v1/weapon` | Fetch weapon by name / random | `?name=`, `?infoSize=` |
| `GET` | `/api/v1/artifacts` | Retrieve array of artifact sets | `?infoSize=` |
| `GET` | `/api/v1/artifact` | Fetch artifact set by name / random | `?name=`, `?infoSize=` |
| `GET` | `/api/v1/openapi.json`| Raw OpenAPI 3.0 JSON specification | None |

#### Sample Request:
```bash
curl -X GET "https://flameforge.glitch.me/api/v1/character?name=diluc&infoSize=full" -H "Accept: application/json"
```

---

## 🛡️ Security & Architecture

FlameForge Reforged has been engineered according to modern enterprise security standards:

- **IDOR Protection**: Strict ownership verification (`req.session.uid === req.params.id` or `role === 'admin'`) and instant session revocation.
- **SSRF Shielding**: URL parsing and private IP blocking (`127.0.0.1`, `10.*`, `192.168.*`, `169.254.*`) on server-side upload controllers.
- **ReDoS Prevention**: Escaped regular expression meta-characters (`.*+?^${}()|[]\`) across all API filter builders.
- **Database Schema Normalization**: Database-level unique, trimmed, and lowercased indexes on `email` and `username`.
- **Proxy-Aware Rate Limiting**: Dedicated rate limiters (`apiLimiter`, `authLimiter`, `scraperLimiter`, `imageUploadLimiter`) configured with `trust proxy` true client IP detection.
- **Session Security**: `connect-mongo` session storage with `httpOnly: true`, `secure: true` (in production), and `sameSite: 'lax'`.
- **Upload Hardening**: 5MB memory ceiling with MIME-type and `.json` extension verification.

---

## 🛠️ Tech Stack

- **Runtime & Language**: Node.js (ESM), TypeScript
- **Framework & Routing**: Express.js
- **Database & ODM**: MongoDB, Mongoose, Connect-Mongo
- **Template Engine**: Express Handlebars (`.hbs`)
- **Asset Storage & CDN**: Cloudinary CDN
- **Security & Utilities**: Helmet CSP, Bcrypt, Express-Rate-Limit, Express-Validator, Nodemailer
- **Web Scraping**: Cheerio, Axios, P-Limit
- **Styling**: Tailwind CSS & Tabler Icons (Diluc Matte Dark Aesthetic)

---

## 🚀 Quick Start & Installation

### 1. Clone Repository
```bash
git clone https://github.com/vedantkale-node/flameforge-reforged.git
cd flameforge-reforged
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env` file based on `sample.env`:
```bash
cp sample.env .env
```

### 4. Build & Run
```bash
# Build TypeScript and Tailwind styles
npm run build

# Start production server
npm start

# Or start full development mode (Nodemon + Tailwind Watcher)
npm run dev:all
```

---

## ⚙️ Environment Configuration

```env
# Server Port
PORT=4000
NODE_ENV=development

# MongoDB Connection String
DB=mongodb://127.0.0.1:27017/flameforge

# Session Security Secret
SECRET=your_super_secret_session_key

# Email Notification Service (Nodemailer)
SERVER_EMAIL=your_server_email@gmail.com
SERVER_EMAIL_SECRET=your_app_password
ADMIN_EMAIL=vedantsapalkar99@gmail.com

# Cloudinary CDN Credentials
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Optional Client CORS Origin
CLIENT_ORIGIN=http://localhost:3000
```

---

## 📜 Changelog

Detailed release notes and version history are available in [changelog.md](./changelog.md).

---

## 👤 Author & License

- **Lead Architect & Developer**: [Vedant Kale](https://vedantkale.in)  
- **Email**: [vedantkale.node@gmail.com](mailto:vedantkale.node@gmail.com)  
- **Repository**: [https://github.com/vedantkale-node/flameforge-reforged](https://github.com/vedantkale-node/flameforge-reforged)

Distributed under the **ISC License**.

> *Disclaimer: FlameForge Reforged is an unofficial fan-made game data platform. Genshin Impact and all related assets, game content, and imagery are trademarks and copyrights of miHoYo / Cognosphere Pte. Ltd.*
