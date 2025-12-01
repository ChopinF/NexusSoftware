import React from "react";
import { MainTemplate } from "../../templates/MainTemplate/MainTemplate";
import { BecomeSellerForm } from "../../organisms/BecomeSellerForm/BecomeSellerForm";

export const BecomeSellerPage: React.FC = () => {
  return (
    <MainTemplate>
      <div style={{ maxWidth: "700px", margin: "2rem auto" }}>
        <BecomeSellerForm />
      </div>
    </MainTemplate>
  );
};