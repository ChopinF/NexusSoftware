export interface ComparisonItem {
  source: string;
  title: string;
  price: number;
  link: string;
}

export interface PriceComparisonData {
  searchTerm: string;
  averageMarketPrice: number | null;
  comparisons: ComparisonItem[];
}