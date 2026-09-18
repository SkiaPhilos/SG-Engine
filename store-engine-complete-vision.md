# Store Engine --- Complete Product Vision & Functional Specification

## Document purpose

This document defines the **Store Engine** as a product from first
principles.

It is intentionally written as a **vision and behavior specification**,
not as an implementation tutorial.

It does not prescribe a particular framework, database, hosting
provider, AI product, or deployment platform. The implementation
technology can be selected later according to the requirements of the
finished system.

The goal is similar to defining a mature application such as a
spreadsheet program from scratch:

-   what the application is;
-   what objects exist;
-   what each object contains;
-   where those objects appear;
-   what users can do with them;
-   how different objects interact;
-   how the interface behaves;
-   what happens in unusual situations;
-   what the public customer experience looks like;
-   what the private administrator experience looks like;
-   and what the system must never expose to customers.

This document should be treated as the source of truth for the **product
vision**.

------------------------------------------------------------------------

# 1. What the product is

The product is a **reusable, configurable e-commerce store engine**.

It is not:

-   one particular store;
-   a pre-filled electronics store;
-   a clothing-store template with fixed categories;
-   a website mockup;
-   a generic drag-and-drop website builder;
-   a Shopify clone;
-   a marketplace;
-   an AI-generated website;
-   or a collection of unrelated pages.

It is a **store system whose structure and visual intelligence are built
once, while the business content is supplied by the store owner**.

The same engine can become many different stores.

For example:

``` text
Store Engine
    |
    +-- Store Instance A → Clothing
    |
    +-- Store Instance B → Electronics
    |
    +-- Store Instance C → Cosmetics
    |
    +-- Store Instance D → Furniture
```

The engine remains the same.

The following can change completely between instances:

-   store name;
-   logo;
-   colors;
-   typography preferences;
-   categories;
-   products;
-   images;
-   prices;
-   discounts;
-   offers;
-   delivery rules;
-   payment destinations;
-   homepage content;
-   navigation;
-   product presentation;
-   promotional content.

The application should therefore be thought of as:

> **A configurable commerce machine with a professionally designed
> storefront attached to it.**

------------------------------------------------------------------------

# 2. The most important distinction: engine versus content

The system has two conceptual layers.

## 2.1 Engine

The engine provides the behavior and design intelligence.

It knows how to:

-   display products;
-   calculate prices;
-   apply discounts;
-   construct bundles;
-   display offers;
-   manage categories;
-   render navigation;
-   build a homepage from configured sections;
-   calculate delivery;
-   create orders;
-   display payment destinations;
-   collect payment evidence;
-   authenticate administrators;
-   manage media;
-   animate interfaces;
-   adapt layouts to different screen sizes.

## 2.2 Store content

The store supplies the information.

For example:

``` text
Store name: Example Boutique
Category: Men's Wear
Product: Linen Shirt
Price: Rs. 4,500
Offer: Buy 2, get 1 free
Payment destination: configured by owner
```

The engine does not care whether the product is a shirt, phone, perfume,
chair, or food item.

This separation is fundamental.

------------------------------------------------------------------------

# 3. The public website must be a normal store

A customer must experience the application as an ordinary professional
online store.

There must be no visible indication that the website is powered by a
reusable store engine.

Do not display:

-   "Store Engine";
-   "Template";
-   "Powered by \[technology\]";
-   database names;
-   API names;
-   framework names;
-   development terminology;
-   configuration IDs;
-   debug information;
-   internal object names;
-   implementation notes;
-   technical explanations;
-   developer comments rendered into the interface.

The customer should simply see a store.

------------------------------------------------------------------------

# 4. The private administrator experience

The administrator enters the private administration area through a
non-publicly advertised route.

Examples may include:

``` text
/admin
/admin-login
/login-admin
```

The exact route is an implementation decision.

However:

> The route being obscure is not a security mechanism.

Actual authentication and authorization are required.

A customer who does not authenticate as an administrator must never gain
access to administration functionality merely by discovering the URL.

The public storefront and administration system should feel like two
different experiences built on the same underlying system.

------------------------------------------------------------------------

# 5. Absolutely no sample store

The application must **not** be delivered as an already-created store.

Do not populate it with:

-   fake products;
-   fake prices;
-   fake categories;
-   fake testimonials;
-   fake orders;
-   fake customers;
-   fake payment destinations;
-   fake business information;
-   placeholder electronics;
-   placeholder clothing;
-   example logos;
-   example store names.

There should be no hidden demo store pretending to be real content.

The initial state should be a **clean, unconfigured store instance**.

It may contain the engine's default visual system, but it must not
contain business data.

------------------------------------------------------------------------

# 6. No user-facing technical notes

This is a strict requirement.

The application must not leave notes for the store owner or customer
explaining how the system works internally.

Do not display things such as:

-   "This feature uses API X";
-   "Images are stored using Y";
-   "This animation uses Z";
-   "The site uses a database";
-   "This payment feature is powered by...";
-   "This is using AI";
-   "This section is generated by...";
-   "X dB is used";
-   "The backend does...";
-   "The frontend does...";
-   "Firebase is connected";
-   "Your request was sent to...";
-   "Powered by...";
-   technical implementation warnings that are irrelevant to the user.

The product must look and behave like finished professional software.

Technical information may exist in source code, developer documentation,
logs, monitoring systems, or internal documentation where appropriate.

It must not leak into the customer-facing product.

The same principle applies to the administrator UI: the owner needs to
know **what a setting does**, not which API or framework implements it.

For example, write:

> "Enable customer payment receipt upload"

not:

> "Enable Firebase Storage receipt uploads."

Write:

> "Upload a payment QR code"

not:

> "Upload a QR image that will be stored in cloud storage."

The first is product language.

The second is implementation language.

------------------------------------------------------------------------

