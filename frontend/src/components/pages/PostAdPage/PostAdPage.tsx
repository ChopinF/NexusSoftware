import React from "react";
import { MainTemplate } from "../../templates/MainTemplate/MainTemplate";
import { PostAdForm } from "../../organisms/PostAdForm/PostAdForm";

export const PostAdPage: React.FC = () => {
  return (
    <MainTemplate>
      <div style={{ maxWidth: "700px", margin: "2rem auto" }}>
        <PostAdForm />
      </div>
    </MainTemplate>
  );
};