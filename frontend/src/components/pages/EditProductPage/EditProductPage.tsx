import React from "react";
import { MainTemplate } from "../../templates/MainTemplate/MainTemplate";
import { EditProductForm } from "../../organisms/EditProductForm/EditProductForm";

export const EditProductPage: React.FC = () => {
return (
    <MainTemplate>
        <div style={{ maxWidth: "700px", margin: "2rem auto" }}>
            <EditProductForm/>
        </div>
    </MainTemplate>
    );
};