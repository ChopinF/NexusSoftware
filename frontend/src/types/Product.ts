export interface Product {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  imageUrl?: string;
  isFavorite?: boolean;
  stock: number;
  status: 'ACTIVE' | 'ARCHIVED';
  seller_id: string;
  seller_name: string;
  seller_email: string;
  seller_city: string;
  seller_country: string;
  seller_role: string;
}