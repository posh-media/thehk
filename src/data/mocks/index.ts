import {
  User,
  Wallet,
  Transaction,
  ServiceCategory,
  Service,
  SocialMediaService,
  SocialProfile,
  ServiceOrder,
  Listing,
  Product,
  MarketplaceOrder,
  Notification,
  Referral,
  Reward,
  HKPointTransaction,
  SupportTicket,
  Tutorial,
  Bank,
  Withdrawal,
  Payment,
} from '@/types/domain';

export const mockUser: User = {
  id: 'u-001',
  email: 'alex.raymond@fintech.com',
  phone: '+2348012345678',
  displayName: 'Alexander Raymond',
  firstName: 'Alexander',
  lastName: 'Raymond',
  username: 'alex_ray',
  photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
  country: 'Nigeria',
  dateOfBirth: '1995-05-12',
  preferences: {
    emailNotification: true,
    pushNotification: true,
    appearance: 'system',
  },
  role: 'user',
  isVerified: true,
  createdAt: '2023-01-15T10:00:00Z',
  updatedAt: '2024-08-10T08:30:00Z',
};

export const mockWallet: Wallet = {
  userId: mockUser.id,
  balance: 7500000,
  availableBalance: 7500000,
  pendingBalance: 0,
  currency: 'NGN',
  updatedAt: '2024-08-18T09:00:00Z',
};

export const mockTransactions: Transaction[] = [
  {
    id: 'tx-001',
    userId: mockUser.id,
    type: 'wallet_funding',
    amount: 2500000,
    currency: 'NGN',
    status: 'successful',
    reference: 'HK-FUND-001',
    providerReference: 'PSK-887766',
    description: 'Wallet funded via Paystack',
    createdAt: '2024-08-18T08:45:00Z',
    updatedAt: '2024-08-18T08:45:00Z',
  },
  {
    id: 'tx-002',
    userId: mockUser.id,
    type: 'social_media_order',
    amount: 450000,
    currency: 'NGN',
    status: 'successful',
    reference: 'HK-SMM-002',
    description: 'Instagram followers order',
    metadata: { platform: 'Instagram', service: 'Followers' },
    createdAt: '2024-08-17T14:20:00Z',
    updatedAt: '2024-08-17T14:20:00Z',
  },
  {
    id: 'tx-003',
    userId: mockUser.id,
    type: 'marketplace_purchase',
    amount: 1200000,
    currency: 'NGN',
    status: 'successful',
    reference: 'HK-MP-003',
    description: 'Netflix Premium 4K purchase',
    createdAt: '2024-08-16T11:10:00Z',
    updatedAt: '2024-08-16T11:10:00Z',
  },
  {
    id: 'tx-004',
    userId: mockUser.id,
    type: 'withdrawal',
    amount: 1250000,
    currency: 'NGN',
    status: 'successful',
    reference: 'HK-WD-004',
    description: 'Withdrawal to Kuda Bank',
    createdAt: '2024-08-15T09:00:00Z',
    updatedAt: '2024-08-15T09:00:00Z',
  },
  {
    id: 'tx-005',
    userId: mockUser.id,
    type: 'airtime',
    amount: 100000,
    currency: 'NGN',
    status: 'successful',
    reference: 'HK-AIR-005',
    description: 'Airtime purchase for 08012345678',
    createdAt: '2024-08-14T18:30:00Z',
    updatedAt: '2024-08-14T18:30:00Z',
  },
  {
    id: 'tx-006',
    userId: mockUser.id,
    type: 'gift_card_purchase',
    amount: 5000000,
    currency: 'NGN',
    status: 'pending',
    reference: 'HK-GC-006',
    description: 'Amazon Gift Card purchase',
    createdAt: '2024-08-13T16:00:00Z',
    updatedAt: '2024-08-13T16:00:00Z',
  },
];