# 7. Empty-state philosophy

A newly installed store should look intentional rather than broken.

The storefront may have a clean empty-state presentation such as:

> Store name\
> Coming soon

or an equivalent polished state.

It must not show:

-   broken cards;
-   "undefined";
-   empty database errors;
-   fake products;
-   placeholder lorem ipsum;
-   developer instructions;
-   "add your first product here" to customers;
-   configuration controls.

The administrator, however, should clearly see that the store still
needs configuration.

------------------------------------------------------------------------

# 8. The conceptual object model

The system should be built around clear objects.

Core objects include:

``` text
Store
Theme
Navigation
Homepage
Section
Media Asset
Category
Product
Product Variant
Discount
Offer
Bundle
Cart
Checkout
Customer
Order
Payment Destination
Delivery Rule
Administrator
```

Not every object needs to become a separate visible screen.

The purpose of defining them separately is to keep the system
understandable and extensible.

------------------------------------------------------------------------

# 9. Store

A Store represents one complete storefront.

It contains:

-   identity;
-   branding;
-   visual configuration;
-   navigation;
-   homepage configuration;
-   product catalog;
-   categories;
-   offers;
-   checkout configuration;
-   delivery configuration;
-   payment destinations;
-   store status.

The store name is editable.

Nothing should assume a particular business name.

------------------------------------------------------------------------

# 10. Store identity

The owner can configure:

-   store name;
-   logo;
-   favicon;
-   short description;
-   contact information;
-   customer-support information;
-   optional social links;
-   currency;
-   general business information where needed.

The system should not force unnecessary fields.

If a field is not needed, it should not make the store look incomplete.

------------------------------------------------------------------------

# 11. Theme

A Theme describes the visual language of the store.

It should control more than just colors.

A theme may influence:

-   colors;
-   typography;
-   button appearance;
-   card appearance;
-   borders;
-   corner radius;
-   shadows;
-   spacing;
-   navigation style;
-   product-card style;
-   section treatment;
-   badges;
-   forms;
-   checkout presentation;
-   animation intensity;
-   image treatment.

A theme should feel internally coherent.

Changing a theme should not require redesigning each page manually.

------------------------------------------------------------------------

# 12. Preset themes

The engine should include professionally designed visual presets.

Presets are not merely collections of random hex values.

Each preset should represent a complete design language.

Potential conceptual presets include:

-   Minimal Commerce;
-   Dark Luxury;
-   Modern Tech;
-   Warm Editorial;
-   Soft Boutique;
-   Bold Retail;
-   Clean Premium;
-   Contemporary Market;
-   Elegant Neutral.

The names are examples, not mandatory final names.

Each preset should have coordinated values for:

-   primary;
-   secondary;
-   accent;
-   background;
-   surface;
-   text;
-   muted text;
-   border;
-   success;
-   warning;
-   error.

Presets should be attractive without requiring customization.

------------------------------------------------------------------------

# 13. Custom color system

The owner must also be able to create a custom brand palette.

Do not restrict them to preset themes.

Allow a color selector and HEX input.

The owner should choose approximately **2--5 brand colors**.

The interface can derive supporting UI colors automatically.

For example:

``` text
Brand colors
    ↓
Primary UI color
Secondary UI color
Accent
Surface/background treatment
Text treatment
```

The system should not force the owner to manually specify twenty colors.

The owner supplies the brand identity.

The engine translates it into a coherent interface.

The owner is allowed to choose bad combinations.

The system should not silently replace their choices with a different
brand identity.

It may warn about readability where appropriate, but it should not
hijack the design.

------------------------------------------------------------------------

# 14. Typography

Typography should be treated as part of the visual system.

The theme may control:

-   heading family;
-   body family;
-   weight;
-   scale;
-   line height;
-   letter spacing;
-   heading treatment.

The goal is not to provide hundreds of confusing font controls.

Provide sensible curated options and sensible defaults.

Typography should change the character of the store while preserving
usability.

------------------------------------------------------------------------

# 15. Spacing and shape language

The theme should define a consistent spatial system.

This includes:

-   section spacing;
-   card padding;
-   button padding;
-   grid gaps;
-   border radius;
-   image corner treatment;
-   form spacing.

The store should not contain one card with 4px corners, another with
32px corners, and another with no coherent shape language unless that is
deliberately part of a chosen design preset.

------------------------------------------------------------------------

# 16. Navigation

Navigation is part of the store's information architecture.

It can contain:

-   homepage;
-   categories;
-   selected pages/sections;
-   search;
-   cart.

The owner should be able to decide what is visible.

Navigation should adapt to available content.

If there are no categories, the navigation should not display an empty
category menu.

If search is disabled, search should not appear.

------------------------------------------------------------------------

# 17. Categories

Categories are pure store data.

The engine must not assume category names.

Examples are only illustrative:

``` text
Men
MEN
Accessories
New Arrivals
Summer
Kitchen
Phones
Books
```

All of these should be valid category names.

Category data and category presentation must remain separate.

------------------------------------------------------------------------

# 18. Category presentation

The same categories can be presented differently.

Possible presentations:

-   navigation links;
-   tabs;
-   filter chips;
-   sidebar;
-   dropdown;
-   category cards;
-   homepage category showcase;
-   no visible category navigation.

The owner chooses how categories are exposed.

The underlying category objects do not change merely because their
presentation changes.

------------------------------------------------------------------------

# 19. Products

A Product represents something the customer can purchase.

Core information includes:

-   name;
-   description;
-   price;
-   images;
-   categories;
-   availability;
-   stock where relevant;
-   SKU/reference where relevant;
-   status;
-   optional comparison price;
-   optional discount;
-   optional variants.

The product editor should be understandable to a non-technical owner.

------------------------------------------------------------------------

# 20. Product images

A product can have multiple images.

