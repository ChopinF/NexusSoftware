import React, { useState, useEffect, useMemo } from 'react';
import { MainTemplate } from "../../templates/MainTemplate/MainTemplate";
import { useUser } from "../../../contexts/UserContext"; 
import { API_URL } from "../../../config";
import { 
  Clock, CheckCircle, XCircle, ShoppingBag, ArrowRight, Ban, Check 
} from "lucide-react";
import styles from './DealsPage.module.css'; 
import { Spinner } from "../../atoms/Spinner/Spinner";
import { useNavigate } from 'react-router-dom';

function timeAgo(dateString: string) {
  if (!dateString) return "";
  let formattedDate = dateString.replace(" ", "T");
  if (!formattedDate.endsWith("Z")) {
    formattedDate += "Z";
  }
  const date = new Date(formattedDate);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 0) return "Just now";
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'ACCEPTED': return <CheckCircle size={20} color="#10B981" />;
    case 'REJECTED': return <XCircle size={20} color="#EF4444" />;
    case 'ORDERED': return <ShoppingBag size={20} color="#3B82F6" />;
    default: return <Clock size={20} color="#F59E0B" />;
  }
};

interface DealItem {
  id: string;
  product_id: string;
  buyer_id: string;
  seller_id: string;
  offered_price: number;
  quantity: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'ORDERED';
  created_at: string;
  product_title: string;
  product_image: string;
  buyer_email: string;
  seller_email: string;
}

const DealsPage: React.FC = () => {
  const { user, token } = useUser();
  const navigate = useNavigate();
  
  const [Deals, setDeals] = useState<DealItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending'>('all');

  const fetchDeals = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/negotiations/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDeals(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, [token]);

  const handleAction = async (id: string, action: 'accept' | 'decline') => {
    try {
      await fetch(`${API_URL}/negotiations/${id}/${action}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDeals();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredList = useMemo(() => {
    if (filter === 'pending') return Deals.filter(n => n.status === 'PENDING');
    return Deals;
  }, [Deals, filter]);

  const renderActions = (item: DealItem) => {
    const isSeller = user?.id === item.seller_id;

    if (isSeller && item.status === 'PENDING') {
      return (
        <div className={styles.buttonsGroup}>
          <button 
            onClick={(e) => { e.stopPropagation(); handleAction(item.id, 'accept'); }} 
            className={`${styles.actionBtn} ${styles.acceptBtn}`}
            title="Accept Offer"
          >
            <Check size={18} /> Accept
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); handleAction(item.id, 'decline'); }} 
            className={`${styles.actionBtn} ${styles.declineBtn}`}
            title="Decline Offer"
          >
            <Ban size={18} /> Decline
          </button>
        </div>
      );
    }

    if (!isSeller && item.status === 'ACCEPTED') {
      return (
        <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              navigate(`/product/${item.product_id}/order?dealId=${item.id}`); 
            }}
            className={`${styles.buyBtn}`}
        >
          Buy Now <ArrowRight size={16} />
        </button>
      );
    }

    return (
      <span className={`${styles.statusBadge} ${styles[item.status.toLowerCase()]}`}>
        {item.status}
      </span>
    );
  };

  return (
    <MainTemplate>
      <div className={styles.container}>
        
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <h1>Deals</h1>
            <span className={styles.badgeCount}>{Deals.length}</span>
          </div>
        </div>

        <div className={styles.filters}>
          <button 
            className={`${styles.filterBtn} ${filter === 'all' ? styles.activeFilter : ''}`} 
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={`${styles.filterBtn} ${filter === 'pending' ? styles.activeFilter : ''}`} 
            onClick={() => setFilter('pending')}
          >
            Pending
          </button>
        </div>

        <div className={styles.list}>
          {loading ? (
             <div className={styles.loader}><Spinner size="lg" /></div>
          ) : filteredList.length === 0 ? (
            <div className={styles.emptyState}>
              <Clock size={48} style={{margin: '0 auto', opacity: 0.5}} />
              <h3>No Deals yet</h3>
              <p>Offers you make or receive will appear here.</p>
            </div>
          ) : (
            filteredList.map((item) => {
              const isSeller = user?.id === item.seller_id;
              
              return (
                <div 
                  key={item.id}
                  className={`${styles.card} ${item.status === 'PENDING' ? styles.unread : ''}`}
                  onClick={() => navigate(`/product/${item.product_id}`)}
                >
                  <div className={styles.iconWrapper}>
                    <StatusIcon status={item.status} />
                  </div>

                  <div className={styles.contentWrapper}>
                    <div className={styles.topRow}>
                       <span className={styles.productTitle}>{item.product_title}</span>
                       <span className={styles.timeText}>{timeAgo(item.created_at)}</span>
                    </div>
                    
                    <p className={styles.messageText}>
                      {isSeller ? (
                        <>
                          Buyer <strong>{item.buyer_email}</strong> offered: <span className={styles.priceHighlight}>{item.offered_price} RON</span>
                          <span style={{ marginLeft: '6px', color: '#9CA3AF', fontWeight: 500 }}>
                            (x{item.quantity} buc)
                          </span>
                        </>
                      ) : (
                        <>
                          You offered: <span className={styles.priceHighlight}>{item.offered_price} RON</span> 
                          <span style={{ margin: '0 6px', color: '#9CA3AF', fontWeight: 500 }}>
                            (x{item.quantity} buc)
                          </span>
                          to seller.
                        </>
                      )}
                    </p>
                  </div>

                  <div className={styles.actionsSide}>
                    {renderActions(item)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </MainTemplate>
  );
};

export default DealsPage;