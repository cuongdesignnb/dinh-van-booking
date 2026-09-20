/** Domain types for the admin demo. Kept free of UI concerns so the demo
 *  repository can later be swapped for a real API adapter. */

export type BookingStatus =
  | 'pending_confirmation'
  | 'confirmed'
  | 'checked_in'
  | 'completed'
  | 'cancelled';

export type PaymentStatus =
  | 'unpaid'
  | 'partially_paid'
  | 'paid'
  | 'partially_refunded'
  | 'refunded';

export type PublishingStatus = 'draft' | 'published' | 'hidden';
export type InquiryStage = 'new' | 'consulting' | 'waiting' | 'won';
export type BookingChannel = 'website' | 'facebook' | 'direct' | 'booking_com' | 'agoda';
export type PropertyState = 'active' | 'maintenance' | 'hidden';

export interface Property {
  id: string;
  code: string;
  slug: string;
  name: string;
  kind: 'homestay' | 'resort' | 'lodge' | 'bungalow' | 'stilt';
  area: string;
  address: string;
  cover: string;
  gallery: string[];
  shortDescription: string;
  description: string;
  amenities: string[];
  rating: number;
  reviewCount: number;
  fromPrice: number;
  state: PropertyState;
  publication: PublishingStatus;
  featured: boolean;
  pinned: boolean;
  policies: { checkIn: string; checkOut: string; maxGuests: number; note: string };
  seo: { title: string; description: string };
}

export interface RoomType {
  id: string;
  propertyId: string;
  name: string;
  capacityMin: number;
  capacityMax: number;
  area: number;
  bed: string;
  units: number;
  basePrice: number;
  weekendPrice: number;
  amenities: string[];
  state: 'active' | 'paused';
}

/** One physical unit; inventory is tracked per unit-day. */
export interface RoomUnit {
  id: string;
  roomTypeId: string;
  propertyId: string;
  label: string;
}

export type InventoryFlag = 'maintenance' | 'blocked';

export interface InventoryOverride {
  roomTypeId: string;
  date: string;
  flag: InventoryFlag;
  units: number;
  reason: string;
}

export interface RateSeason {
  id: string;
  name: string;
  from: string;
  to: string;
  kind: 'percent' | 'amount';
  value: number;
  priority: number;
  enabled: boolean;
}

export interface RateSettings {
  weekendEnabled: boolean;
  weekendDays: number[];
  seasonalEnabled: boolean;
  seasons: RateSeason[];
}

export interface BookingLine {
  kind: 'room' | 'combo' | 'addon';
  refId: string | null;
  label: string;
  unit: string;
  quantity: number;
  unitPrice: number;
}

export interface PaymentRecord {
  id: string;
  bookingId: string;
  at: string;
  amount: number;
  method: 'bank_transfer' | 'cash' | 'card';
  kind: 'payment' | 'refund';
  reference: string;
}

export interface Booking {
  id: string;
  code: string;
  customerId: string;
  propertyId: string | null;
  roomTypeId: string | null;
  comboId: string | null;
  createdAt: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  adults: number;
  children: number;
  lines: BookingLine[];
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  channel: BookingChannel;
  note: string;
  cancelReason?: string;
  history: { at: string; text: string; author: string }[];
  internalNotes: { at: string; text: string; author: string }[];
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  source: 'website' | 'facebook' | 'zalo' | 'direct' | 'referral';
  group: 'family' | 'couple' | 'friends' | 'company' | 'solo';
  need: string;
  tags: string[];
  preferences: string[];
  note: string;
  ownerId: string;
  createdAt: string;
  avatar?: string;
}

export interface Interaction {
  id: string;
  customerId: string;
  inquiryId: string | null;
  at: string;
  channel: 'zalo' | 'phone' | 'email' | 'website' | 'note';
  direction: 'in' | 'out' | 'internal';
  author: string;
  text: string;
}

export interface Inquiry {
  id: string;
  customerId: string;
  createdAt: string;
  source: Customer['source'];
  stage: InquiryStage;
  summary: string;
  ownerId: string;
  read: boolean;
  priority: boolean;
  bookingId: string | null;
  resolvedAt: string | null;
}

export interface FollowUp {
  id: string;
  customerId: string;
  inquiryId: string | null;
  date: string;
  time: string;
  purpose: string;
  ownerId: string;
  done: boolean;
}

export interface ComboDeparture {
  id: string;
  date: string;
  seats: number;
  booked: number;
  open: boolean;
}

export interface AdminCombo {
  id: string;
  slug: string;
  name: string;
  area: string;
  cover: string;
  gallery: string[];
  days: number;
  nights: number;
  audiences: string[];
  tags: string[];
  price: number;
  priceUnit: 'person' | 'group';
  childPrice: number | null;
  bookings: number;
  views: number;
  revenue: number;
  state: 'selling' | 'paused' | 'draft';
  badge: 'featured' | 'bestseller' | 'seasonal' | null;
  featured: boolean;
  summary: string;
  itinerary: { day: number; title: string; time: string; activities: string[] }[];
  includes: string[];
  excludes: string[];
  destinationIds: string[];
  propertyIds: string[];
  promotion: { label: string; value: number; kind: 'percent' | 'amount'; until: string } | null;
  terms: string[];
}

export interface AdminDestination {
  id: string;
  slug: string;
  name: string;
  category: 'nature' | 'culture' | 'food' | 'checkin';
  image: string;
  gallery: string[];
  shortDescription: string;
  content: string;
  tags: string[];
  publication: PublishingStatus;
  updatedAt: string;
  views: number;
  seo: { title: string; description: string; ogImage: string | null };
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  category: string;
  author: string;
  cover: string;
  excerpt: string;
  /** Plain-text projection of `contentDocument`, kept for search and previews. */
  content: string;
  /** TipTap/ProseMirror document — the shape the API stores and sanitises. */
  contentDocument?: unknown;
  publication: PublishingStatus;
  updatedAt: string;
  views: number;
  seo: { title: string; description: string; ogImage: string | null };
}

export interface MediaAsset {
  id: string;
  file: string;
  url: string;
  kind: 'image';
  width: number;
  height: number;
  bytes: number;
  alt: string;
  caption: string;
  tags: string[];
  uploadedAt: string;
}

export interface AdminUser {
  id: string;
  name: string;
  role: 'owner' | 'editor' | 'viewer';
}

export interface AdminData {
  properties: Property[];
  roomTypes: RoomType[];
  roomUnits: RoomUnit[];
  inventoryOverrides: InventoryOverride[];
  rates: RateSettings;
  bookings: Booking[];
  payments: PaymentRecord[];
  customers: Customer[];
  inquiries: Inquiry[];
  interactions: Interaction[];
  followUps: FollowUp[];
  combos: AdminCombo[];
  destinations: AdminDestination[];
  articles: Article[];
  media: MediaAsset[];
  users: AdminUser[];
  /** Website analytics are not integrated; demo numbers only. */
  analytics: { visits: number; visitsPrev: number; contentViews: number; contentViewsPrev: number };
}
