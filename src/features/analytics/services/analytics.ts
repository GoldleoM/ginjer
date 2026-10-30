import { demoDashboards } from '../data/demoAnalytics';
import type { AnalyticsRepository } from '../types';

// Replace this read-only adapter with backend requests when endpoints are ready.
// Return copies so UI state cannot mutate the shared fixtures.
export const demoAnalyticsRepository: AnalyticsRepository = {
  async listDashboards() {
    return demoDashboards.map(({ id, name }) => ({ id, name }));
  },
  async loadDashboard(id) {
    const dashboard = demoDashboards.find(item => item.id === id);
    if (!dashboard) throw new Error('This dashboard is unavailable.');
    return { ...dashboard, metrics: dashboard.metrics.map(metric => ({ ...metric })) };
  },
};
