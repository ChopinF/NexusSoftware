# EdgeUp

## Table of contents
- [Description](#description)
- [Functionalities](#functionalities)
## Description

EdgeUp is an AI-Enhanced Marketplace platform designed to connect buyers and sellers in a safe, fast, and intelligent way. It moves beyond simple listings by offering dynamic inventory management, allowing verified sellers to manage stock levels and buyers to negotiate not just the price, but the quantity of items. The platform includes a dedicated AI assistant and an automated price-comparison system powered by web scraping, offering a transparent, efficient, and trustworthy shopping experience.

EdgeUp Marketplace is a full-stack web application built using a modern architecture design. The application utilizes Node.js and SQLite for the backend, with a responsive frontend powered by React and TypeScript.

## Functionalities

### User Management & Trust System
- **Authentication:** Secure Login and Registration for users.
- **Trust Workflow:** System for transitioning from an unverified user to a "Trusted" seller.
- **Admin Dashboard:** Dedicated interface for administrators to review, approve, or reject "Trusted" status requests.
- **User Notifications:** Real-time updates for account activities and interactions.

### Product & Inventory Management
- **Post Ads:** Trusted users can list products with detailed descriptions, images, prices, and stock quantities.
- **Owner Dashboard:** Sellers have access to a management panel on their product pages to view stock status (Active/Sold Out), edit listings, or delete/archive products.
- **Inventory Tracking:** Automated stock deduction upon order completion.
- **Discovery:** Advanced search, filtering, and sorting capabilities for products.
- **My Ads & Favorites:** Users can manage their own active listings and save favorite posts for later.

### Commerce & Negotiation
- **Smart Negotiations:** Buyers can initiate negotiations specifying both offered price and desired quantity.
- **Deal Management:** Sellers can accept or reject offers; accepted deals lock the price and quantity for the buyer.
- **Direct Chat:** Integrated messaging system allowing potential buyers and sellers to communicate directly.
- **Order System:** Complete checkout process with shipping details and order tracking.
- **Reviews:** Ability to add reviews for products and transactions.

### AI & Advanced Technology
- **AI Assistant:** A dedicated marketplace chatbot to assist users with navigation and inquiries.
- **Price Comparison Engine:** Integrated web scraper and crawler that analyzes and compares product prices to ensure market competitiveness.

### Deployment (In Progress)
- **CI/CD Pipeline:** Implementation of automated deployment pipelines (TODO).