import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MainTemplate } from "../../templates/MainTemplate/MainTemplate";
import { Button } from "../../atoms/Button/Button";
import { MapPin, Mail, Award, Settings } from "lucide-react";
import styles from "./ProfilePage.module.css";
import { API_URL } from "../../../config";
import { useUser } from "../../../contexts/UserContext";
import { Avatar } from "../../atoms/Avatar/Avatar";

export const ProfilePage: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  if (!user) return null;

  const avatarSrc = user.avatarImage 
    ? user.avatarImage 
    : user.avatarUrl 
      ? `${API_URL}${user.avatarUrl}` 
      : undefined;

  const getInitials = (name?: string) => {
    if (!name) return "??";
    const names = name.split(" ");
    const first = names[0]?.[0] || "";
    const last = names[names.length - 1]?.[0] || "";
    return `${first}${last}`.toUpperCase();
  };

  const handleEditProfile = () => {
    navigate("/my-profile/edit"); 
  };

  return (
    <MainTemplate>
      <div className={styles.container}>
        <div className={styles.profileCard}>
            
          <div className={styles.header}>
            <div className={styles.avatarWrapper}>
              <Avatar 
                src={avatarSrc} 
                initials={getInitials(user.name || "")} 
                size="lg"
                className={styles.profileAvatar}
              />
            </div>
            <h1 className={styles.userName}>{user.name}</h1>
            <span className={styles.userRole}>{user.role}</span>
          </div>

          <div className={styles.divider} />

          <div className={styles.details}>
            
            <div className={styles.detailRow}>
              <div className={styles.iconBox}><Mail size={20} /></div>
              <div className={styles.info}>
                <span className={styles.label}>Email</span>
                <span className={styles.value}>{user.email}</span>
              </div>
            </div>

            <div className={styles.detailRow}>
              <div className={styles.iconBox}><MapPin size={20} /></div>
              <div className={styles.info}>
                <span className={styles.label}>Location</span>
                <span className={styles.value}>
                  {user.city && user.country 
                    ? `${user.city}, ${user.country}` 
                    : "Not specified"}
                </span>
              </div>
            </div>

            <div className={styles.detailRow}>
              <div className={styles.iconBox}><Award size={20} /></div>
              <div className={styles.info}>
                <span className={styles.label}>Karma</span>
                <span className={styles.value}>{user.karma || 0} Points</span>
              </div>
            </div>

          </div>

          <div className={styles.actions}>
            <Button 
                variant="primary" 
                onClick={handleEditProfile}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}
            >
               <Settings size={18} /> Edit Profile
            </Button>
          </div>

        </div>
      </div>
    </MainTemplate>
  );
};