The owner can:

-   upload;
-   remove;
-   reorder;
-   select the primary image.

The system should handle the presentation.

The owner should not need to manually resize an image for every screen.

------------------------------------------------------------------------

# 21. Product presentation presets

Product data should be separate from visual presentation.

Possible presentation styles:

-   compact;
-   standard;
-   large;
-   editorial;
-   classic;
-   modern;
-   bento;
-   featured;
-   minimal.

These presets should control things such as:

-   image-to-text ratio;
-   card proportions;
-   metadata density;
-   button placement;
-   image cropping;
-   spacing;
-   badge position.

They should not modify the underlying product.

------------------------------------------------------------------------

# 22. Product detail page

A product page should normally contain:

-   product image gallery;
-   product name;
-   price;
-   original/comparison price if applicable;
-   discount;
-   description;
-   category;
-   quantity control;
-   purchase/add-to-cart action;
-   applicable offers;
-   relevant availability information.

The exact layout can change according to the chosen presentation
language.

------------------------------------------------------------------------

# 23. Individual discounts

A product can have its own discount.

The owner can choose:

-   no discount;
-   1--100%.

The customer should see the resulting price clearly.

For example:

``` text
Original price
↓
Discount
↓
Current price
```

Individual product discounts are separate from promotional offers.

------------------------------------------------------------------------

# 24. Offers are a separate system

Offers must not be reduced to a single "discount" field.

An offer can change:

-   what products are involved;
-   what quantity is involved;
-   what the customer receives;
-   how pricing is calculated;
-   how the promotion is displayed.

The offer engine should be generic enough that new offer types can be
added later.

------------------------------------------------------------------------

# 25. Offer builder philosophy

The owner should not have to understand database structures.

Instead, the offer builder should ask logical business questions.

For example:

``` text
What would you like to offer?

[ Bundle products ]
[ Give a free product ]
[ Give additional quantity ]
[ Discount a combination ]
```

Then progressively reveal relevant controls.

The UI should not present every possible setting at once.

------------------------------------------------------------------------

# 26. "Get extra free" offers

Support offers where a product provides additional free quantity.

Example:

``` text
Buy this product
Get +1 free
```

The quantity should initially support:

``` text
1–999
```

The underlying representation should not make 999 a fundamental
architectural limitation.

The limit is a product/UI constraint that can be changed later.

------------------------------------------------------------------------

# 27. Bundles

A bundle combines two or more products into one promotional purchase.

Example:

``` text
Product A
+
Product B
=
Bundle
```

The owner selects the products.

Then chooses how the bundle is priced.

------------------------------------------------------------------------

# 28. Bundle pricing rules

Support at least:

### Combined original price

The bundle costs the combined product prices.

### Percentage discount

Example:

``` text
Combined value: Rs. 120,000
Bundle discount: 10%
Final bundle price: Rs. 108,000
```

### Custom price

Example:

``` text
Combined value: Rs. 120,000
Bundle price: Rs. 99,999
```

The pricing engine must calculate the final amount centrally.

------------------------------------------------------------------------

# 29. Free-product offers

Support:

``` text
Buy Product A
Get Product B FREE
```

The offer should understand:

-   qualifying product;
-   reward product;
-   reward quantity;
-   pricing treatment;
-   visual presentation.

It should not be a special hardcoded "Phone + AirPods" feature.

Any two compatible products should be able to participate.

------------------------------------------------------------------------

# 30. Offer visual composition

Promotions should not merely appear as text.

The engine should have visual composition presets.

Examples:

-   clean;
-   floating;
-   stacked;
-   dynamic;
-   bundle hero;
-   sale burst;
-   premium minimal.

The owner supplies product imagery.

The engine determines how the assets are composed.

------------------------------------------------------------------------

# 31. Transparent product cutouts

The system should work well with transparent-background product images.

For example, the owner may upload a product cutout.

The engine can place it inside a promotional composition.

Possible controls:

-   scale;
-   rotation;
-   position;
-   layer order;
-   horizontal offset;
-   vertical offset.

The system should be able to create a visually convincing composition
without requiring the owner to use Photoshop.

------------------------------------------------------------------------

# 32. Offer composition example

Conceptually:

``` text
             PRODUCT A
                +
         PRODUCT B
           slightly lower

             FREE
```

The actual composition should be visually polished.

The product engine should not permanently alter the source image.

The composition is a presentation layer.

------------------------------------------------------------------------

# 33. Homepage

The homepage is assembled from controlled sections.

It is not a blank canvas.

The owner can choose:

-   which sections exist;
-   their order;
-   their content;
-   their products;
-   their categories;
-   their images;
-   their text;
-   their presentation style.

The engine controls the underlying layout system.

------------------------------------------------------------------------

# 34. Homepage section types

Potential sections include:

-   announcement bar;
-   hero;
-   featured products;
-   product grid;
-   category showcase;
-   promotional offer;
-   bundle showcase;
-   image and text;
-   image banner;
-   video section;
-   testimonials;
-   FAQ;
-   newsletter/contact section;
-   footer.

Not every store needs every section.

------------------------------------------------------------------------

# 35. Section editing

Each section should have a focused editor.

For example, a hero editor might contain:

``` text
Heading
Subheading
Image
Optional video
Primary action
Secondary action
Alignment
Presentation style
```

It should not expose unrelated database or implementation settings.

------------------------------------------------------------------------

# 36. Hero sections

Hero sections should feel like professionally designed storefront hero
areas.

Possible variations:

-   centered;
-   split image/text;
-   full-width image;
-   product-focused;
-   editorial;
-   minimal;
-   promotional.

The engine should supply responsive behavior automatically.

------------------------------------------------------------------------

# 37. Automatic visual intelligence

The central value of the engine is that the owner supplies content while
the engine supplies design intelligence.

