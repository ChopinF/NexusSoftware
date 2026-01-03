import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { API_URL } from "../config";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  country?: string;
  city?: string;
  karma?: number;
  avatarUrl?: string;   
  avatarImage?: string;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  token: string | null;
  setToken: (token: string | null) => void;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within UserProvider");
  return context;
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("user");
    try {
        return saved ? JSON.parse(saved) : null;
    } catch {
        return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));

  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, [user]);

  useEffect(() => {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  }, [token]);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        
        // --- MODIFICAREA ESTE AICI ---
        // Backend-ul trimite { user: {...} }, deci trebuie să verificăm dacă există proprietatea 'user'
        const actualUser = data.user ? data.user : data;
        
        console.log("User data loaded:", actualUser); // Debugging
        setUser(actualUser);
      } else {
        if (res.status === 401) {
            setToken(null);
            setUser(null);
        }
      }
    } catch (error) {
      console.error("Error refreshing user:", error);
    }
  }, [token]);

  useEffect(() => {
    if (token) refreshUser();
  }, [token, refreshUser]);

  return (
    <UserContext.Provider value={{ user, setUser, token, setToken, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
};