export const mockPayments: Payment[] = [
  {
    id: 'pay-001',
    userId: mockUser.id,
    amount: 2500000,
    currency: 'NGN',
    provider: 'paystack',
    status: 'success',
    reference: 'HK-FUND-001',
    providerReference: 'PSK-887766',
    createdAt: '2024-08-18T08:45:00Z',
    updatedAt: '2024-08-18T08:45:00Z',
  },
];

export const mockWithdrawals: Withdrawal[] = [
  {
    id: 'wd-001',
    userId: mockUser.id,
    amount: 1250000,
    currency: 'NGN',
    bankName: 'Kuda Bank',
    bankCode: '50211',
    accountNumber: '0123456789',
    accountName: 'Adedayo Samuel O.',
    status: 'successful',
    reference: 'HK-WD-004',
    createdAt: '2024-08-15T09:00:00Z',
    updatedAt: '2024-08-15T09:00:00Z',
  },
  {
    id: 'wd-002',
    userId: mockUser.id,
    amount: 500000,
    currency: 'NGN',
    bankName: 'Access Bank',
    bankCode: '044',
    accountNumber: '0987654321',
    accountName: 'Adedayo Samuel O.',
    status: 'pending',
    reference: 'HK-WD-005',
    createdAt: '2024-08-13T09:00:00Z',
    updatedAt: '2024-08-13T09:00:00Z',
  },
];

export const mockServiceCategories: ServiceCategory[] = [
  { id: 'cat-airtime', name: 'Airtime', icon: 'phone-portrait', color: '#72C645', description: 'Buy airtime for all networks' },
  { id: 'cat-data', name: 'Data', icon: 'wifi', color: '#3B82F6', description: 'Purchase mobile data bundles' },
  { id: 'cat-bills', name: 'Bills', icon: 'receipt', color: '#F59E0B', description: 'Pay electricity, TV, and utility bills' },
  { id: 'cat-smm', name: 'Social Media', icon: 'people', color: '#EC4899', description: 'Grow your social media presence' },
  { id: 'cat-giftcards', name: 'Gift Cards', icon: 'gift', color: '#8B5CF6', description: 'Buy and sell gift cards' },
  { id: 'cat-virtual', name: 'Virtual Numbers', icon: 'call', color: '#10B981', description: 'Get virtual phone numbers' },
  { id: 'cat-gaming', name: 'Gaming', icon: 'game-controller', color: '#EF4444', description: 'Game credits and subscriptions' },
  { id: 'cat-tools', name: 'Tools', icon: 'laptop', color: '#6B7280', description: 'Software accounts and tools' },
  { id: 'cat-bankgen', name: 'Bank Gen', icon: 'receipt', color: '#14B8A6', description: 'Generate custom bank receipts' },
  { id: 'cat-upcoming', name: 'Upcoming', icon: 'rocket', color: '#64748B', description: 'New services coming soon' },
];

