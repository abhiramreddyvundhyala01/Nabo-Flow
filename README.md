# Nabo Flow — Complete POS & Restaurant Management System

Nabo Flow is a modern, high-performance Point-of-Sale (POS) and Restaurant Management System built with **Next.js**, **React**, **Tailwind CSS**, and **Supabase (PostgreSQL)**.

## Features
- **POS Billing**: Fast table-side and counter order creation, item customization, discounts, GST tax calculations, and instant receipt printing.
- **Menu Management**: Dynamic category ordering, item availability toggles, pricing, and custom modifiers.
- **Inventory & Stock**: Raw material tracking, stock depletion, reorder alerts, and vendor purchase orders.
- **Purchase Orders**: Standardized `PO-ORD-YYYYMMDD-XXX` order generation, vendor ledgers, and WhatsApp dispatch.
- **Staff Management & RBAC**: Interactive Role-Based Access Control (RBAC matrix) and 1-click Shift & Attendance tracking.
- **Reports & Analytics**: Sales performance, settled bill metrics, payment splits (UPI, Cash, Card), day-wise date filtering, and CSV report exports.
- **Online Orders & Mobile App**: Live order status feeds and digital table ordering.

## Tech Stack
- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Database**: Supabase PostgreSQL (Realtime WebSockets & Row-Level Security)
- **Deployment**: Vercel & AWS Amplify

## Getting Started

### Prerequisites
- Node.js 18+

### Installation
```bash
npm install
```

### Running Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser.

### Production Build
```bash
npm run build
```
