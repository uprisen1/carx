export type Role = "private_seller" | "dealer" | "buyer";
export type ListingStatus = "pending" | "active" | "sold" | "rejected" | "archived";
export type Transmission = "manual" | "automatic";
export type FuelType = "petrol" | "diesel" | "hybrid" | "electric";
export type Condition = "brand_new" | "foreign_used" | "locally_used";

export interface Profile {
  id: string;
  role: Role;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Dealer {
  id: string;
  user_id: string;
  business_name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  verified: boolean;
  created_at: string;
}

export interface Listing {
  id: string;
  seller_id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number | null;
  transmission: Transmission | null;
  fuel_type: FuelType | null;
  condition: Condition | null;
  location: string | null;
  description: string | null;
  status: ListingStatus;
  created_at: string;
  updated_at: string;
}

export interface ListingImage {
  id: string;
  listing_id: string;
  url: string;
  sort_order: number;
}

export interface Conversation {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}
