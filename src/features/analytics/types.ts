export interface DashboardOption { id: string; name: string; }
interface MetricBase {
  id: string;
  title: string;
  deviceId: string;
  recordedAt: string;
  description: string;
}
export interface GaugeMetric extends MetricBase {
  kind: 'gauge';
  value: number;
  minimum: number;
  maximum: number;
}
export interface StatusMetric extends MetricBase {
  kind: 'status';
  value: string;
}
export type AnalyticsMetric = GaugeMetric | StatusMetric;
export interface AnalyticsDashboard extends DashboardOption { metrics: AnalyticsMetric[]; }
export interface AnalyticsRepository {
  listDashboards(): Promise<DashboardOption[]>;
  loadDashboard(id: string): Promise<AnalyticsDashboard>;
}
