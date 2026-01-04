import React from "react";
import { TrendingDown, TrendingUp, ExternalLink, Loader2 } from "lucide-react";
import type { PriceComparisonData } from "../../../types/PriceComparison";
import "./PriceComparisonWidget.css"; 

interface PriceComparisonWidgetProps {
  currentPrice: number;
  data: PriceComparisonData | null;
  loading: boolean;
}

export const PriceComparisonWidget: React.FC<PriceComparisonWidgetProps> = ({
  currentPrice,
  data,
  loading,
}) => {
  if (loading) {
    return (
      <div className="price-comparison-container loading">
        <Loader2 className="animate-spin" size={24} />
        <span>Searching competitor prices...</span>
      </div>
    );
  }

  if (!data || !data.averageMarketPrice) return null;

  const diff = currentPrice - data.averageMarketPrice;
  const isCheaper = diff < 0;
  const percentage = Math.abs((diff / data.averageMarketPrice) * 100).toFixed(0);

  return (
    <div className="price-comparison-container">
      <h3>Market Price Comparison</h3>
      
      <div className="comparison-content">
        <div className="market-summary">
          <div className="market-badge">
            {isCheaper ? (
              <span className="badge-good">
                <TrendingDown size={20} /> {percentage}% below market average
              </span>
            ) : (
              <span className="badge-high">
                <TrendingUp size={20} /> {percentage}% above market average
              </span>
            )}
          </div>
          <p className="avg-text">
            Average on eMAG: <strong>{data.averageMarketPrice.toFixed(2)} RON</strong>
          </p>
        </div>

        <div className="competitor-list">
          <span className="list-title">Found examples:</span>
          <div className="cards-wrapper">
            {data.comparisons.slice(0, 3).map((item, idx) => (
              <a key={idx} href={item.link} target="_blank" rel="noopener noreferrer" className="comp-card">
                <div className="comp-info">
                    <span className="comp-title" title={item.title}>{item.title}</span>
                    <span className="comp-source">Sold by {item.source}</span>
                </div>
                <div className="comp-price-action">
                    <span className="comp-price">{item.price.toFixed(2)} RON</span>
                    <ExternalLink size={14} />
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};