For example:

Owner uploads:

``` text
Logo
Product image
Product name
Price
```

The system determines:

-   appropriate card layout;
-   image treatment;
-   spacing;
-   typography;
-   price hierarchy;
-   badges;
-   responsive behavior;
-   hover behavior;
-   animation.

The owner should not need to manually design each item.

------------------------------------------------------------------------

# 38. Animation system

Animations are built into the engine.

Possible behaviors:

-   subtle section entrance;
-   product card reveal;
-   hover movement;
-   image zoom;
-   button feedback;
-   cart transitions;
-   drawer transitions;
-   offer emphasis;
-   smooth category switching;
-   hero movement.

Animations should be restrained and professional.

There should be a sensible relationship between:

``` text
Brand personality
+
Theme
+
Motion
```

------------------------------------------------------------------------

# 39. Reduced-motion support

If a user has requested reduced motion at the operating-system/browser
level, the storefront should respect it.

Animations should degrade gracefully.

The store must remain fully usable without animation.

------------------------------------------------------------------------

# 40. Search

Search should be optional.

When enabled, the customer can search the store's products.

The result system should support:

-   product name;
-   relevant searchable text;
-   categories;
-   possibly SKU/reference.

The exact search technology is an implementation decision.

The customer should simply experience:

``` text
Search
↓
Results
↓
Product
```

------------------------------------------------------------------------

# 41. Filtering

Filtering should use dynamic store data.

Possible filters include:

-   category;
-   price;
-   availability;
-   product attributes where applicable.

Do not create filters for attributes that do not exist.

The interface should adapt to the actual catalog.

------------------------------------------------------------------------

# 42. Cart

The cart is a customer-owned temporary purchase state.

It should contain:

-   products;
-   quantities;
-   applied offers;
-   discounts;
-   subtotal;
-   delivery;
-   final total.

Customers should be able to:

-   add;
-   remove;
-   change quantity;
-   review pricing;
-   proceed to checkout.

------------------------------------------------------------------------

# 43. Central pricing engine

There must be one authoritative pricing/calculation system.

Conceptually:

``` text
Product price
    ↓
Product discount
    ↓
Offer rules
    ↓
Quantity
    ↓
Subtotal
    ↓
Delivery
    ↓
Final total
```

Different interface components must not independently invent their own
calculations.

A product card, cart, checkout page, and order record should agree on
the same pricing rules.

------------------------------------------------------------------------

# 44. Checkout

Checkout should be simple and focused.

Typical information:

-   customer name;
-   phone;
-   email where required;
-   delivery address;
-   city/region where required;
-   order notes;
-   payment method.

The owner should be able to configure which customer information is
required.

The customer should not have to create an account unless the store
specifically requires it.

------------------------------------------------------------------------

# 45. Delivery

Delivery is configurable.

The owner should be able to choose whether delivery exists.

Possible models:

``` text
No delivery
Free delivery
Flat delivery fee
Free delivery above a threshold
```

The underlying model should be extensible to more advanced delivery
rules later.

For example:

``` text
Region A → Rs. X
Region B → Rs. Y
Above Rs. Z → Free
```

------------------------------------------------------------------------

# 46. Payment system: fundamental concept

The payment system should be based on **configured payment
destinations**, not a fixed list of gateways that the owner merely
toggles on.

The owner configures how they receive money.

Whatever they configure becomes the corresponding customer-facing
payment option.

Example:

``` text
Owner configures a JazzCash destination
        ↓
Customer sees JazzCash
```

``` text
Owner configures an Easypaisa destination
        ↓
Customer sees Easypaisa
```

``` text
Owner configures a bank/Raast destination
        ↓
Customer sees the corresponding transfer option
```

If one destination exists, the customer sees one option.

If three destinations exist, the customer sees three options.

There should be no requirement that the owner choose from an arbitrary
hardcoded gateway catalog merely to make a payment option appear.

------------------------------------------------------------------------

# 47. Payment destination object

Conceptually, a payment destination contains:

-   type;
-   customer-facing name;
-   destination information;
-   instructions;
-   optional QR;
-   verification method;
-   status.

The exact technical schema is implementation-specific.

The important product behavior is:

> The owner describes where the customer should send the money, and the
> checkout presents that destination clearly.

------------------------------------------------------------------------

# 48. Payment rails must remain distinct

The system must distinguish between:

### Transfer/wallet methods

Examples:

-   bank transfer;
-   Raast;
-   JazzCash;
-   Easypaisa;
-   NayaPay account/wallet transfer.

### Card payments

Examples:

-   Visa;
-   Mastercard;
-   other card-network payments.

A bank IBAN is not automatically a card-payment endpoint.

A Visa debit/virtual card is not automatically an account-transfer
destination.

The system must never pretend that entering a bank account or wallet
identifier automatically enables arbitrary card payments.

Actual card acceptance requires an appropriate payment-processing
mechanism.

------------------------------------------------------------------------

# 49. Manual payment workflow

The initial store engine can support direct/manual payment without
requiring a paid payment gateway.

Customer flow:

``` text
Checkout
    ↓
Select configured payment destination
    ↓
View payment instructions
    ↓
Make payment outside the store
    ↓
Upload proof and/or enter transaction reference
    ↓
Submit order
    ↓
Payment awaiting verification
```

The administrator can then verify the payment and update its status.

------------------------------------------------------------------------

# 50. Payment QR

A payment destination can optionally have a QR code.

The owner can upload a QR image.

The checkout should present it cleanly alongside:

-   destination name;
-   relevant account/number/identifier;
-   instructions;
-   copy action where appropriate.

The system must not claim that a QR is dynamically generated unless it
actually has enough information and a valid specification to generate
one.

------------------------------------------------------------------------

# 51. Payment verification

The customer may be able to submit:

