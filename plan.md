# Store Engine — Comprehensive Architecture & Execution Plan

> Derived directly from `/store-engine-complete-vision.md` (The 101-Point Product Vision & Functional Specification).
> Source of truth for product capabilities, domain objects, and phased delivery.
> Real-time execution tracking, status updates, and architectural decisions are maintained in [`progress.md`](./progress.md).

---

## 1. Executive Summary & Product Principles

The **Store Engine** is a **reusable, configurable e-commerce commerce machine** with an engine-supplied visual intelligence and storefront attached to it.

### Core Non-Negotiable Tenets:
1. **Engine vs. Content**: The engine controls behavior, algorithms, responsive rules, motion, layout intelligence, and security. The store owner supplies branding, catalog, prices, offers, rules, and payment destinations.
2. **Zero Pre-Populated Sample Store**: No fake electronics, demo clothing, mock testimonials, placeholder reviews, or sample orders. Initial deployment must be a clean, unconfigured state with polished empty states ("Store coming soon" or elegant unconfigured banner for visitors; configuration checklist for the owner).
3. **Zero Technical Residue**: The public customer must experience a 100% normal online store. Never leak "Store Engine", "Powered by Firebase", framework names, internal IDs, or developer jargon into customer or admin interfaces.
4. **Configured Payment Destinations (Not Gateway Toggles)**: Payments are destinations where the owner receives money (bank transfer, Raast, JazzCash, Easypaisa, custom IBAN/wallet). Distinct rails (wallets vs. true card processing).
5. **Authoritative Central Calculation**: Single source of truth for all pricing, discounts, tiered offers, bundle rewards, delivery thresholds, and order snapshots. No disparate client math.
6. **Visual Composition Engine**: Offer builder with progressive disclosure and dynamic visual composition (clean, floating, stacked, bundle-hero, sale-burst, minimal-premium) supporting transparent product cutout offsets.
7. **Controlled Freedom Homepage**: Section-based modular assembly (hero, announcement, featured products, category showcase, offer spotlight, testimonials, FAQ, text/media banners, footer) with focused visual controls, not a freeform broken canvas.

---

## 2. Object Model Specification

| Object | Responsibilities & Invariants |
| :--- | :--- |
| **Store** | Identity, name, currency, logo, favicon, contact, social links, status (`unconfigured`, `live`, `maintenance`). |
| **Theme** | Visual preset, typography pairing, border-radius scale, spacing rhythm, 2–5 brand color derivation, CSS root tokens. |
| **Category** | Name, slug, description, image, display priority, active status. Completely decoupled from presentation style. |
| **Product** | Title, slug, description, images (reorderable, primary index), base price, compare-at price, discount %, categories, SKU, stock status (`available`, `unavailable`, `out_of_stock`, `hidden`), track inventory number (optional). |
| **Variant** | Future-ready dimensions (size, color, material, storage) with distinct SKU, price delta, and stock. |
| **Offer / Bundle** | Deal types: `free_quantity` (Buy X Get Y Free), `bundle` (Multi-product at original/discounted/custom price), `free_product` (Buy A Get B Free), `percentage_discount`. Visual composition rules & cutout coordinates. |
| **Cart** | Client-side reactive session state with authoritative price evaluation, item quantity management, reward synchronization. |
| **Order** | Immutable commercial record snapshot: customer details, items snapshot (price at purchase time), applied offer ledger, subtotal, delivery fee, payment destination chosen, transaction reference, payment receipt upload, lifecycle status, payment verification status. |
| **Payment Destination** | Type (`bank_transfer`, `raast`, `jazzcash`, `easypaisa`, `nayapay`, `custom_transfer`), title, account number/IBAN, bank name, instructions, QR image, verification requirements (proof upload, TID). Permanent default payment rails. |
| **Gateway Configuration (Safepay)** | Optional automated gateway settings: enabled status, environment mode (`sandbox` / `production`), encrypted credentials (API key & webhook secret references), webhook URL, currency rules. Coexists alongside manual payment destinations. |
| **Delivery Rule** | Model (`no_delivery`, `free`, `flat_fee`, `threshold_free`), rates, delivery estimate copy. |
| **Homepage Section** | Type (`hero`, `announcement`, `featured_products`, `product_grid`, `category_showcase`, `offer_banner`, `testimonials`, `faq`, `footer`, etc.), title, subtitle, sort order, enabled status, type-specific configuration. |
| **Media Asset** | Central reusable asset library (logos, product photography, banners, QR codes, receipts) with tag categorization. |

---

## 3. Phased Execution Roadmap

### Phase 1: Core System Architecture & Clean State Isolation (Foundation)
- [x] Firestore security rules & RBAC admin gating (`firestore.rules`).
- [x] Application routing & navigation state model (`App.tsx`).
- [x] Zero-data clean store state isolation (Strictly removing hardcoded demo assumptions).
- [ ] Elegant public empty state when unconfigured ("Opening Soon" / "Catalog in preparation").
- [ ] Error boundary with natural, human customer language (no raw stack traces or database codes).