export const mockServices: Service[] = [
  // Core / popular services (implemented, visible, popular)
  { id: 'svc-airtime', categoryId: 'cat-airtime', name: 'Buy Airtime', description: 'Recharge any mobile network', icon: 'phone-portrait', isActive: true, visible: true, implemented: true, isPopular: true, sortOrder: 1, route: '/services/airtime' },
  { id: 'svc-data', categoryId: 'cat-data', name: 'Do Sub', description: 'Buy mobile internet data', icon: 'wifi', isActive: true, visible: true, implemented: true, isPopular: true, sortOrder: 2, route: '/services/data' },
  { id: 'svc-bills', categoryId: 'cat-bills', name: 'Pay Bills', description: 'Pay utility and cable bills', icon: 'receipt', isActive: true, visible: true, implemented: true, isPopular: true, sortOrder: 3, route: '/services/bills' },
  { id: 'svc-smm', categoryId: 'cat-smm', name: 'SMM', description: 'Boost followers and engagement', icon: 'people', isActive: true, visible: true, implemented: true, isPopular: true, sortOrder: 4, route: '/services/smm' },
  { id: 'svc-giftcards', categoryId: 'cat-giftcards', name: 'Gift Cards', description: 'Trade gift cards securely', icon: 'gift', isActive: true, visible: true, implemented: true, isPopular: true, sortOrder: 5, route: '/services/gift-cards' },
  { id: 'svc-bankgen', categoryId: 'cat-bankgen', name: 'Bank Gen', description: 'Generate custom bank receipts', icon: 'receipt', isActive: true, visible: true, implemented: true, isPopular: true, sortOrder: 6, route: '/receipts/banks' },

  // Existing but not promoted to the Home / Popular section
  { id: 'svc-virtual', categoryId: 'cat-virtual', name: 'Virtual Numbers', description: 'Virtual numbers for verification', icon: 'call', isActive: true, visible: true, implemented: true, sortOrder: 7, route: '/services/virtual-numbers' },
  { id: 'svc-gaming', categoryId: 'cat-gaming', name: 'Gaming', description: 'Top up game accounts and credits', icon: 'game-controller', isActive: true, visible: true, implemented: true, sortOrder: 8, route: '/services/gaming' },
  { id: 'svc-logs-market', categoryId: 'cat-tools', name: 'Logs Market', description: 'Accounts, logs and digital goods', icon: 'document-text', isActive: true, visible: true, implemented: true, sortOrder: 9, route: '/(tabs)/marketplace' },

  // Upcoming services: visible, not implemented, will show Coming Soon
  { id: 'svc-qr', categoryId: 'cat-upcoming', name: 'QR Generator', description: 'Generate custom QR codes', icon: 'qr-code', isActive: true, visible: true, implemented: false, sortOrder: 10, route: '/(tabs)/services' },
  { id: 'svc-link', categoryId: 'cat-upcoming', name: 'Link Shortener', description: 'Shorten and manage links', icon: 'link', isActive: true, visible: true, implemented: false, sortOrder: 11, route: '/(tabs)/services' },
  { id: 'svc-scripts', categoryId: 'cat-upcoming', name: 'Scripts Market', description: 'Buy and sell scripts', icon: 'code-slash', isActive: true, visible: true, implemented: false, sortOrder: 12, route: '/(tabs)/services' },
  { id: 'svc-formats', categoryId: 'cat-upcoming', name: 'Formats', description: 'Courses and learning resources', icon: 'school', isActive: true, visible: true, implemented: false, sortOrder: 13, route: '/(tabs)/services' },
  { id: 'svc-hacked-apps', categoryId: 'cat-upcoming', name: 'Hacked Apps', description: 'Modified applications', icon: 'cube', isActive: true, visible: true, implemented: false, sortOrder: 14, route: '/(tabs)/services' },
  { id: 'svc-flash-emails', categoryId: 'cat-upcoming', name: 'Flash Emails', description: 'Temporary email addresses', icon: 'mail', isActive: true, visible: true, implemented: false, sortOrder: 15, route: '/(tabs)/services' },
  { id: 'svc-doc-edit', categoryId: 'cat-upcoming', name: 'Doc Edit', description: 'Document editing services', icon: 'create', isActive: true, visible: true, implemented: false, sortOrder: 16, route: '/(tabs)/services' },
];