-   payment screenshot;
-   receipt;
-   transaction/reference ID.

The administrator should be able to inspect these.

Possible payment states:

``` text
Unpaid
Payment submitted
Pending verification
Paid
Rejected
Refunded
```

The exact wording can be adjusted for the store's customer-facing
language.

------------------------------------------------------------------------

# 52. Orders

An order is a permanent record of a customer's purchase attempt.

It should contain:

-   order identifier;
-   customer information;
-   ordered items;
-   quantities;
-   applied offers;
-   pricing snapshot;
-   delivery information;
-   payment destination selected;
-   payment status;
-   order status;
-   submitted payment evidence;
-   transaction reference;
-   timestamps.

Important:

> An order must preserve the commercial facts that existed when the
> order was created.

If a product's price changes later, an old order should not silently
change its historical total.

------------------------------------------------------------------------

# 53. Order statuses

Potential statuses:

``` text
Pending
Confirmed
Processing
Shipped
Delivered
Cancelled
```

The exact workflow can be configurable later.

The customer should receive understandable language rather than internal
status terminology.

------------------------------------------------------------------------

# 54. Customer account model

Customer accounts should not be mandatory unless needed.

The basic store can support guest checkout.

If customer accounts are later introduced, they can provide:

-   order history;
-   saved details;
-   saved addresses;
-   account management.

Do not force account creation simply because the system can support it.

------------------------------------------------------------------------

# 55. Administrator dashboard

The admin dashboard is the private control center.

It should provide access to:

``` text
Overview
Products
Categories
Offers
Orders
Payments
Theme
Homepage
Media
Store Settings
```

The final navigation can be refined during implementation.

------------------------------------------------------------------------

# 56. Admin dashboard philosophy

The dashboard should answer:

-   What is configured?
-   What needs attention?
-   What is live?
-   What orders exist?
-   What products exist?
-   What offers exist?
-   What payment destinations exist?

It should not overwhelm the owner with implementation details.

------------------------------------------------------------------------

# 57. Dashboard overview

The home dashboard can show useful operational information such as:

-   recent orders;
-   pending payment verification;
-   products;
-   active offers;
-   store configuration completeness.

Do not invent statistics when there is no real data.

If there are zero orders, show zero orders.

Do not show fake analytics.

------------------------------------------------------------------------

# 58. Product management

The product manager should support:

-   create;
-   edit;
-   delete;
-   duplicate;
-   search;
-   filter;
-   category assignment;
-   image management;
-   pricing;
-   discounts;
-   availability.

A product editor should visually separate:

``` text
Basic information
Images
Pricing
Categories
Inventory/availability
Presentation
```

where appropriate.

------------------------------------------------------------------------

# 59. Category management

The category manager should support:

-   create;
-   edit;
-   delete;
-   reorder;
-   assign products;
-   choose visibility/presentation where appropriate.

Deleting a category must not silently destroy products.

The system should handle category removal safely.

------------------------------------------------------------------------

# 60. Offer management

The offer manager should show offers as understandable business objects.

Each offer should communicate:

-   what the customer gets;
-   which products are involved;
-   how pricing works;
-   whether it is active;
-   how it appears publicly.

Offer creation should be guided.

------------------------------------------------------------------------

# 61. Media management

Media should be treated as reusable store assets.

Possible asset types:

-   logo;
-   product image;
-   hero image;
-   banner;
-   promotional graphic;
-   video;
-   payment QR.

The owner should be able to reuse uploaded assets where appropriate.

The customer never needs to know where those files are technically
stored.

------------------------------------------------------------------------

# 62. Homepage management

The homepage editor should provide a visual hierarchy.

Conceptually:

``` text
Homepage
│
├── Section 1
├── Section 2
├── Section 3
├── Section 4
└── Section 5
```

Each section can be:

-   enabled;
-   disabled;
-   reordered;
-   edited.

The editor should make this relationship obvious.

------------------------------------------------------------------------

# 63. Preview

The owner should be able to see how changes look before relying on them.

A preview should show the actual storefront presentation.

It should not show internal technical overlays unless the owner
explicitly opens an appropriate editing interface.

------------------------------------------------------------------------

# 64. Responsive behavior

Responsiveness is part of the product, not an afterthought.

The store must adapt to:

-   large desktop;
-   standard desktop;
-   laptop;
-   tablet;
-   mobile landscape;
-   mobile portrait;
-   very narrow mobile widths.

The interface should reflow rather than simply shrink.

------------------------------------------------------------------------

# 65. Mobile storefront behavior

On mobile:

-   touch targets should be comfortable;
-   navigation should simplify;
-   product grids should reduce columns;
-   images should remain clear;
-   text should remain readable;
-   checkout should be easy to complete;
-   cart access should remain obvious;
-   buttons should not become tiny;
-   no horizontal scrolling should occur.

------------------------------------------------------------------------

# 66. Mobile admin behavior

The administrator dashboard also needs responsive behavior.

A desktop sidebar may become:

-   a drawer;
-   a compact navigation;
-   another appropriate mobile navigation pattern.

Tables should transform into usable mobile cards or horizontally scroll
only when unavoidable.

Do not simply squeeze a desktop data table into a 360px viewport.

------------------------------------------------------------------------

# 67. Visual quality requirement

The finished store must look like professionally designed commercial
software.

Avoid the appearance of:

-   a starter template;
-   a coding tutorial;
-   a generic dashboard kit;
-   an AI-generated landing page;
-   a random collection of cards;
-   excessive glassmorphism;
-   excessive gradients;
-   excessive rounded corners;
-   meaningless animations;
-   inconsistent shadows;
-   inconsistent spacing;
-   default browser controls;
-   unstyled Firebase forms;
-   developer tooling.

The design should have hierarchy, restraint, and intention.

------------------------------------------------------------------------

