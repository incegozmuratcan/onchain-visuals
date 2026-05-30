export type DatasetCategory =
  | "chains"
  | "protocols"
  | "capital-flows"
  | "markets";
export type DatasetStatus =
  | "active"
  | "source_config_required"
  | "source_error"
  | "stale"
  | "disabled"
  | "planned";
export type FreshnessStatus =
  | "fresh"
  | "stale"
  | "missing"
  | "source_error"
  | "manual_review_required"
  | "source_config_required";
export type ExportFormat = "1600x900" | "1200x1200" | "1080x1350";

export type HeadlineMetric = {
  label: string;
  periodLabel?: string;
  metricLabel?: string;
  value: number | string | null;
  formattedValue: string;
  change: number | null;
  changeLabel: string | null;
  trend: "up" | "down" | "flat" | "neutral" | null;
};
export type ChartSeries = {
  bars: any[];
  lines: any[];
  areas: any[];
  cards: any[];
  tables: any[];
  calendar: any[];
};
export type ChartSnapshot = {
  datasetId: string;
  datasetSlug: string;
  title: string;
  subtitle: string;
  date: string;
  period: string;
  category: DatasetCategory;
  status: DatasetStatus;
  freshness: {
    status: FreshnessStatus;
    lastUpdatedAt: string | null;
    source: string;
    fallbackUsed: boolean;
    missingConfig: string[];
    message: string | null;
  };
  headlineMetrics: HeadlineMetric[];
  series: ChartSeries;
  insights: string[];
  sourceLabel: string;
  sourceUrl: string | null;
  exportFormats: ExportFormat[];
  warnings: string[];
  metadata: Record<string, any>;
};
export type DatasetRegistryItem = {
  id: string;
  name: string;
  slug: string;
  category: DatasetCategory;
  description: string;
  frequency: string;
  sources: string[];
  primarySource: string;
  fallbackSources: string[];
  requiredEnv: string[];
  refreshPolicy: string;
  requiredFields: string[];
  derivedMetrics: string[];
  chartTemplates: string[];
  status: DatasetStatus;
  sourceLabel: string;
  notes?: string;
  defaultPeriod: string;
  supportedPeriods: string[];
};
export type SourceRunStatus =
  | "success"
  | "source_error"
  | "source_config_required"
  | "disabled"
  | "stale";
export type SourceRun = {
  id: string;
  source: string;
  datasetSlug: string;
  status: SourceRunStatus;
  startedAt: string;
  finishedAt: string;
  errorMessage: string | null;
  rowsFetched: number;
  payloadHash: string | null;
  metadata: Record<string, any>;
};
export type SourceResult<T> =
  | {
      ok: true;
      data: T;
      source: string;
      url: string;
      rowsFetched: number;
      warnings?: string[];
    }
  | {
      ok: false;
      source: string;
      url: string | null;
      status: "source_error" | "source_config_required" | "disabled";
      message: string;
      missingConfig?: string[];
      warnings?: string[];
    };