### Phase 2: Design Intelligence & Theme Derivation Engine
- [x] 10 Curated Theme Presets with comprehensive token mappings.
- [x] Automatic UI color derivation from 2–5 primary brand colors.
- [ ] Typography scale & pairing system with accessible contrast enforcement.
- [ ] Motion & animation orchestrator with OS-level `prefers-reduced-motion` compliance.

### Phase 3: Catalog & Category Management Engine
- [x] Category schema & admin management with sorting.
- [x] Product schema with pricing, compare-at, SKU, inventory, and multiple image gallery.
- [ ] Category presentation switcher (chips, tabs, sidebar, cards showcase).
- [ ] Product presentation styles (compact, standard grid, large cards, editorial, bento matrix).
- [ ] Product detail view with gallery thumbnails, zoom, offer incentives, and availability tags.

### Phase 4: Authoritative Offer, Bundle & Composition Engine
- [x] Mathematical pricing engine with single-source calculation (`pricingEngine.ts`).
- [x] Buy X Get Y Free logic (1–999 quantity limits).
- [x] Multi-product bundle calculation (combined original, percentage off, custom price).
- [x] Buy A Get B Free product rewards.
- [ ] Visual composition editor with transparent cutout controls (offset, scale, rotation, layer order).
- [ ] Progressive-disclosure Offer Builder in Admin.

### Phase 5: Modular Homepage Builder
- [x] Homepage section schema and ordering state.
- [x] Hero section variations (product spotlight, split banner, centered editorial).
- [x] Announcement bar with link support.
- [ ] Full section catalog:
  - Category showcase cards
  - Dynamic offer spotlight / bundle hero
  - Text + Media story banner
  - FAQ accordion
  - Testimonial highlights (real customer reviews, not fake demo copy)
  - Customizable footer
- [ ] Admin section manager with live drag-or-toggle reordering and dedicated section inspector.

### Phase 6: Direct Payment Destination Engine
- [x] Payment destination configuration model (JazzCash, Easypaisa, Raast, Bank IBAN, custom rails).
- [x] Clear payment rail separation (wallet/transfer vs card processing).
- [x] Payment instructions display with account copy actions and QR code preview.
- [ ] Receipt screenshot upload & transaction reference validation during checkout.
- [ ] Admin payment verification interface with proof image lightbox and status transitions.

### Phase 7: Shopping Bag, Checkout & Order Immutability
- [x] Reactive cart drawer with threshold progress bar.
- [x] Clean checkout form with configurable required customer fields.
- [x] Immutable order creation snapshot capturing exact commercial terms.
- [x] Customer order confirmation and status tracking view.
- [x] Admin order fulfillment dashboard with status progression (`pending` -> `confirmed` -> `processing` -> `shipped` -> `delivered`).

### Phase 8: Private Administration Suite & Store Readiness
- [x] Google Auth admin login gating.
- [x] Guided 10-step launch readiness wizard.
- [x] Admin dashboard operational overview (real orders, pending verification, catalog count).
- [ ] Media asset management module (upload, categorize, reuse across sections).
- [ ] Store publishing & maintenance mode toggles.

### Phase 9: Quality, Accessibility & Zero-Residue Polish
- [ ] Audit all strings to eliminate any trace of developer terminology, framework names, or debug logs.
- [ ] Keyboard navigation, screen-reader labels (`aria-*`), and focus rings across all interactive controls.
- [ ] Performance audit: responsive image sizing, lazy loading, lightweight bundle.

### Phase 10: Automatic Gateway Integration — Safepay (Server-Side Architecture & Webhook Verification)
- [x] Backend server / cloud function service layer for server-side execution and secret isolation (zero client exposure).
- [x] Secure encryption at rest for Safepay API Key and Webhook Secret using Google Cloud Secret Manager / AES-256-GCM (never stored plaintext in Firestore alongside tenant data).
- [x] Masked credentials lifecycle: write-only admin configuration inputs, masked display (`••••••••`), and strict sanitization/redaction from logs and error payloads.
- [x] Server-side Safepay payment tracker initialization endpoint (session creation, token generation, currency & amount validation).
- [x] Dual-rail checkout experience: permanent default manual payment destinations preserved alongside optional Safepay instant checkout (cards, JazzCash, Easypaisa).
- [x] Server-side webhook listener with cryptographic HMAC signature verification before updating order payment status.
- [x] Tamper-resistant payment reconciliation: orders remain in `pending_verification` until verified by server webhook; client redirects treated as status triggers only.
- [x] Operator-grade admin settings panel: lean, functional configuration UI for enabling/disabling gateway, environment selection (`sandbox` vs `production`), and rotating credentials.

---

## 4. Work Protocol & Focus Strategy
To prevent regressions, avoid file oscillation, and build steadily:
1. **One Chunk at a Time**: Pick one module from the current phase, define its exact boundaries, and execute it with full craftsmanship.
2. **Build on Top**: Extend existing modular services without destroying working integrations.
3. **Log Progress**: Document all completed features, in-progress items, and architectural decisions in `progress.md`.
