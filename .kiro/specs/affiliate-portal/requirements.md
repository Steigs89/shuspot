# Affiliate Portal — Requirements

## Overview
A self-contained affiliate dashboard at `shuspot.com/affiliate` for ShuSpot's affiliate partners (primarily Chinese KOLs/influencers). Matches the main app's fun, colorful vibe using brand colors (pink `#d85f9c`, yellow `#e2d151`, teal `#a1cfd2`).

## Reference Files
- #[[file:03-Dashboard-Home.html]] — Dashboard layout reference
- #[[file:04-Earnings.html]] — Earnings & payouts reference
- #[[file:05-Content-Library.html]] — Content library reference
- #[[file:06-Settings.html]] — Settings reference

## Screens

### 1. Login Screen
- Simple email + password login
- ShuSpot branding, gradient background
- "Forgot password" link
- No signup — affiliates are invited/approved by admin

### 2. Dashboard Home
- Welcome banner with tier progress (Bronze → Silver → Gold)
- Stats cards: Clicks, Free Trial Signups, Paid Conversions, Earnings
- Sharing tools: Discount code, Referral link, QR code
- 7-day click chart
- Recent referrals table
- Quick links to other sections

### 3. Earnings & Payouts
- Earnings summary (this month, lifetime, pending)
- Payout history table
- Commission breakdown by plan type
- Request payout button (placeholder for now)

### 4. Content Library
- Pre-made social media assets affiliates can download
- Banners, post templates, video thumbnails
- Organized by platform (XHS, Douyin, WeChat, Bilibili)
- Download buttons

### 5. Settings
- Profile info (name, email, payment details)
- Notification preferences
- Compliance guide / terms
- Password change

## Technical Requirements
- React components under `src/components/affiliate/`
- Route at `/affiliate` — separate from main app, no auth overlap
- Placeholder data for now — API-ready structure
- Responsive (mobile-first, sidebar collapses to hamburger)
- Uses Tailwind + brand colors throughout
- No Supabase integration yet — mock data with TypeScript interfaces ready for API

## Out of Scope (for now)
- Actual Stripe integration for payouts
- Real-time analytics API
- Admin approval workflow
- QR code generation (placeholder image)
