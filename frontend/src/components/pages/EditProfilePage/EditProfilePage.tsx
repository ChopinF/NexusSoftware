import React from "react";
import { MainTemplate } from "../../templates/MainTemplate/MainTemplate";
import { EditProfileForm } from "../../organisms/EditProfileForm/EditProfileForm";

export const EditProfilePage: React.FC = () => {
return (
    <MainTemplate>
        <div style={{ maxWidth: "700px", margin: "2rem auto" }}>
            <EditProfileForm/>
        </div>
    </MainTemplate>
    );
};