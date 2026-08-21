# Changelog

All notable changes to the **FlameForge (Reforged)** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] - 2026-08-21 — *FlameForge Reforged*

### ⚡ Engine & Architecture
- **TypeScript Migration**: Full codebase rewrite from JavaScript to modular, type-safe TypeScript with ESM modules.
- **Session Architecture**: Replaced in-memory session leaks with persistent `connect-mongo` session store and production HTTPS cookie security (`secure`, `sameSite: 'lax'`).
- **Proxy-Aware Rate Limiting**: Implemented multi-tier express rate limiters (`apiLimiter`, `authLimiter`, `imageUploadLimiter`, `scraperLimiter`) with true client IP resolution behind reverse proxies.
- **Global Error Handling**: Added a robust 4-argument Express error handler with structured JSON responses for API calls and custom `500.hbs` views for web sessions.

### 🕷️ HoYoWiki Scraper Studio
- **High-Speed Concurrency Engine**: Built proprietary crawler using `p-limit` concurrent pools, extracting the entire Genshin Impact universe in ~15 seconds.
- **Talent Scaling & Constellations**: Scrapes full Lv1–13 combat talent scaling matrices, C1–C6 constellations, weapon Lv1–90 progression curves, and 5-piece artifact relic sets.
- **Scraper Studio Dashboard**: Interactive UI with real-time payload preview, single-entry sync, full category sync, and concurrency locking (`409 Conflict` prevention).
- **Automated Cloudinary Pipeline**: Automated external image mirroring directly to Cloudinary CDN to prevent broken hotlinks.

### 🛡️ Security & Hardening
- **IDOR Defense**: Secured account deletion endpoints with strict session ownership verification (`req.session.uid === req.params.id` or `role === 'admin'`) and immediate session destruction.
- **SSRF & Input Shield**: Added protocol and loopback IP blocking (`127.0.0.1`, `10.*`, `192.168.*`, `169.254.*`) on server-side Cloudinary upload endpoints.
- **ReDoS Prevention**: Escaped all regex meta-characters on API query parameters (`?name=`, `?vision=`, `?region=`, `?weapon=`, `?family=`).
- **Database Schema Normalization**: Enforced unique, trimmed, and lowercased indexes on `email` and `username` fields in MongoDB schemas.
- **XSS Sanitization**: Integrated HTML entity escaping across bug reports, verification emails, and user profile signatures.
- **Upload Hardening**: Enforced 5MB memory ceiling and `.json` MIME-type validation on data imports with Admin RBAC enforcement.

### 🎨 UI/UX & Documentation
- **Swagger UI Dark Theme**: Official dark theme integration with custom headers, method badges, and hidden Schemas/Models sections.
- **Entity Inspector Modal**: Dynamic modal adapting tabs based on entity category (auto-hiding character talents/constellations for weapons and artifacts, and displaying 5-piece relic cards).
- **Responsive Mobile Polish**: Direct touch feedback on cards, overflow-protected flash toast notifications (<360px viewports), and full PWA webmanifest suite.

