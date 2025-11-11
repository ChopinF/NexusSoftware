export interface Product {
    id: string;
    title: string;
    description: string;
    price: number;
    category: string;
    sellerEmail: string;
    isFavorite?: boolean;
    imageUrl?: string;
}

export interface Product {
    id: string;
    title: string;
    description: string;
    category: string;
    price: number;
    seller_id: string;
    seller_name: string;
    seller_email: string;
    seller_city: string;
    seller_country: string;
    seller_role: string;
    imageUrl?: string;
}