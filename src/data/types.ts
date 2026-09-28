/** Shared UI shapes. Runtime records come from the API; fixtures are test-only. */

export interface ImageAsset {
  src: string;
  alt: string;
  width: number;
  height: number;
  position?: string;
  caption?: string;
}

export type StayType = 'homestay' | 'eco-lodge' | 'resort' | 'bungalow' | 'nha-san';

export type AmenityId =
  | 'wifi'
  | 'breakfast'
  | 'view'
  | 'kitchen'
  | 'family'
  | 'parking'
  | 'eco'
  | 'pool';

export interface RoomType {
  id: string;
  name: string;
  /** Maximum guests (adults + children) per room. */
  capacity: number;
  areaM2: number;
  view: string;
  description: string;
  pricePerNight: number;
  image: ImageAsset;
  /** Photos specific to this room category; inventory dates have no photos. */
  gallery?: ImageAsset[];
  badge?: string;
  breakfastIncluded: boolean;
  /** Most rooms of this type that may be requested in one booking draft. */
  maxRooms: number;
}

export interface Host {
  name: string;
  tagline: string;
  quote: string;
  bio: string;
  avatar: ImageAsset;
  isDemo?: boolean;
}

export interface Review {
  id: string;
  author: string;
  context?: string;
  rating: number;
  date?: string;
  quote: string;
  avatar: ImageAsset | null;
  photos?: ImageAsset[];
  isDemo?: boolean;
}

export interface Faq {
  id: string;
  question: string;
  answer: string | import('@/lib/content/rich-document').RichDocument;
}
