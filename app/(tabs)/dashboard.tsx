import React from 'react';
import { View } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import CoachDashboard from '@/components/dashboard/CoachDashboard';

export default function DashboardScreen() {
  const { user } = useAuthStore();

  // Render appropriate dashboard based on user role
  if (user?.is_admin) {
    return <AdminDashboard />;
  }

  return <CoachDashboard />;
}