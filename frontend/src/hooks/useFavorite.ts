import { useState, useCallback } from "react";
import { API_URL } from "../config";

export const useFavorite = () => {
  const [loading, setLoading] = useState(false);

  const toggleFavoriteApi = useCallback(async (productId: string, isNowFavorite: boolean): Promise<boolean> => {
    const token = localStorage.getItem("token");
    
    if (!token) {
      console.error("No token found");
      return false;
    }

    setLoading(true);
    try {
      const method = isNowFavorite ? "POST" : "DELETE";
      
      const res = await fetch(`${API_URL}/product/${productId}/favorite`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to toggle favorite: ${res.statusText}`);
      }
      
      return true; 
    } catch (error) {
      console.error(error);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { toggleFavoriteApi, loading };
};