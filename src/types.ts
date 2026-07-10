export interface Container {
  id: string;
  containerFullId: string;
  accessCode: string;
  adults: number;
  children: number;
  babies: number;
  contactNumber?: string;
  specialNeeds?: string;
  notes?: string;
}

export interface Product {
  id: string;
  name: string;
  unit: string;
  mainCategory: string;
  category: string;
  icon: string;
  imageUrl: string;
  maxPerAdult: number;
  maxPerChild: number;
  maxPerBaby: number;
  cooldownHours: number;
  inStock?: boolean;
  stockQuantity?: number;
  sizesStock?: Record<string, number>;
}

export interface RequestItem {
  id: string;
  containerId: string;
  containerName?: string;
  productId: string;
  productName: string;
  quantity: number;
  status: 'pending' | 'approved' | 'rejected' | 'delivered' | 'fulfilled';
  size?: string;
  age?: string;
  createdAt: string;
}

export interface Report {
  id: string;
  description: string;
  type: string;
  priority: string;
  status: 'new' | 'dispatched' | 'rejected';
  source: string;
  createdAt: string;
}

export interface Donation {
  id: string;
  donorId: string;
  donorName: string;
  donorPhone?: string;
  donorEmail?: string;
  type: 'bireysel' | 'kurumsal';
  description?: string;
  items?: { productId: string; productName: string; quantity: number }[];
  fulfilledRequests?: string[];
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  createdAt: string;
}

export interface Issue {
  id: string;
  containerId: string;
  type: string;
  description: string;
  status: 'pending' | 'resolved' | 'rejected';
  createdAt: string;
}

export interface UserSession {
  uid: string;
  role: 'afetzede' | 'bagisci_bireysel' | 'bagisci_kurumsal' | 'yetkili' | 'belediye';
  name?: string;
  email?: string;
  containerId?: string;
}
