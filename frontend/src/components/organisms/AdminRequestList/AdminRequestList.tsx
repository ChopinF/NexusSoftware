import React, { useEffect, useState } from 'react';
import { Button } from '../../atoms/Button/Button';
import { useUser } from '../../../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import styles from './AdminRequestList.module.css';

interface Request {
  id: string;
  pitch: string;
  created_at: string;
  name: string;
  email: string;
  user_id: string;
  karma: number;
}

export const AdminRequestList: React.FC = () => {
  const { token, user } = useUser();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      const res = await fetch('http://localhost:3000/admin/requests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role !== 'Admin') {
      navigate('/');
      return;
    }
    fetchRequests();
  }, [user, navigate, token]);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    if (!confirm(`Are you sure you want to ${action} this request?`)) return;
    
    try {
      const res = await fetch(`http://localhost:3000/admin/request/${id}/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        // Remove processed request from list
        setRequests(prev => prev.filter(r => r.id !== id));
      } else {
        alert('Action failed');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to process request');
    }
  };

  const getKarmaClass = (karma: number) => {
    if (karma <= 10) return styles.karmaLow;
    if (karma <= 100) return styles.karmaMed;
    return styles.karmaHigh;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Pending Seller Requests</h2>
        <span className={styles.badge}>
          {requests.length} Pending
        </span>
      </div>

      {loading ? (
        <div className={styles.emptyState}>Loading requests...</div>
      ) : requests.length === 0 ? (
        <div className={styles.emptyState}>No pending requests.</div>
      ) : (
        <div className={styles.list}>
          {requests.map((req) => (
            <div key={req.id} className={styles.item}>
              <div className={styles.itemContent}>
                
                {/* User Info Column */}
                <div className={styles.userInfo}>
                  <div className={styles.userHeader}>
                    <div className={styles.avatar}>
                      {req.name.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.userDetails}>
                      <h3 className={styles.userName}>{req.name}</h3>
                      <p className={styles.userEmail}>{req.email}</p>
                    </div>
                  </div>
                  
                  <div className={`${styles.karmaBadge} ${getKarmaClass(req.karma)}`}>
                    Karma: {req.karma}
                  </div>
                  
                  <div className={styles.date}>
                    Applied: {new Date(req.created_at).toLocaleDateString()}
                  </div>
                </div>

                {/* Pitch Column */}
                <div className={styles.pitchSection}>
                  <h4 className={styles.pitchLabel}>Pitch</h4>
                  <p className={styles.pitchText}>
                    {req.pitch}
                  </p>
                </div>

                {/* Actions Column */}
                <div className={styles.actions}>
                  <Button 
                    onClick={() => handleAction(req.id, 'approve')} 
                    variant="primary"
                    className="w-full justify-center !bg-green-600 hover:!bg-green-700"
                  >
                    Approve
                  </Button>
                  <Button 
                    onClick={() => handleAction(req.id, 'reject')} 
                    variant="danger"
                    className="w-full justify-center"
                  >
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};