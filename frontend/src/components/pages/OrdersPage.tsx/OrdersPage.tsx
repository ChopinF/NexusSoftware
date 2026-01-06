import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // 1. Import useNavigate
import { MainTemplate } from "../../templates/MainTemplate/MainTemplate";
import { useUser } from "../../../contexts/UserContext";
import { Spinner } from "../../atoms/Spinner/Spinner";
import { 
  Package, Truck, CheckCircle, Clock, MapPin, 
  DollarSign, User, AlertCircle 
} from "lucide-react";
import styles from './OrdersPage.module.css';
import { API_URL } from "../../../config";

interface Order {
  id: string;
  price: number;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  created_at: string;
  product_title: string;
  product_id: string;
  product_image?: string;
  buyer_name?: string;
  shipping_address?: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'delivered': return '#10B981';
    case 'shipped': return '#3B82F6';
    case 'paid': return '#8B5CF6';
    case 'cancelled': return '#EF4444';
    default: return '#F59E0B';
  }
};

const StatusIcon = ({ status }: { status: string }) => {
  const color = getStatusColor(status);
  switch (status) {
    case 'delivered': return <CheckCircle size={20} color={color} />;
    case 'shipped': return <Truck size={20} color={color} />;
    case 'paid': return <DollarSign size={20} color={color} />;
    case 'cancelled': return <AlertCircle size={20} color={color} />;
    default: return <Clock size={20} color={color} />;
  }
};

const OrdersPage: React.FC = () => {
  const { token, user } = useUser();
  const navigate = useNavigate(); // 3. Initializam hook-ul
  const [activeTab, setActiveTab] = useState<'buying' | 'selling'>('buying');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const endpoint = activeTab === 'buying' ? '/orders/buying' : '/orders/selling';
      const res = await fetch(`${API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error("Failed to fetch orders", err);
    } finally {
      setLoading(false);
    }
  }, [token, activeTab]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleStatusUpdate = async (e: React.MouseEvent, orderId: string, newStatus: string) => {
    e.stopPropagation();
    setUpdatingId(orderId);
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus as any } : o));
      } else {
        alert("Failed to update status");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  return (
    <MainTemplate>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <h1>My Orders</h1>
            {!loading && <span className={styles.badgeCount}>{orders.length}</span>}
          </div>
        </div>

        <div className={styles.filters}>
          <button 
            className={`${styles.filterBtn} ${activeTab === 'buying' ? styles.activeFilter : ''}`} 
            onClick={() => setActiveTab('buying')}
          >
            My Purchases
          </button>
          
          {(user?.role === 'Trusted' || user?.role === 'Admin') && (
            <button 
              className={`${styles.filterBtn} ${activeTab === 'selling' ? styles.activeFilter : ''}`} 
              onClick={() => setActiveTab('selling')}
            >
              Sales Dashboard
            </button>
          )}
        </div>

        <div className={styles.list}>
          {loading ? (
             <div className={styles.loader}>
                <Spinner size="lg" />
             </div>
          ) : orders.length === 0 ? (
            <div className={styles.emptyState}>
              <Package size={48} style={{margin: '0 auto', opacity: 0.5}} />
              <h3>No orders found</h3>
              <p>
                {activeTab === 'buying' 
                  ? "You haven't purchased anything yet." 
                  : "You haven't received any orders yet."}
              </p>
            </div>
          ) : (
            orders.map((order) => (
              <div 
                key={order.id} 
                className={styles.card}
                onClick={() => navigate(`/product/${order.product_id}`)}
                style={{ cursor: 'pointer' }}
              >
                
                <div className={styles.iconWrapper}>
                  {order.product_image ? (
                    <img src={`${API_URL}${order.product_image}`} alt={order.product_title} className={styles.productImg} />
                  ) : (
                    <Package size={20} color="#9ca3af" />
                  )}
                </div>

                <div className={styles.contentWrapper}>
                  <div className={styles.topRow}>
                    <h4 className={styles.productTitle}>{order.product_title}</h4>
                    <span className={styles.price}>{order.price} RON</span>
                  </div>
                  
                  <div className={styles.metaRow}>
                    <span className={styles.dateText}>{formatDate(order.created_at)}</span>
                    <span className={styles.dotSeparator}>•</span>
                    <div className={styles.statusBadge} style={{ color: getStatusColor(order.status), borderColor: getStatusColor(order.status) + '40', background: getStatusColor(order.status) + '10' }}>
                        {order.status.toUpperCase()}
                    </div>
                  </div>

                  {activeTab === 'selling' && (
                    <div className={styles.sellerInfo}>
                        <div className={styles.infoItem}>
                            <User size={14} /> {order.buyer_name}
                        </div>
                        <div className={styles.infoItem}>
                            <MapPin size={14} /> {order.shipping_address}
                        </div>
                    </div>
                  )}
                </div>

                <div className={styles.actionsWrapper}>
                  
                  {activeTab === 'selling' && order.status !== 'cancelled' && order.status !== 'delivered' && (
                      <div className={styles.sellerActions}>
                        {order.status === 'pending' || order.status === 'paid' ? (
                            <button 
                                onClick={(e) => handleStatusUpdate(e, order.id, 'shipped')}
                                className={styles.actionBtn}
                                disabled={!!updatingId}
                                title="Mark as Shipped"
                            >
                                <Truck size={18} /> Shipped
                            </button>
                        ) : order.status === 'shipped' ? (
                            <button 
                                onClick={(e) => handleStatusUpdate(e, order.id, 'delivered')}
                                className={`${styles.actionBtn} ${styles.deliverBtn}`}
                                disabled={!!updatingId}
                                title="Mark as Delivered"
                            >
                                <CheckCircle size={18} /> Delivered
                            </button>
                        ) : null}
                      </div>
                  )}

                  <div className={styles.statusIconDisplay}>
                      {updatingId === order.id ? <Spinner size="sm" /> : <StatusIcon status={order.status} />}
                  </div>
                </div>

              </div>
            ))
          )}
        </div>
      </div>
    </MainTemplate>
  );
};

export default OrdersPage;