# 68. Customer-facing language

Customer-facing language should be natural commerce language.

Prefer:

``` text
Add to cart
Checkout
Place order
Payment
Delivery
Order confirmed
```

Avoid:

``` text
Execute transaction object
Invoke payment handler
Submit payload
Database record created
```

The application is a commercial product, not a developer console.

------------------------------------------------------------------------

# 69. Administrator-facing language

Administrator language should describe business actions.

Prefer:

``` text
Payment destination
Product discount
Bundle price
Homepage section
Store colors
Customer payment proof
```

Avoid:

``` text
Firestore document
API endpoint
React state
JSON payload
Storage bucket
database migration
```

The owner should not need to understand implementation technology.

------------------------------------------------------------------------

# 70. No technical branding

The application must not include accidental technology branding.

Do not add:

``` text
Built with React
Powered by Firebase
Generated by AI
Uses API X
Database: Y
```

unless a future commercial/legal requirement explicitly requires a
visible attribution.

The default product should be brand-neutral and professional.

------------------------------------------------------------------------

# 71. Errors

Errors should be translated into useful product language.

Bad:

``` text
FirebaseError: PERMISSION_DENIED
```

Better:

> You don't have permission to perform this action.

Bad:

``` text
HTTP 500
```

Better:

> Something went wrong while saving. Please try again.

Technical details can remain in internal logs.

------------------------------------------------------------------------

# 72. Loading states

Loading should look intentional.

Use:

-   skeletons;
-   subtle loading indicators;
-   disabled states;
-   progress feedback for uploads.

Do not flash blank white pages unnecessarily.

------------------------------------------------------------------------

# 73. Empty states

Every major data area should have an intentional empty state.

For example:

Products:

> No products yet.

Admin may have an action:

> Add product

Orders:

> No orders yet.

Offers:

> No offers created yet.

These are administrator experiences.

The public storefront should not expose internal setup instructions.

------------------------------------------------------------------------

# 74. Confirmation and destructive actions

Actions such as deleting:

-   products;
-   categories;
-   offers;
-   media

should have appropriate confirmation.

Where deletion has consequences, explain the consequence in plain
business language.

Do not use alarming technical language.

------------------------------------------------------------------------

# 75. Unsaved changes

Where editors are complex enough to justify it, the application should
protect against accidental loss.

Possible behavior:

> You have unsaved changes.

Allow:

-   save;
-   discard;
-   continue editing.

------------------------------------------------------------------------

# 76. Store publishing concept

The engine should distinguish between editing configuration and what the
customer sees where useful.

The exact implementation can use immediate publishing, draft/publish
states, or another model.

The important product principle is:

> The administrator must understand what is currently visible to
> customers.

If draft/publish functionality exists, make the distinction visually
obvious.

------------------------------------------------------------------------

# 77. Security model

Security is a product requirement even though customers should not see
it.

The system must protect:

-   administrator access;
-   store configuration;
-   product editing;
-   payment configuration;
-   order management;
-   payment evidence;
-   media;
-   customer information.

Never trust client-supplied:

-   price;
-   discount;
-   final total;
-   payment status;
-   administrator role;
-   order ownership.

The authoritative system must validate important commercial operations.

------------------------------------------------------------------------

# 78. Privacy

Customer information should only be exposed to authorized users.

Payment evidence and transaction references should be treated as private
order information.

The public storefront should never expose customer order information
accidentally.

------------------------------------------------------------------------

# 79. Inventory

The initial engine can support basic availability and stock concepts.

Potential states:

``` text
Available
Unavailable
Out of stock
Hidden
```

If numerical inventory is implemented, purchasing should respect it.

Do not display inventory numbers unless the owner wants customers to see
them.

------------------------------------------------------------------------

# 80. Product variants

The architecture should leave room for variants.

Examples:

``` text
Size
Color
Storage
Capacity
```

Variants may have:

-   separate price;
-   separate stock;
-   separate SKU;
-   separate images.

The initial product experience should not become unnecessarily complex
if variants are not needed.

------------------------------------------------------------------------

# 81. Extensibility

The system should be designed so new features can be added without
rewriting the entire store.

Future possibilities include:

-   customer accounts;
-   wishlists;
-   coupons;
-   advanced inventory;
-   regional delivery;
-   tax rules;
-   real payment gateways;
-   card payments;
-   analytics;
-   abandoned carts;
-   subscriptions;
-   reviews;
-   loyalty;
-   multilingual stores.

These do not all need to exist now.

The architecture should simply avoid making them impossible.

------------------------------------------------------------------------

# 82. Multiple stores

The long-term business model may involve deploying the same engine
repeatedly.

Conceptually:

``` text
Engine
   |
   +-- Store Instance 1
   +-- Store Instance 2
   +-- Store Instance 3
```

A future multi-store architecture could allow multiple store instances
from one application.

However, the product does not need to become a huge SaaS platform merely
to achieve this vision.

The key requirement is separation between engine code and store data.

------------------------------------------------------------------------

# 83. Configuration portability

A store's configuration should conceptually be portable.

The store definition consists of things such as:

``` text
Identity
Theme
Navigation
Categories
Products
Offers
Payment destinations
Delivery
Homepage
```

This makes the engine suitable for repeat deployments.

------------------------------------------------------------------------

# 84. No hardcoded business assumptions

Do not assume:

-   Pakistan;
-   United States;
-   clothing;
-   electronics;
-   physical products only;
-   one currency;
-   one delivery model;
-   one payment method;
-   one category structure;
-   one product-card design;
-   one homepage structure.

Where a default is necessary, make it a **default**, not an
architectural assumption.

------------------------------------------------------------------------

# 85. International readiness

Currency should be configurable.

The interface should avoid assuming:

``` text
Rs.
$
€
```

as a permanent symbol.

The store's configured currency should be used consistently.