export const mockSocialMediaServices: SocialMediaService[] = [
  { id: 'smm-ig-followers', categoryId: 'cat-smm', name: 'Instagram Followers', description: 'Real Nigerian followers', rate: 3, minQuantity: 100, maxQuantity: 50000, refill: true, cancel: true, platform: 'Instagram', averageTime: '1-6 hours' },
  { id: 'smm-ig-likes', categoryId: 'cat-smm', name: 'Instagram Likes', description: 'High quality post likes', rate: 2.5, minQuantity: 50, maxQuantity: 100000, refill: false, cancel: true, platform: 'Instagram', averageTime: '30 mins - 2 hours' },
  { id: 'smm-tt-followers', categoryId: 'cat-smm', name: 'TikTok Followers', description: 'Global TikTok followers', rate: 4, minQuantity: 100, maxQuantity: 50000, refill: true, cancel: true, platform: 'TikTok', averageTime: '2-12 hours' },
  { id: 'smm-tt-views', categoryId: 'cat-smm', name: 'TikTok Views', description: 'Fast video views', rate: 1.5, minQuantity: 500, maxQuantity: 1000000, refill: false, cancel: true, platform: 'TikTok', averageTime: '15-60 mins' },
  { id: 'smm-tw-followers', categoryId: 'cat-smm', name: 'X / Twitter Followers', description: 'Real-looking followers', rate: 5, minQuantity: 100, maxQuantity: 20000, refill: true, cancel: true, platform: 'X', averageTime: '2-24 hours' },
  { id: 'smm-yt-subscribers', categoryId: 'cat-smm', name: 'YouTube Subscribers', description: 'Stable subscribers', rate: 8, minQuantity: 50, maxQuantity: 10000, refill: true, cancel: false, platform: 'YouTube', averageTime: '1-3 days' },
  { id: 'smm-wa-views', categoryId: 'cat-smm', name: 'WhatsApp Status Views', description: 'Nigeria targeted views', rate: 1, minQuantity: 200, maxQuantity: 50000, refill: false, cancel: true, platform: 'WhatsApp', averageTime: '30 mins - 4 hours' },
  { id: 'smm-fb-likes', categoryId: 'cat-smm', name: 'Facebook Page Likes', description: 'Page likes worldwide', rate: 3.5, minQuantity: 100, maxQuantity: 50000, refill: true, cancel: true, platform: 'Facebook', averageTime: '2-12 hours' },
];

