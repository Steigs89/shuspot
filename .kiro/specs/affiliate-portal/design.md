# Affiliate Portal — Design

## Visual Direction
- Match ShuSpot's playful, colorful aesthetic — not a boring corporate dashboard
- Brand gradient backgrounds (pink → teal), rounded corners, shadows
- Fun emoji accents in section headers
- Cards with hover effects and subtle animations
- Friendly typography (use superclarendon where available)

## Color Palette
- Primary: `brand-pink` (#d85f9c) — CTAs, highlights
- Secondary: `brand-blue` (#a1cfd2) — sidebar, charts, accents
- Accent: `brand-yellow` (#e2d151) — earnings, badges, progress bars
- Background: gradient from blue-50 to pink-50
- Cards: white with soft shadows

## Layout
- Top navbar: gradient brand-pink → brand-blue, white text, avatar
- Left sidebar: white, icon + label nav items, tier badge at bottom
- Main content: scrollable, card-based sections
- Mobile: sidebar becomes slide-out hamburger menu

## Component Structure
```
src/components/affiliate/
├── AffiliateApp.tsx          — Router wrapper
├── AffiliateLogin.tsx        — Login screen
├── AffiliateDashboard.tsx    — Dashboard home
├── AffiliateEarnings.tsx     — Earnings & payouts
├── AffiliateContent.tsx      — Content library
├── AffiliateSettings.tsx     — Settings
├── AffiliateSidebar.tsx      — Shared sidebar nav
├── AffiliateNavbar.tsx       — Shared top nav
└── types.ts                  — TypeScript interfaces
```

## Data Interfaces (mock-ready)
```typescript
interface AffiliateUser {
  id: string;
  name: string;
  email: string;
  discountCode: string;
  referralLink: string;
  tier: 'bronze' | 'silver' | 'gold';
  tierProgress: number;
  tierTarget: number;
}

interface AffiliateStats {
  clicksThisMonth: number;
  clicksChange: number;
  trialSignups: number;
  trialsChange: number;
  paidConversions: number;
  conversionsChange: number;
  earningsThisMonth: number;
  earningsChange: number;
  lifetimeEarnings: number;
  pendingPayout: number;
}

interface Referral {
  id: string;
  date: string;
  event: string;
  status: 'active_trial' | 'confirmed' | 'expired' | 'pending';
  earnings: number;
}
```
