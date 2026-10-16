export interface User {
  id: string;
  name: string;
  role: 'client' | 'artist' | 'manager' | 'service-staff';
  phone: string;
  avatar: string | null;
  cover_image: string | null;
  title: string | null;
  city: string | null;
  bio: string | null;
  resume_text: string | null;
  skills_json: string;
  certifications_json: string;
  open_for_hiring: boolean;
  accepting_requests: boolean;
  salon_name: string | null;
  salon_location: string | null;
  salon_description: string | null;
  contract_type: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  contract_amount: string | null;
  contract_file_url: string | null;
  guarantee_type: string | null;
  guarantee_file_url: string | null;
  created_at: string;
}

export interface Post {
  id: string;
  author_id: string;
  content: string;
  image: string | null;
  tag: string | null;
  likes_count: number;
  liked_by_json: string;
}

// Transactions API entity
export interface Transaction {
  id: string;
  salon_id: string;
  direction: 'income' | 'cost';
  category: string;
  amount: number;
  date: string;
  description: string | null;
  receipt_url: string | null;
  related_staff_id: string | null;
  related_request_id: string | null;
  created_at: string;
}

// Client Requests API entity
export interface ClientRequest {
  id: string;
  client_id: string;
  target_id: string;
  target_type: string;
  service_type: string;
  service_id: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  note: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  price: number;
  cancellation_json: string;
  created_at: string;
}

// Hiring Offers API entity
export interface HiringOffer {
  id: string;
  manager_id: string;
  artist_id: string;
  salon_name: string | null;
  message: string | null;
  offer_amount: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

// Discounted Slots entity
export interface DiscountedSlot {
  id: string;
  original_request_id: string;
  artist_id: string;
  artist_name: string | null;
  salon_name: string | null;
  service_type: string | null;
  date: string | null;
  time: string | null;
  original_price: number;
  discounted_price: number;
  discount_percent: number;
  app_commission_percent: number;
  status: 'available' | 'claimed' | 'expired';
  claimed_by_client_id: string | null;
  created_at: string;
}

// Additional entity interfaces...