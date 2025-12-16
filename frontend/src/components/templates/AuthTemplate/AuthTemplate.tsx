import React, { useState } from "react";
import styles from "./AuthTemplate.module.css";
import { useNavigate } from "react-router-dom";

import { API_URL } from "../../../config";
import { LoginForm } from "../../organisms/LoginForm/LoginForm";
import { RegisterForm } from "../../organisms/RegisterForm/RegisterForm";
import { Logo } from "../../atoms/Logo/Logo";
import { useUser } from "../../../contexts/UserContext";

type AuthView = "login" | "register";

interface AuthTemplateProps {
  initialView?: AuthView;
}

export const AuthTemplate: React.FC<AuthTemplateProps> = ({
  initialView = "login",
}) => {
  const [view, setView] = useState<AuthView>(initialView);
  const { setUser, setToken } = useUser();
  const navigate = useNavigate();

  const handleLogin = async (
    email: string,
    password: string
  ): Promise<void> => {
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Invalid credentials");
      }

      const data = await res.json();
      console.log("Login success:", data);

      setUser(data.user);
      setToken(data.token);

      navigate("/", { replace: true });
    } catch (err: any) {
      alert(err.message || "Login failed");
    }
  };

  const handleRegister = async (
    name: string,
    email: string,
    password: string,
    role: string,
    country: string,
    city: string
  ): Promise<void> => {
    try {
      const res = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password, role, country, city }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Registration failed");
      }

      const data = await res.json();
      console.log("Registration success:", data);

      setUser(data.user);
      setToken(data.token);

      setView("login");
    } catch (err: any) {
      alert(err.message || "Registration failed");
    }
  };

  const handleSignOut = async (): Promise<void> => {
    setUser(null);
    setToken(null);
    navigate("/login", { replace: true });
  };

  return (
    <div className={styles.authTemplate}>
      <div className={styles.contentWrapper}>
        <div className={styles.logoContainer}>
          <a href="/" aria-label="Home">
            <Logo />
          </a>
        </div>

        {view === "login" ? (
          <LoginForm
            onSubmit={handleLogin}
            onRegisterClick={() => setView("register")}
          />
        ) : (
          <RegisterForm
            onSubmit={handleRegister}
            onLoginClick={() => setView("login")}
          />
        )}
      </div>
    </div>
  );
};
