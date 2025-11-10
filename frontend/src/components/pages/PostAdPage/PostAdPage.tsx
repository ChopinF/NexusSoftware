// frontend/src/components/pages/PostAdPage/PostAdPage.tsx
import React from "react";
import { MainTemplate } from "../../templates/MainTemplate/MainTemplate";
import { PostAdForm } from "../../organisms/PostAdForm/PostAdForm";

export const PostAdPage: React.FC = () => {
  return (
    <MainTemplate>
      {/* Adaugă un container pentru a centra formularul */}
      <div style={{ maxWidth: "700px", margin: "2rem auto" }}>
        <PostAdForm />
      </div>
    </MainTemplate>
  );
};