export const mockSocialProfiles: SocialProfile[] = [
  { id: 'sp-001', userId: mockUser.id, platform: 'WhatsApp', displayName: 'John Doe', username: '+234 812 345 6789', notes: 'Personal WhatsApp', createdAt: '2023-06-01T10:00:00Z', updatedAt: '2023-06-01T10:00:00Z' },
  { id: 'sp-002', userId: mockUser.id, platform: 'Instagram', displayName: '@johndoe_fintech', username: '@johndoe_fintech', photoUrl: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=200&h=200&fit=crop', notes: 'Main business page', createdAt: '2023-06-02T10:00:00Z', updatedAt: '2023-06-02T10:00:00Z' },
  { id: 'sp-003', userId: mockUser.id, platform: 'Snapchat', displayName: 'johndoe_snap', username: 'johndoe_snap', notes: 'Personal snap', createdAt: '2023-06-03T10:00:00Z', updatedAt: '2023-06-03T10:00:00Z' },
  { id: 'sp-004', userId: mockUser.id, platform: 'TikTok', displayName: '@johndoe_official', username: '@johndoe_official', notes: 'Content account', createdAt: '2023-06-04T10:00:00Z', updatedAt: '2023-06-04T10:00:00Z' },
  { id: 'sp-005', userId: mockUser.id, platform: 'Facebook', displayName: 'Johnathan Doe', username: 'Johnathan Doe', notes: 'Personal profile', createdAt: '2023-06-05T10:00:00Z', updatedAt: '2023-06-05T10:00:00Z' },
];

export const mockServiceOrders: ServiceOrder[] = [
  { id: 'ord-001', userId: mockUser.id, serviceId: 'smm-ig-followers', serviceName: 'Instagram Followers', platform: 'Instagram', link: 'https://instagram.com/johndoe_fintech', quantity: 1000, amount: 300000, status: 'successful', reference: 'HK-SMM-002', createdAt: '2024-08-17T14:20:00Z', updatedAt: '2024-08-17T14:20:00Z' },
  { id: 'ord-002', userId: mockUser.id, serviceId: 'smm-tt-views', serviceName: 'TikTok Views', platform: 'TikTok', link: 'https://tiktok.com/@johndoe_official', quantity: 5000, amount: 750000, status: 'pending', reference: 'HK-SMM-012', createdAt: '2024-08-17T10:00:00Z', updatedAt: '2024-08-17T10:00:00Z' },
];

const productImages = {
  netflix: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=600&h=400&fit=crop',
  spotify: 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=600&h=400&fit=crop',
  chatgpt: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=400&fit=crop',
  canva: 'https://images.unsplash.com/photo-1626785774573-4b799315e5eb?w=600&h=400&fit=crop',
  steam: 'https://images.unsplash.com/photo-1605901309584-818e25960a8f?w=600&h=400&fit=crop',
  psn: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=600&h=400&fit=crop',
  xbox: 'https://images.unsplash.com/photo-1605901309584-818e25960a8f?w=600&h=400&fit=crop',
  apple: 'https://images.unsplash.com/photo-1621768216002-5e1716e4debe?w=600&h=400&fit=crop',
};

export const mockProducts: Product[] = [
  { id: 'prod-001', name: 'Netflix Premium 4K', category: 'Streaming', description: '1-month shared Netflix Premium 4K UHD account. Supports 4 screens.', images: [productImages.netflix], type: 'Account', yearCreated: '2023', warranty: '30 days', accountLevel: 'Premium', shortDescription: '4K UHD shared account' },
  { id: 'prod-002', name: 'Spotify Family Plan', category: 'Streaming', description: 'Spotify Premium family slot. 1 month access.', images: [productImages.spotify], type: 'Slot', yearCreated: '2024', warranty: '30 days', accountLevel: 'Premium', shortDescription: 'Family plan slot' },
  { id: 'prod-003', name: 'ChatGPT Plus Account', category: 'Tools', description: 'Full ChatGPT Plus account with GPT-4 access. 1 month.', images: [productImages.chatgpt], type: 'Account', yearCreated: '2024', warranty: '30 days', accountLevel: 'Plus', shortDescription: 'GPT-4 enabled' },
  { id: 'prod-004', name: 'Canva Pro Lifetime', category: 'Tools', description: 'Canva Pro education account. Long-term warranty.', images: [productImages.canva], type: 'Account', yearCreated: '2024', warranty: '1 year', accountLevel: 'Pro', shortDescription: 'Lifetime Pro access' },
  { id: 'prod-005', name: 'Steam Wallet $50', category: 'Gaming', description: 'Steam wallet gift code worth $50 USD.', images: [productImages.steam], type: 'Code', yearCreated: '2024', warranty: 'N/A', accountLevel: 'N/A', shortDescription: 'Global USD code' },
  { id: 'prod-006', name: 'PlayStation Plus Extra', category: 'Gaming', description: 'PSN Extra subscription. 3 months.', images: [productImages.psn], type: 'Account', yearCreated: '2024', warranty: '90 days', accountLevel: 'Extra', shortDescription: '3 months subscription' },
];

export const mockListings: Listing[] = [
  { id: 'lst-001', sellerId: 'u-002', productId: 'prod-001', product: mockProducts[0], price: 450000, stock: 12, status: 'active', createdAt: '2024-08-10T10:00:00Z', updatedAt: '2024-08-10T10:00:00Z' },
  { id: 'lst-002', sellerId: 'u-002', productId: 'prod-002', product: mockProducts[1], price: 220000, stock: 8, status: 'active', createdAt: '2024-08-09T10:00:00Z', updatedAt: '2024-08-09T10:00:00Z' },
  { id: 'lst-003', sellerId: 'u-003', productId: 'prod-003', product: mockProducts[2], price: 1500000, stock: 5, status: 'active', createdAt: '2024-08-08T10:00:00Z', updatedAt: '2024-08-08T10:00:00Z' },
  { id: 'lst-004', sellerId: 'u-004', productId: 'prod-004', product: mockProducts[3], price: 300000, stock: 20, status: 'active', createdAt: '2024-08-07T10:00:00Z', updatedAt: '2024-08-07T10:00:00Z' },
  { id: 'lst-005', sellerId: 'u-005', productId: 'prod-005', product: mockProducts[4], price: 3500000, stock: 3, status: 'sold_out', createdAt: '2024-08-06T10:00:00Z', updatedAt: '2024-08-06T10:00:00Z' },
  { id: 'lst-006', sellerId: mockUser.id, productId: 'prod-006', product: mockProducts[5], price: 1200000, stock: 7, status: 'pending_review', createdAt: '2024-08-18T10:00:00Z', updatedAt: '2024-08-18T10:00:00Z' },
];

export const mockMarketplaceOrders: MarketplaceOrder[] = [
  { id: 'mpo-001', buyerId: mockUser.id, listingId: 'lst-001', sellerId: 'u-002', quantity: 1, totalPrice: 450000, status: 'successful', reference: 'HK-MP-003', deliveryDetails: 'Email: user@example.com', createdAt: '2024-08-16T11:10:00Z', updatedAt: '2024-08-16T11:10:00Z' },
  { id: 'mpo-002', buyerId: 'u-006', listingId: 'lst-006', sellerId: mockUser.id, quantity: 1, totalPrice: 1200000, status: 'pending', reference: 'HK-MP-010', createdAt: '2024-08-17T16:00:00Z', updatedAt: '2024-08-17T16:00:00Z' },
];

export const mockNotifications: Notification[] = [
  { id: 'ntf-001', userId: mockUser.id, title: 'Payment Received', body: 'You have received ₦25,000.00 from John Doe. Your new balance is ₦75,000.00.', category: 'transaction', isRead: false, createdAt: '2024-08-18T08:47:00Z' },
  { id: 'ntf-002', userId: mockUser.id, title: 'Security Alert', body: 'A new login was detected on a Linux device in Lagos, Nigeria. Was this you?', category: 'security', isRead: false, createdAt: '2024-08-18T07:30:00Z' },
  { id: 'ntf-003', userId: mockUser.id, title: 'Cashback Earned!', body: "Congratulations! You've earned ₦500 cashback on your last airtime purchase.", category: 'promotion', isRead: true, createdAt: '2024-08-17T15:00:00Z' },
  { id: 'ntf-004', userId: mockUser.id, title: 'Electricity Bill Paid', body: 'Your payment of ₦10,000.00 for Meter No. 44001234567 was successful.', category: 'transaction', isRead: true, createdAt: '2024-08-16T10:00:00Z' },
  { id: 'ntf-005', userId: mockUser.id, title: 'System Maintenance', body: 'We will be performing scheduled maintenance on Sunday from 2 AM to 4 AM.', category: 'system', isRead: true, createdAt: '2024-08-15T09:00:00Z' },
  { id: 'ntf-006', userId: mockUser.id, title: 'New Feature: Virtual Cards', body: 'You can now create USD virtual cards for your international subscriptions!', category: 'promotion', isRead: true, createdAt: '2024-08-14T09:00:00Z' },
];

export const mockReferrals: Referral[] = [
  { id: 'ref-001', referrerId: mockUser.id, referredUserId: 'u-007', status: 'rewarded', rewardAmount: 20000, createdAt: '2024-07-01T10:00:00Z', activatedAt: '2024-07-02T10:00:00Z' },
  { id: 'ref-002', referrerId: mockUser.id, referredUserId: 'u-008', status: 'pending', rewardAmount: 20000, createdAt: '2024-07-15T10:00:00Z' },
  { id: 'ref-003', referrerId: mockUser.id, referredUserId: 'u-009', status: 'pending', rewardAmount: 0, createdAt: '2024-08-01T10:00:00Z' },
];

export const mockRewards: Reward[] = [
  { id: 'rwd-001', title: '₦500 Airtime Voucher', description: 'Use towards any airtime purchase', pointsCost: 500, type: 'voucher', isAvailable: true },
  { id: 'rwd-002', title: '5% Marketplace Discount', description: 'Discount on next marketplace order', pointsCost: 1000, type: 'discount', isAvailable: true, expiresAt: '2024-09-30T23:59:59Z' },
  { id: 'rwd-003', title: '7-Day Streak Bonus', description: 'Complete daily tasks for 7 days', pointsCost: 300, type: 'streak', isAvailable: true },
  { id: 'rwd-004', title: '₦1,000 Cashback', description: 'Cashback to wallet', pointsCost: 2000, type: 'cashback', isAvailable: true },
];

export const mockPointsTransactions: HKPointTransaction[] = [
  { id: 'pt-001', userId: mockUser.id, type: 'wallet_conversion', points: 250, amount: 25000, status: 'successful', reference: 'HK-PTS-001', description: 'Converted from wallet', createdAt: '2024-08-14T18:30:00Z' },
  { id: 'pt-002', userId: mockUser.id, type: 'referral_conversion', points: 200, amount: 20000, status: 'successful', reference: 'HK-PTS-002', description: 'Converted from referral balance', createdAt: '2024-08-10T12:00:00Z' },
];

export const mockSupportTickets: SupportTicket[] = [
  { id: 'tkt-001', userId: mockUser.id, subject: 'Delay in Instagram order', category: 'Transactions', description: 'Order HK-SMM-002 has not completed after 24 hours.', status: 'resolved', priority: 'medium', createdAt: '2024-08-10T10:00:00Z', updatedAt: '2024-08-11T10:00:00Z' },
];

export const mockTutorials: Tutorial[] = [
  { id: 'tut-001', title: 'How to Fund Your Wallet', description: 'A quick guide on wallet funding methods', category: 'youtube', thumbnailUrl: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&h=225&fit=crop', videoUrl: 'https://youtube.com', createdAt: '2024-08-01T10:00:00Z' },
  { id: 'tut-002', title: 'New Marketplace Features', description: 'Explore the latest seller tools', category: 'announcement', createdAt: '2024-08-15T10:00:00Z' },
  { id: 'tut-003', title: 'Avoiding Scams', description: 'Safety tips for buying and selling', category: 'tip', createdAt: '2024-08-12T10:00:00Z' },
  { id: 'tut-004', title: 'Complete SMM Ordering Guide', description: 'Step-by-step social media service order', category: 'guide', createdAt: '2024-08-05T10:00:00Z' },
];

export const mockBanks: Bank[] = [
  // OPay is the first dedicated bank-gen receipt template.
  {
    id: 'bank-opay',
    name: 'OPay',
    code: 'OPAY',
    logoAsset: require('../../../assets/images/bank-logos/opay.jpg'),
    implemented: true,
    receiptTemplate: 'opay',
  },
  { id: 'bank-001', name: 'Kuda Bank', code: '50211', logoAsset: require('../../../assets/images/bank-logos/kuda.png'), implemented: false, receiptTemplate: 'generic' },
  { id: 'bank-005', name: 'United Bank for Africa', code: '033', logoAsset: require('../../../assets/images/bank-logos/uba.webp'), implemented: false, receiptTemplate: 'generic' },
  { id: 'bank-002', name: 'Access Bank', code: '044', logoUrl: 'https://logo.clearbit.com/accessbankplc.com', implemented: false, receiptTemplate: 'generic' },
  { id: 'bank-003', name: 'Guaranty Trust Bank', code: '058', logoUrl: 'https://logo.clearbit.com/gtbank.com', implemented: false, receiptTemplate: 'generic' },
  { id: 'bank-004', name: 'First Bank of Nigeria', code: '011', logoUrl: 'https://logo.clearbit.com/firstbanknigeria.com', implemented: false, receiptTemplate: 'generic' },
  { id: 'bank-006', name: 'Zenith Bank', code: '057', logoUrl: 'https://logo.clearbit.com/zenithbank.com', implemented: false, receiptTemplate: 'generic' },
  { id: 'bank-007', name: 'Fidelity Bank', code: '070', logoUrl: 'https://logo.clearbit.com/fidelitybank.ng', implemented: false, receiptTemplate: 'generic' },
  { id: 'bank-008', name: 'Union Bank', code: '032', logoUrl: 'https://logo.clearbit.com/unionbankng.com', implemented: false, receiptTemplate: 'generic' },
  { id: 'bank-palmpay', name: 'PalmPay', code: 'PALMPAY', logoAsset: require('../../../assets/images/bank-logos/palmpay.png'), implemented: false, receiptTemplate: 'generic' },
];
