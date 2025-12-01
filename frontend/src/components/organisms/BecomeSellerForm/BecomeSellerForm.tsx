import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../../contexts/UserContext";

import { Button } from "../../atoms/Button/Button";
import { Textarea } from "../../atoms/Textarea/Textarea";
import { Spinner } from "../../atoms/Spinner/Spinner";
import { FormField } from "../../molecules/FormField/FormField";
import { AlertMessage } from "../../molecules/AlertMessage/AlertMessage";
import styles from "./BecomeSellerForm.module.css";

interface TrustedRequest {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  pitch: string;
}

export const BecomeSellerForm: React.FC = () => {
  const { token, user } = useUser();
  const navigate = useNavigate();

  const [pitch, setPitch] = useState("");
  const [agreed, setAgreed] = useState(false);
  
  const [requestStatus, setRequestStatus] = useState<'loading' | 'none' | 'pending' | 'rejected'>('loading');
  const [currentRequest, setCurrentRequest] = useState<TrustedRequest | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      if (!user || user.role === 'Trusted' || user.role === 'Admin' || !token) {
        setRequestStatus('none');
        return;
      }

      try {
        const res = await fetch('http://localhost:3000/my-trusted-request', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.status) {
            setCurrentRequest(data);
            setRequestStatus(data.status);
          } else {
            setRequestStatus('none');
          }
        } else {
          setRequestStatus('none');
        }
      } catch (err) {
        console.error(err);
        setRequestStatus('none');
      }
    };

    fetchStatus();
  }, [user, token]);

  if (user?.role === "Trusted" || user?.role === "Admin") {
    return (
      <div className={styles.formContainer}>
        <div className={styles.statusContainer}>
          <h2 className={styles.statusTitle}>Already Verified</h2>
          <p className={styles.statusText}>You are already a trusted seller!</p>
          <Button onClick={() => navigate('/post-ad')} variant="primary">Post an Ad</Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('http://localhost:3000/request-trusted', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ pitch })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit application');
      }

      navigate('/', { replace: true });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const startNewApplication = () => {
    setCurrentRequest(null);
    setPitch("");
    setAgreed(false);
    setRequestStatus('none');
    setError(null);
  };

  if (requestStatus === 'loading') {
    return (
      <div className={styles.formContainer}>
        <div className="flex justify-center p-8">
          <Spinner size="md" />
        </div>
      </div>
    );
  }

  if (requestStatus === 'pending' && currentRequest) {
    return (
      <div className={styles.formContainer}>
        <div className={styles.statusContainer}>
          <div className={`${styles.iconWrapper} text-yellow-500`}>
            <svg className={styles.statusIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <h2 className={styles.statusTitle}>Application Pending</h2>
          <p className={styles.statusText}>
            Submitted on {new Date(currentRequest.created_at).toLocaleDateString()}.
          </p>
          <p className={styles.pitchPreview}>
            "{currentRequest.pitch.substring(0, 80)}{currentRequest.pitch.length > 80 ? '...' : ''}"
          </p>
          <Button onClick={() => navigate('/')} variant="secondary">Return Home</Button>
        </div>
      </div>
    );
  }

  if (requestStatus === 'rejected' && currentRequest) {
    return (
      <div className={styles.formContainer}>
        <div className={styles.statusContainer}>
          <div className={`${styles.iconWrapper} text-red-500`}>
            <svg className={styles.statusIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <h2 className={styles.statusTitle}>Application Rejected</h2>
          <p className={styles.statusText}>
            Your previous request was not approved. You can try applying again.
          </p>
          <Button onClick={startNewApplication} variant="primary">Try Again</Button>
        </div>
      </div>
    );
  }

  const karma = (user as any)?.karma ?? 0;
  const isKarmaGood = karma >= 50;

  return (
    <div className={styles.formContainer}>
      <h2 className={styles.formTitle}>Become a Trusted Seller</h2>

      <div className={styles.karmaBadge}>
        <span className={styles.karmaLabel}>Your Current Karma:</span>
        <span className={`${styles.karmaValue} ${isKarmaGood ? styles.karmaValueGood : styles.karmaValueLow}`}>
          {karma}
        </span>
      </div>
      {!isKarmaGood && (
        <p className={styles.karmaNote}>
          Note: Having a karma score above 50 significantly increases approval chances.
        </p>
      )}

      {error && (
        <AlertMessage type="error" message={error} onClose={() => setError(null)} />
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <FormField label="Why do you want to become a trusted seller?" htmlFor="pitch">
          <Textarea
            id="pitch"
            value={pitch}
            onChange={(e) => setPitch(e.target.value)}
            disabled={isLoading}
            rows={5}
            required
            placeholder="Describe your items and experience..."
          />
        </FormField>

        <div className={styles.agreementContainer}>
          <input
            id="agreement"
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className={styles.checkbox}
            disabled={isLoading}
          />
          <div>
            <label htmlFor="agreement" className={styles.agreementLabel}>
              Seller Agreement
            </label>
            <p className={styles.agreementText}>
              I agree to use the seller functionalities cautiously, describe my items accurately, and fulfill orders promptly. I understand that fraudulent activity will result in an immediate ban.
            </p>
          </div>
        </div>

        <div className={styles.buttonWrapper}>
          <Button 
            type="submit" 
            variant="primary" 
            disabled={!agreed || isLoading}
          >
            {isLoading ? <Spinner size="sm" /> : "Submit Application"}
          </Button>
        </div>
      </form>
    </div>
  );
};