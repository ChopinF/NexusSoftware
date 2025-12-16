import React from "react";
import { useUser } from "../contexts/UserContext";
import { Navigate, Outlet } from "react-router-dom";

export const ProtectedRoute: React.FC = () => {
  const { token } = useUser();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};