export interface NegotiationItem {
  id: string;
  product_id: string;
  buyer_email: string;
  offered_price: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'ORDERED';
  created_at: string;
}