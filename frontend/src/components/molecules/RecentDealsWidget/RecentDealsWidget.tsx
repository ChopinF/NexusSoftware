import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from "../../../config";
import { useUser } from "../../../contexts/UserContext";
import { Clock, CheckCircle, XCircle, ArrowRight, User } from 'lucide-react';
import './RecentDealsWidget.css';
import type { NegotiationItem } from '../../../types/Negotiation';

const RecentDealsWidget: React.FC<{ productId: string }> = ({ productId }) => {
  const { token } = useUser();
  const navigate = useNavigate();
  const [Deals, setDeals] = useState<NegotiationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${API_URL}/negotiations/list`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data: NegotiationItem[] = await res.json();
          const productDeals = data
            .filter(n => n.product_id === productId)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          
          setDeals(productDeals);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, productId]);

  if (loading) return null;
  if (Deals.length === 0) return null;

  const displayItems = Deals.slice(0, 3);
  const hasMore = Deals.length > 3;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACCEPTED': return <CheckCircle size={16} color="#10B981" />;
      case 'REJECTED': return <XCircle size={16} color="#EF4444" />;
      default: return <Clock size={16} color="#F59E0B" />;
    }
  };

  return (
    <div className="Deals-widget">
      <div className="widget-header">
        <h3>Recent Offers</h3>
        <span className="offer-count">{Deals.length} total</span>
      </div>

      <div className="widget-list">
        {displayItems.map((item) => (
          <div key={item.id} className="widget-item">
            <div className="item-left">
              <div className="user-avatar">
                <User size={16} />
              </div>
              <div className="item-info">
                <span className="buyer-email">{item.buyer_email}</span>
                <span className="offer-date">
                    {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            
            <div className="item-right">
              <span className="offer-price">{item.offered_price} RON</span>
              <div className={`status-badge ${item.status.toLowerCase()}`}>
                {getStatusIcon(item.status)}
                <span>{item.status}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <button 
            className="view-all-btn" 
            onClick={() => navigate('/deals')}
        >
          View all offers <ArrowRight size={16} />
        </button>
      )}
    </div>
  );
};

export default RecentDealsWidget;