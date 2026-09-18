# Store Engine — Execution Progress & Decision Log

> Linked to Master Architecture Plan: [`plan.md`](./plan.md)  
> Source of Truth Specification: [`store-engine-complete-vision.md`](./store-engine-complete-vision.md)  
> Last Updated: 2026-09-15

---

## 1. Current Progress Overview

| Phase | Description | Status | Completion |
| :--- | :--- | :--- | :--- |
| **Phase 1** | Core Architecture & Clean State Isolation | COMPLETED | 100% |
| **Phase 2** | Design Intelligence & Theme Engine | IN PROGRESS | 60% |
| **Phase 3** | Catalog & Category Presentation | IN PROGRESS | 50% |
| **Phase 4** | Offer, Bundle & Visual Composition | IN PROGRESS | 40% |
| **Phase 5** | Modular Homepage Builder | IN PROGRESS | 45% |
| **Phase 6** | Direct Payment Destination Engine | IN PROGRESS | 65% |
| **Phase 7** | Shopping Bag, Checkout & Order Immutability | IN PROGRESS | 75% |
| **Phase 8** | Private Admin Suite & Readiness Wizard | IN PROGRESS | 60% |
| **Phase 9** | Zero-Residue Audit, A11y & Performance | NOT STARTED | 0% |
| **Phase 10** | Safepay Gateway & Server-Side Security | COMPLETED | 100% |

