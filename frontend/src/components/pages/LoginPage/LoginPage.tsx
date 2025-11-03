import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthTemplate } from "../../templates/AuthTemplate/AuthTemplate";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("http://localhost:3000/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        console.log(res);
        if (res.ok) navigate("/", { replace: true });
        else localStorage.removeItem("token");
      })
      .catch(() => localStorage.removeItem("token"));
  }, [navigate]);

  return <AuthTemplate initialView="login" />;
};