Payment destinations are likewise store-specific.

------------------------------------------------------------------------

# 86. Accessibility

The storefront should support:

-   semantic structure;
-   keyboard navigation;
-   visible focus;
-   useful labels;
-   meaningful alternative text;
-   sufficient contrast;
-   reduced motion.

Accessibility should be part of the design system rather than an
afterthought.

------------------------------------------------------------------------

# 87. Performance

The engine should remain fast even as content grows.

Consider:

-   image optimization;
-   lazy loading;
-   pagination;
-   efficient queries;
-   caching where appropriate;
-   code splitting;
-   minimizing unnecessary rendering;
-   optimized animation.

The specific optimization technology is an implementation decision.

The customer should simply experience a fast store.

------------------------------------------------------------------------

# 88. SEO-ready structure

The public storefront should have the fundamentals required for a real
commercial website.

This may include:

-   meaningful page titles;
-   descriptions;
-   semantic headings;
-   product metadata;
-   useful URLs;
-   image alternative text;
-   structured product information where appropriate.

Technical implementation is not part of the customer-facing product
language.

------------------------------------------------------------------------

# 89. Store URL behavior

The public store should have a clean, normal storefront URL.

Customers should not need to know:

-   internal IDs;
-   database paths;
-   implementation routes;
-   development routes.

Product URLs should be human-readable where practical.

------------------------------------------------------------------------

# 90. No development residue

Before the product is considered complete, remove:

-   console noise visible to customers;
-   debug panels;
-   mock buttons;
-   TODO text in the UI;
-   sample data;
-   placeholder images;
-   placeholder store names;
-   test orders;
-   fake payment destinations;
-   developer-only banners;
-   implementation notes.

The finished application must look like a product that has been
intentionally shipped.

------------------------------------------------------------------------

# 91. Architecture options

The vision does not require one particular technology.

Several implementation strategies are valid.

## Option A --- Modern full-stack web application

Example conceptual stack:

``` text
Frontend
+
Server/application layer
+
Relational database
+
Object/media storage
+
Authentication
```

This is a strong choice for a serious commerce engine.

Advantages:

-   strong data relationships;
-   flexible offer rules;
-   transactional order processing;
-   good long-term extensibility.

A relational database is particularly attractive because products,
variants, categories, offers, orders, and payment destinations have
meaningful relationships.

------------------------------------------------------------------------

## Option B --- Backend-as-a-Service architecture

Conceptually:

``` text
Modern frontend
+
managed authentication
+
managed database
+
managed storage
+
server functions
```

Advantages:

-   faster development;
-   less infrastructure management;
-   easy authentication;
-   convenient file storage;
-   suitable for a small-to-medium store engine.

The exact provider is not part of the product specification.

------------------------------------------------------------------------

## Option C --- Traditional server-rendered commerce application

For example:

``` text
Server application
+
database
+
server-rendered storefront
+
admin dashboard
```

This can be an excellent choice when:

-   SEO is important;
-   hosting should be simple;
-   the system should be easy to maintain;
-   server-side rendering is preferred.

The storefront can still be highly interactive.

------------------------------------------------------------------------

## Option D --- Headless commerce architecture

Conceptually:

``` text
Commerce backend
        ↓
API
        ↓
Custom storefront
```

Advantages:

-   strong separation;
-   multiple frontends;
-   potential mobile apps;
-   future integrations.

Disadvantage:

-   more architectural complexity than this product may initially
    require.

------------------------------------------------------------------------

## Option E --- Existing commerce engine as the backend

A mature commerce backend can provide:

-   products;
-   orders;
-   inventory;
-   customer management;
-   checkout.

The custom Store Engine then becomes a specialized frontend/admin layer.

This can reduce the amount of commerce infrastructure that needs to be
reinvented.

However, it can also impose assumptions that conflict with the desired
flexible offer/payment/content model.

------------------------------------------------------------------------

## Option F --- Custom commerce engine

Build the commerce behavior specifically for this product.

This provides maximum control over:

-   offer rules;
-   product presentation;
-   payment destinations;
-   homepage system;
-   admin UX;
-   reusable store architecture.

It requires more engineering responsibility.

For the long-term vision described in this document, a custom or
semi-custom engine is arguably the cleanest conceptual fit.

------------------------------------------------------------------------

# 92. Recommended architectural principle

Do not choose technology first.

Choose the product boundaries first.

The correct order of thinking is:

``` text
What should the store do?
        ↓
What objects does it need?
        ↓
How do those objects interact?
        ↓
What must be authoritative?
        ↓
What must be configurable?
        ↓
What should be reusable?
        ↓
Which technology implements that cleanly?
```

Not:

``` text
I am using framework X.
What kind of store can I squeeze into it?
```

------------------------------------------------------------------------

# 93. What should be configurable

A useful rule is:

> If it is likely to differ between two businesses, it should generally
> be data/configuration rather than hardcoded code.

Likely configurable:

-   store name;
-   logo;
-   colors;
-   typography choice;
-   categories;
-   products;
-   product images;
-   prices;
-   discounts;
-   offers;
-   bundles;
-   payment destinations;
-   delivery;
-   homepage sections;
-   navigation;
-   featured products;
-   promotional content.

------------------------------------------------------------------------

# 94. What should remain engine-controlled

The owner should not have to configure:

-   fundamental layout mechanics;
-   responsive CSS;
-   pricing algorithms;
-   authentication mechanics;
-   database behavior;
-   security;
-   animation implementation;
-   image loading strategy;
-   order integrity;
-   technical routing.

This is what makes the product an engine rather than a blank website
builder.

------------------------------------------------------------------------

# 95. Why not a full drag-and-drop builder

A completely freeform builder sounds flexible but creates a different
product.

If every store owner can:

