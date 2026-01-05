import React from "react";
import { MainTemplate } from "../../templates/MainTemplate/MainTemplate";
import { OrderProductForm } from "../../organisms/OrderProductForm/OrderProducForm";

export const OrderProductPage: React.FC = () => {
return (
    <MainTemplate>
        <div style={{ maxWidth: "700px", margin: "2rem auto" }}>
            <OrderProductForm/>
        </div>
    </MainTemplate>
    );
};