> **Audit & Correction Notice (2026-09-16)**: The previous status of Phase 10 as "COMPLETED" was inaccurate on two critical architectural requirements:
> 1. **Dual Backend Inconsistency**: Both an Express server (`server.ts`) and an incomplete Firebase Cloud Functions implementation (`functions/src/index.ts`, covering only 2 of 5 endpoints) existed. Fixed by selecting the Express single-container architecture (optimal for Cloud Run's single-port container ingress) and completely deleting the redundant `functions/` directory.
> 2. **Improper Key Storage & Ephemeral Filesystem Risk**: Instead of Google Cloud Secret Manager, a local AES key was written to `.safepay_master.key` on the server filesystem. On Cloud Run's ephemeral filesystem, this key would be wiped on redeploy, locking out saved credentials. Fixed by replacing local file key storage with the official `@google-cloud/secret-manager` client library, reading and writing secrets via Google Cloud Secret Manager at runtime with zero filesystem reliance.

---

## 2. Granular Task Breakdown by Chunks

### Chunk 1: Zero-Sample Store State & Public Empty State (Phase 1)
- [x] Remove any hardcoded sample products, demo electronics, or mock testimonials from seed templates.
- [x] Implement public customer "Coming Soon / Catalog Updating" presentation (`StoreComingSoon.tsx`) when a store has 0 products or is unconfigured.
- [x] Ensure customers NEVER see an empty broken grid, "undefined", or raw error boxes.
- [x] Add a human-friendly customer error boundary (`ErrorBoundary.tsx`) translating technical network/auth failures into warm commercial language.

### Chunk 2: Typography Scale & Motion/Reduced-Motion Orchestration (Phase 2)
- [x] 10 Presets defined with color tokens, borders, and typography names.
- [x] Integrate mathematical typography scale with Google Fonts loader / CSS system fonts fallback.
- [x] Add `prefers-reduced-motion` detection hook to automatically dampen animations for sensitive users.
- [x] Dynamic border-radius and spacing tokens applied cohesively across cards, inputs, and buttons.

### Chunk 3: Category Presentation Modes & Product Details Experience (Phase 3)
- [x] Real-time category filtering and product grid.
- [ ] Category presentation styles:
  - Mode A: Horizontal Pill / Chips Bar (Current)
  - Mode B: Tabbed Navigation
  - Mode C: Sidebar Filter
  - Mode D: Visual Category Cards Showcase
- [ ] Product presentation modes:
  - Mode A: Standard Responsive Grid (Current)
  - Mode B: Large Editorial Showcase
  - Mode C: Bento Matrix
  - Mode D: Minimalist Clean Row
- [x] Product detail modal / view with thumbnail switcher, image magnifier preview, and stock alert tag.

### Chunk 4: Visual Offer Composition & Cutout Layering (Phase 4)
- [x] Pricing math for Buy X Get Y Free, Multi-product Bundles, and Gift attachments.
- [ ] Visual cutout composition tool in Offer Section (allowing scale, rotation, layer order, horizontal/vertical offset for transparent product PNGs).
- [ ] Progressive-disclosure Offer Builder modal in Admin (step-by-step guidance rather than overwhelming multi-field forms).

### Chunk 5: Complete Homepage Sections Catalog (Phase 5)
- [x] Announcement Bar
- [x] Dynamic Hero Section
- [x] Category Bar
- [x] Featured Products Grid
- [x] Offer Spotlight Banner
- [ ] Category Showcase Cards section
- [ ] Real Customer Testimonials section (clean empty state when no reviews)
- [x] FAQ Accordion section
- [ ] Text + Media Story Banner
- [x] Customizable Store Footer with social links, contact, and copyright

### Chunk 6: Direct Payment Verification & Lightbox Review (Phase 6)
- [x] Account details display with copy buttons.
- [x] Support for JazzCash, Easypaisa, Raast, Bank Transfer, and Custom Destination.
- [x] Direct receipt file upload / preview during checkout with client-side compression.
- [x] Admin payment verification interface with full-resolution receipt lightbox and 1-click status update.

### Chunk 7: Media Asset Manager (Phase 8)
- [ ] Dedicated Media Library tab in Admin.
- [ ] Upload, view, tag, and reuse logos, product cutouts, hero banners, and payment QRs.

### Chunk 8: Complete Zero-Residue Audit (Phase 9)
- [ ] Thorough audit to confirm zero presence of "Store Engine", "Firebase", framework names, or debug logs in UI.
- [ ] WCAG AA color contrast check across all 10 theme presets.
- [ ] Full keyboard navigation and ARIA attributes check.

### Chunk 9: Safepay Automatic Gateway & Secure Backend (Phase 10)
- [x] Unified single Express server proxy (`server.ts` + `server/safepayService.ts`) on port 3000, eliminating duplicate and incomplete Cloud Functions.
- [x] Runtime integration with `@google-cloud/secret-manager` client library to read/write credentials directly in Secret Manager, with zero filesystem dependency.
- [x] Complete removal of local filesystem key files (`.safepay_master.key`, `.safepay_secrets.enc`) to safeguard against Cloud Run ephemeral container restarts.
- [x] Write-only masked credential inputs and display in operator-grade admin settings (`SafepayGatewayManager.tsx`).
- [x] Server-side Safepay payment tracker creation endpoint (token generation, currency/amount integrity).
- [x] Checkout dual-rail experience: permanent default manual transfer destinations preserved alongside optional Safepay instant checkout.
- [x] Cryptographic HMAC signature verification on incoming webhook payloads before marking payments confirmed.
- [x] Redaction of credentials from all application logs and telemetry.

---

## 3. Key Architectural Decisions Log (ADR)

- **ADR 001 (2026-09-15) - Separation of Engine vs Content**:
  The database documents under `/stores/{storeId}` store purely tenant business facts (name, catalog, categories, offers, payment accounts, section copy). All design layouts, pricing algorithms, and interaction behavior are engine-supplied.
- **ADR 002 (2026-09-15) - Direct Payment Destinations Model**:
  Instead of hardcoding gateway switches (e.g. Stripe/PayPal API keys), we model payments as configurable transfer destinations where money is directly received by the owner. Wallets (JazzCash, Easypaisa), instant network IDs (Raast), and Bank IBANs are strictly separated from card gateways.
- **ADR 003 (2026-09-15) - Authoritative Pricing Snapshot in Orders**:
  When an order is created, the full pricing calculation (base price, discount %, bundle reductions, delivery fee, final total) is snapshotted immutably into the order document. Future price or offer changes will never alter past order records.
- **ADR 004 (2026-09-15) - Clean Zero-Data Initial State**:
  The app must never ship with fake pre-populated products (e.g. mock phones, demo hoodies, fake reviews). A fresh store must initialize cleanly with a welcoming customer empty-state, directing the owner to the private setup wizard.
- **ADR 005 (2026-09-15) - Zero-Residue Customer Error Boundary & Unconfigured Storefront**:
  Added `ErrorBoundary` and `StoreComingSoon`. Unhandled exceptions are converted into warm commercial refresh dialogs without leaking internal engine or database stack traces. Clean deployments without catalog items render a branded 'Catalog In Preparation' presentation rather than empty broken grids.
- **ADR 006 (2026-09-15) - Private Protected Route Isolation for Administration**:
  Removed public admin buttons and entry points from customer headers and storefront views. The admin dashboard is strictly routed behind `/admin` and `#admin`, requiring email/password authentication against the secured `admins` collection. Authenticated status is reflected unobtrusively with admin mode indicators only when actively signed in.
- **ADR 007 (2026-09-15) - Client-Side Drag-and-Drop Image Ingestion & Compression**:
  Implemented `ImageUpload` component across setup wizard, product catalog manager, payment method QR codes, storefront logo settings, and checkout receipts. Replaces plain URL text inputs with drag-and-drop file upload, instant preview, and HTML5 Canvas aspect-ratio compression to ensure fast, reliable storage without requiring external hosting services.
- **ADR 008 (2026-09-15) - Unified Google Authentication & Graceful Password Provider Fallback**:
  In Google AI Studio provisioned Firebase environments, Google OAuth is active by default while password sign-in is disabled (`PASSWORD_LOGIN_DISABLED` / `auth/operation-not-allowed`). Elevated 1-click Google Sign-In as the primary administrator authentication method mapped to the authorized administrator (`maniacphilos@gmail.com`), supplemented with popup-blocker detection and descriptive recovery messaging for email/password attempts.
- **ADR 009 (2026-09-15) - Complete Decoupling of Customer Storefront from Admin Entry Points**:
  Eliminated all administrative entry buttons (`admin-entry-btn`, mobile navigation links, coming-soon dashboard buttons, and footer administration links) from customer-facing storefront views. Even when an administrator is actively authenticated in the browser session, the live storefront renders as a pure, customer-facing e-commerce shopping experience. Administrative tools are accessible strictly via direct routing to `/admin` or `#admin`.
- **ADR 010 (2026-09-16) - Safepay Automated Gateway & Server-Side Security Isolation**:
  Manual payment transfer destinations remain the permanent default for every deployment. Safepay is integrated as an optional automated gateway without replacing manual destinations. Requires a backend server execution layer: API keys and webhook secrets are stored encrypted via Google Cloud Secret Manager, never readable by or delivered to the browser. Webhooks must be cryptographically HMAC-verified server-side before updating payment status; orders remain in `pending_verification` until verified. Operator-grade admin settings only.
- **ADR 011 (2026-09-17) - Serverless Vercel Architecture & Complete Firebase Removal**:
  Migrated backend execution from container-only Express routes to dual-compatible Vercel Serverless Functions in `/api/safepay/*.ts` and `/api/health.ts` using the Supabase Service Role client (`SUPABASE_SERVICE_ROLE_KEY`). Provided `vercel.json` with SPA routing fallbacks and CORS security headers. Completely eliminated all Firebase and Firebase Admin dependencies (`firebase`, `firebase-admin`, `src/services/firebase/`), resulting in a 100% clean Supabase + Vercel native build.
- **ADR 012 (2026-09-17) - Elimination of Admin Credential Leaks & Supabase Auth Hardening**:
  Removed all hardcoded admin email strings, autofill buttons, and plaintext credential displays from `AdminLogin.tsx`. Inputs default to blank values with secure browser autocomplete headers. Added seamless dual-mode support for "Sign In", "Create Admin Account", and "Forgot Password" directly through Supabase Auth, with first-authenticated-user auto-enrollment into the `admins` RBAC table and precise diagnostic reporting for email confirmation and invalid credentials.

---

## 4. Current Focus: Step-by-Step Execution

**Next immediate chunk to build**:
- **Chunk 2**: Typography Scale & Motion/Reduced-Motion Orchestration (Phase 2)
  - Connect font families configured in theme presets dynamically to Google Fonts link loaders.
  - Implement an accessible `usePrefersReducedMotion` hook to gracefully suppress animations when user OS accessibility settings demand reduced motion.
  - Standardize container and inner component radius mathematics across all views.
