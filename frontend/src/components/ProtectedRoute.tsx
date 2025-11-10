// frontend/src/components/ProtectedRoute.tsx
import React from "react";
import { useUser } from "../contexts/UserContext";
import { Navigate, Outlet } from "react-router-dom";

export const ProtectedRoute: React.FC = () => {
  const { token } = useUser();

  if (!token) {
    // Dacă nu e logat, redirecționează la /login
    return <Navigate to="/login" replace />;
  }

  // Dacă e logat, afișează componenta copil (ex: PostAdPage)
  return <Outlet />;
};