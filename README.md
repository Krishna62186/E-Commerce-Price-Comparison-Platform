# Price Comparator — Level 3 MERN Project

A responsive e-commerce price comparison application built with React + Vite, Express, MongoDB and a small Python prediction API. It uses **demo/seeded catalog data and mock price updates**; it does not scrape retailer sites.

## Features
- Product search, category filtering and product details
- Compare Amazon, Flipkart and Croma-style marketplace offers
- Effective-price calculator including coupon, bank/card and payment discounts
- JWT register/login, wishlist, search history and price alerts
- Price-history chart, mock scheduled price changes, recommendations (BUY / WAIT)
- Admin dashboard: analytics plus product create, update and delete
- Python ML-style price forecast API (linear trend with BUY/WAIT recommendation)

## Prerequisites
Install Node.js 18+, MongoDB Community Server, and Python 3.10+ (optional for the ML service). Start MongoDB locally before seeding.

## Setup
1. Copy `.env.example` to `server/.env` and `client/.env`. In `client/.env`, keep only:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```
2. From this project folder, install JavaScript dependencies:
   ```bash
   npm install
   npm run install:all
   ```
3. Seed demo users, products, offers and price history:
   ```bash
   npm run seed
   ```
4. (Optional, recommended) create and activate a Python virtual environment, then install and run the prediction service:
   ```bash
   cd ml
   python -m venv .venv
   # Windows PowerShell: .\.venv\Scripts\Activate.ps1
   # macOS/Linux: source .venv/bin/activate
   pip install -r requirements.txt
   python app.py
   ```
5. In a second terminal, start the MERN app:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173`.

## Demo accounts
`admin@pricewise.dev` / `Admin@123` (administrator)

`student@pricewise.dev` / `Student@123` (shopper)

## API overview
`/api/auth`, `/api/products`, `/api/users`, `/api/admin`, `/api/recommendations`.

To simulate routine authorized-feed updates, call `POST /api/admin/mock-price-update` as an administrator. This randomly nudges seeded platform prices and records history.

## Project structure
```
client/   React/Vite user and admin interface
server/   Express REST API, Mongoose models, auth and seeder
ml/       Flask prediction API
```