-   move every pixel;
-   resize every component;
-   break grids;
-   change arbitrary typography;
-   position elements independently;

then the engine stops providing design intelligence.

The desired model is:

``` text
Controlled freedom
```

not:

``` text
Unlimited freedom
```

The owner chooses meaningful business and design decisions.

The engine handles the rest.

------------------------------------------------------------------------

# 96. The "Excel from scratch" mental model

Think about how a mature spreadsheet application is defined.

It has concepts such as:

``` text
Workbook
Worksheet
Cell
Formula
Range
Format
Chart
```

Each object has:

-   properties;
-   relationships;
-   behavior;
-   presentation;
-   rules.

The Store Engine should be defined with the same discipline.

For example:

``` text
Product
    has name
    has price
    has images
    belongs to categories
    can have a discount
    can participate in offers
    appears in product presentations
    can be added to cart
```

And:

``` text
Offer
    involves products
    has rules
    changes pricing or rewards
    has a public presentation
    affects cart calculation
    is preserved in an order snapshot
```

This object-based thinking is more important than the choice of
framework.

------------------------------------------------------------------------

# 97. The final customer journey

A normal customer should experience something approximately like:

``` text
Open store
    ↓
See polished homepage
    ↓
Browse categories/products
    ↓
Search if desired
    ↓
Open product
    ↓
See offers
    ↓
Add to cart
    ↓
Review cart
    ↓
Checkout
    ↓
Select configured payment destination
    ↓
Make payment if required
    ↓
Submit payment proof/reference
    ↓
Place order
    ↓
Receive order confirmation
```

At no point should the customer encounter the Store Engine concept.

------------------------------------------------------------------------

# 98. The final owner journey

The store owner should experience:

``` text
Open admin
    ↓
Authenticate
    ↓
Configure store identity
    ↓
Choose visual system
    ↓
Add products/categories
    ↓
Create offers
    ↓
Configure delivery
    ↓
Configure payment destinations
    ↓
Build homepage
    ↓
Preview
    ↓
Publish
    ↓
Manage orders
```

The owner should feel like they are operating a professional commerce
platform, not configuring a software project.

------------------------------------------------------------------------

# 99. The final product philosophy

The entire system can be summarized by four layers:

``` text
BUSINESS DATA
    ↓
COMMERCE RULES
    ↓
PRESENTATION SYSTEM
    ↓
CUSTOMER EXPERIENCE
```

### Business data

What exists:

-   products;
-   categories;
-   offers;
-   payments;
-   delivery;
-   store information.

### Commerce rules

What happens:

-   discounts;
-   bundle pricing;
-   free products;
-   quantities;
-   delivery calculation;
-   order creation;
-   payment verification.

### Presentation system

How it looks:

-   themes;
-   colors;
-   typography;
-   cards;
-   layouts;
-   sections;
-   imagery;
-   animations.

### Customer experience

What the customer actually sees and does.

------------------------------------------------------------------------

# 100. Non-negotiable rules

The implementation must follow these rules.

1.  **Do not build an existing example store.**
2.  **Do not populate the database with sample business data.**
3.  **Do not hardcode a store name.**
4.  **Do not hardcode categories.**
5.  **Do not hardcode products.**
6.  **Do not hardcode payment destinations.**
7.  **Do not hardcode one country's payment system into the
    architecture.**
8.  **Do not treat payment gateways and payment destinations as the same
    concept.**
9.  **Do not fake card payment processing.**
10. **Do not make the admin URL itself the security mechanism.**
11. **Do not expose administrator functionality publicly.**
12. **Do not expose implementation details to customers.**
13. **Do not expose implementation details to store owners unless they
    are genuinely relevant to an administrative decision.**
14. **Do not leave developer notes in the production UI.**
15. **Do not display API names, framework names, database names, or
    internal architecture in the normal product UI.**
16. **Do not use mock analytics.**
17. **Do not use fake orders.**
18. **Do not use fake payment proofs.**
19. **Do not use fake testimonials as real store content.**
20. **Do not use placeholder lorem ipsum in the finished product.**
21. **Do not make categories part of the presentation layer.**
22. **Do not make product presentation part of product data.**
23. **Do not make individual discounts the entire offer system.**
24. **Do not hardcode individual promotion types as unrelated
    features.**
25. **Do not duplicate pricing calculations throughout the UI.**
26. **Do not make the owner manually design every product card.**
27. **Do not turn the product into an unrestricted page builder.**
28. **Do not sacrifice mobile usability for desktop appearance.**
29. **Do not sacrifice accessibility for animation.**
30. **Do not sacrifice security for development convenience.**
31. **Do not expose technical error messages to customers.**
32. **Do not make the storefront look like an admin dashboard.**
33. **Do not make the admin dashboard look like a developer console.**
34. **Do not assume every store sells the same kind of product.**
35. **Do not assume every store uses the same payment method.**
36. **Do not assume every store has the same delivery model.**
37. **Do not assume every store needs every homepage section.**
38. **Do not require technical knowledge to configure a normal store.**
39. **Do not let implementation technology dictate the product model.**
40. **The finished public website must look like a normal,
    professionally designed store.**

------------------------------------------------------------------------

# 101. Definition of success

The Store Engine succeeds when a new business can receive a clean
deployment and, without source-code modification, turn it into its own
professional store.

The owner supplies:

``` text
Identity
Brand
Products
Categories
Images
Prices
Offers
Delivery rules
Payment destinations
Homepage content
```

The engine supplies:

``` text
Design
Layout
Responsive behavior
Animations
Commerce logic
Pricing logic
Checkout
Order management
Payment presentation
Administration
Security
```

The customer sees:

> **A normal professional online store.**

The owner sees:

> **A powerful but understandable store management system.**

The developer sees:

> **One reusable commerce engine that can produce many different
> stores.**

That is the product.
