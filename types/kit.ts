export interface KitItem {
  type: 'tshirt' | 'trousers' | 'gloves' | 'shinpads' | 'kitbag';
  size: string;
}

export interface KitCatalogItem {
  id: number;
  type: 'tshirt' | 'trousers' | 'gloves' | 'shinpads' | 'kitbag';
  name: string;
  sizes: string[];
  price: number;
  description?: string;
  image_url?: string | null;
}

export interface KitOrder {
  id: number;
  booking_id?: number;
  student_name?: string;
  contact_email?: string;
  contact_phone?: string;
  items: KitItem[];
  notes?: string;
  created_at: string;
  updated_at: string;
  status?: 'pending' | 'ordered' | 'received' | 'distributed';
  coach_name?: string;
  booking?: {
    id: number;
    names: string;
    email?: string;
    phone?: string;
  };
}