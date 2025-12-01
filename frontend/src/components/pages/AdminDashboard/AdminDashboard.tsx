import React from 'react';
import { MainTemplate } from '../../templates/MainTemplate/MainTemplate';
import { AdminRequestList } from '../../organisms/AdminRequestList/AdminRequestList';

export const AdminDashboard: React.FC = () => {
  return (
    <MainTemplate>
      <div className="max-w-6xl mx-auto mt-8 px-4">
        <h1 className="text-3xl font-bold text-[#F9FAFB] mb-8">Admin Dashboard</h1>
        <AdminRequestList />
      </div>
    </MainTemplate>
  );
};