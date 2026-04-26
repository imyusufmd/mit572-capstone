import apiClient from './client';
import type { LoginRequest, LoginResponse, DashboardSummaryDto } from '../types';

// Auth
export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<LoginResponse>('/auth/login', data),
  status: () =>
    apiClient.get<{ ldapAvailable: boolean }>('/auth/status'),
};

// Dashboard
export const dashboardApi = {
  summary: () =>
    apiClient.get<DashboardSummaryDto>('/dashboard/summary'),
};
