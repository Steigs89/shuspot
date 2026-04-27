export interface AffiliateUser {
  id: string;
  name: string;
  email: string;
  discountCode: string;
  referralLink: string;
  tier: 'bronze' | 'silver' | 'gold';
  tierProgress: number;
  tierTarget: number;
  avatar: string;
}

export interface AffiliateStats {
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

export interface Referral {
  id: string;
  date: string;
  event: string;
  status: 'active_trial' | 'confirmed' | 'expired' | 'pending';
  earnings: number;
}

export interface PayoutRecord {
  id: string;
  date: string;
  amount: number;
  method: string;
  status: 'completed' | 'pending' | 'processing';
}

export interface ContentAsset {
  id: string;
  title: string;
  platform: 'xhs' | 'douyin' | 'wechat' | 'bilibili' | 'all';
  type: 'banner' | 'post' | 'video_thumbnail' | 'story';
  previewUrl: string;
  downloadUrl: string;
}

// Mock data
export const MOCK_USER: AffiliateUser = {
  id: 'aff-001',
  name: 'Wei Lin',
  email: 'weilin@example.com',
  discountCode: 'WEILIN88',
  referralLink: 'https://shuspot.com/?ref=weilin2026',
  tier: 'silver',
  tierProgress: 22,
  tierTarget: 25,
  avatar: 'WL',
};

export const MOCK_STATS: AffiliateStats = {
  clicksThisMonth: 847,
  clicksChange: 12,
  trialSignups: 63,
  trialsChange: 8,
  paidConversions: 22,
  conversionsChange: 15,
  earningsThisMonth: 2590,
  earningsChange: 20,
  lifetimeEarnings: 18420,
  pendingPayout: 1200,
};

export const MOCK_REFERRALS: Referral[] = [
  { id: 'r1', date: 'Apr 8', event: 'Free Trial Signup', status: 'active_trial', earnings: 5 },
  { id: 'r2', date: 'Apr 7', event: '3-Month Subscription', status: 'confirmed', earnings: 84 },
  { id: 'r3', date: 'Apr 7', event: 'Free Trial Signup', status: 'active_trial', earnings: 5 },
  { id: 'r4', date: 'Apr 6', event: 'Annual Subscription', status: 'confirmed', earnings: 168 },
  { id: 'r5', date: 'Apr 5', event: 'Free Trial Signup', status: 'expired', earnings: 0 },
  { id: 'r6', date: 'Apr 4', event: '1-Month Subscription', status: 'confirmed', earnings: 35 },
  { id: 'r7', date: 'Apr 3', event: 'Free Trial Signup', status: 'pending', earnings: 5 },
];

export const MOCK_PAYOUTS: PayoutRecord[] = [
  { id: 'p1', date: 'Mar 31', amount: 1850, method: 'WeChat Pay', status: 'completed' },
  { id: 'p2', date: 'Feb 28', amount: 1420, method: 'WeChat Pay', status: 'completed' },
  { id: 'p3', date: 'Jan 31', amount: 980, method: 'Bank Transfer', status: 'completed' },
];

export const MOCK_CHART_DATA = [
  { day: 'Mon', clicks: 105 },
  { day: 'Tue', clicks: 132 },
  { day: 'Wed', clicks: 89 },
  { day: 'Thu', clicks: 156 },
  { day: 'Fri', clicks: 118 },
  { day: 'Sat', clicks: 78 },
  { day: 'Sun', clicks: 142 },
];

export const MOCK_CONTENT: ContentAsset[] = [
  { id: 'c1', title: 'ShuSpot Banner - Pink', platform: 'all', type: 'banner', previewUrl: '', downloadUrl: '' },
  { id: 'c2', title: 'XHS Post Template', platform: 'xhs', type: 'post', previewUrl: '', downloadUrl: '' },
  { id: 'c3', title: 'Douyin Video Thumbnail', platform: 'douyin', type: 'video_thumbnail', previewUrl: '', downloadUrl: '' },
  { id: 'c4', title: 'WeChat Article Header', platform: 'wechat', type: 'banner', previewUrl: '', downloadUrl: '' },
  { id: 'c5', title: 'Bilibili Cover Image', platform: 'bilibili', type: 'video_thumbnail', previewUrl: '', downloadUrl: '' },
  { id: 'c6', title: 'Story Template - Teal', platform: 'all', type: 'story', previewUrl: '', downloadUrl: '' },
  { id: 'c7', title: 'XHS Carousel Slide', platform: 'xhs', type: 'post', previewUrl: '', downloadUrl: '' },
  { id: 'c8', title: 'Promo Banner - Yellow', platform: 'all', type: 'banner', previewUrl: '', downloadUrl: '' },
];
