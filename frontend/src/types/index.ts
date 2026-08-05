export type UserRole = 'super_admin' | 'owner_pharmacist' | 'counter_staff';

export interface User {
  id: number;
  business_id: number;
  full_name: string;
  email: string;
  role: UserRole;
}

export interface Business {
  id: number;
  name: string;
  license_number: string;
  address?: string;
  contact?: string;
  subscription_tier: 'basic' | 'pro';
  subscription_status: 'trial' | 'active' | 'expired';
  trial_ends_at: string;
}

export interface AuthState {
  user: User | null;
  business: Business | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface Batch {
  id: number;
  business_id: number;
  medicine_id: number;
  batch_number: string;
  expiry_date: string;
  quantity_in_stock: number;
  quantity?: number;
  received_date: string;
  supplier_id?: number;
  supplier_name?: string;
  purchase_price: number;
}

export interface Medicine {
  id: number;
  business_id: number;
  brand_name: string;
  generic_name: string;
  manufacturer?: string;
  category: string;
  requires_prescription: boolean;
  unit_type: string;
  purchase_price: number;
  sale_price: number;
  reorder_threshold: number;
  total_stock: number;
  earliest_expiry?: string;
  batches: Batch[];
  created_at: string;
}

export interface SaleItem {
  id: number;
  medicine_id: number;
  medicine_name?: string;
  medicine?: Medicine;
  batch_id: number;
  batch_number?: string;
  batch?: Batch;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Sale {
  id: number;
  invoice_number?: string;
  business_id: number;
  staff_id: number;
  staff_name?: string;
  customer_name?: string;
  customer_phone?: string;
  total_amount: number;
  payment_method: 'cash' | 'card' | 'mobile_wallet';
  prescription_verified: boolean;
  created_at: string;
  items: SaleItem[];
}
