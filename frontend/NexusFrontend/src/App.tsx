import "./App.css";
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "./components/pages/LoginPage/LoginPage";
import { RegisterPage } from "./components/pages/RegisterPage/RegisterPage";
import { HomePage } from "./components/pages/HomePage/HomePage";
import { UserProvider } from "./contexts/UserContext";

const App: React.FC = () => {
  return (
    <UserProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </UserProvider>
  );
};

export default App;
