import "./App.css";
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "./components/pages/LoginPage/LoginPage";
import { RegisterPage } from "./components/pages/RegisterPage/RegisterPage";
import { HomePage } from "./components/pages/HomePage/HomePage";
import { UserProvider } from "./contexts/UserContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PostAdPage } from "./components/pages/PostAdPage/PostAdPage";
import { CategoryProvider } from "./contexts/CategoryContext";
import ProductPage from "./components/pages/ProductPage/ProductPage.tsx";
import { BecomeSellerPage } from "./components/pages/BecomeSellerPage/BecomeSellerPage";
import { AdminDashboard } from "./components/pages/AdminDashboard/AdminDashboard";


const App: React.FC = () => {
  return (
    <UserProvider>
      <CategoryProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
          <Route path="/product/:id" element={<ProductPage/>}/>

        <Route element={<ProtectedRoute />}>
          <Route path="/post-ad" element={<PostAdPage />} />
          <Route path="/become-seller" element={<BecomeSellerPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      </CategoryProvider>
    </UserProvider>
  );
};

export default App;
