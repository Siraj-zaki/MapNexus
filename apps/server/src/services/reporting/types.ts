/**
 * Report Builder TypeScript Types
 */

// ============================================================================
// WIDGET TYPES
// ============================================================================

export type WidgetType = 'CHART' | 'MAP' | 'TABLE' | 'KPI_CARD' | 'TEXT' | 'IMAGE';
export type ChartType = 'LINE' | 'BAR' | 'PIE' | 'AREA' | 'SCATTER' | 'DONUT';
export type PaperSize = 'A4' | 'Letter' | 'Legal';
export type Orientation = 'portrait' | 'landscape';
export type AggregationFn = 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';
export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'between'
  | 'in'
  | 'isNull';
export type TimeInterval = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
export type ReportFormat = 'PDF' | 'EXCEL' | 'HTML';
export type ReportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

// ============================================================================
// GRID LAYOUT
// ============================================================================

export interface GridPosition {
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

export interface ResponsiveLayout {
  lg?: GridPosition[];
  md?: GridPosition[];
  sm?: GridPosition[];
}

// ============================================================================
// QUERY CONFIG
// ============================================================================

export interface QueryFilter {
  field: string;
  operator: FilterOperator;
  value: any;
}

export interface Aggregation {
  function: AggregationFn;
  field: string;
  alias?: string;
}

export interface TimeGrouping {
  field: string;
  interval: TimeInterval;
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export interface QueryConfig {
  filters?: QueryFilter[];
  geofence?: GeoJSON.Polygon;
  aggregations?: Aggregation[];
  timeGroup?: TimeGrouping;
  groupBy?: string[];
  columns?: string[];
  orderBy?: SortConfig[];
  limit?: number;
  offset?: number;
}

// ============================================================================
// WIDGET CONFIGS
// ============================================================================

export interface ChartConfig {
  chartType: ChartType;
  xAxis: {
    field: string;
    interval?: TimeInterval;
    label?: string;
  };
  yAxis: Aggregation[];
  groupBy?: string;
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  stacked?: boolean;
}

export interface MapConfig {
  geometryField: string;
  labelField?: string;
  colorField?: string;
  markerStyle?: {
    size?: number;
    color?: string;
    icon?: string;
  };
  center?: [number, number];
  zoom?: number;
  showLabels?: boolean;
  heatmap?: boolean;
}

export interface TableConfig {
  columns: {
    field: string;
    header: string;
    width?: number;
    format?: string;
    align?: 'left' | 'center' | 'right';
  }[];
  pageSize?: number;
  showTotals?: boolean;
  groupBy?: string;
  alternateRowColors?: boolean;
}

export interface KpiConfig {
  aggregation: Aggregation;
  format?: string;
  prefix?: string;
  suffix?: string;
  icon?: string;
  color?: string;
  comparison?: {
    type: 'previous_period' | 'target' | 'previous_value';
    value?: number;
    label?: string;
  };
}

export interface WidgetStyle {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  padding?: number;
  fontFamily?: string;
  fontSize?: number;
  textColor?: string;
  titleColor?: string;
  shadow?: boolean;
}

// ============================================================================
// MAIN ENTITIES
// ============================================================================

export interface ReportWidget {
  id: string;
  templateId: string;
  type: WidgetType;
  title?: string;
  dataSource?: string;
  queryConfig?: QueryConfig;
  chartConfig?: ChartConfig;
  mapConfig?: MapConfig;
  tableConfig?: TableConfig;
  kpiConfig?: KpiConfig;
  textContent?: string;
  imageUrl?: string;
  gridPosition: GridPosition;
  style?: WidgetStyle;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  layout: ResponsiveLayout;
  paperSize: PaperSize;
  orientation: Orientation;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  widgets: ReportWidget[];
}

export interface ReportSchedule {
  id: string;
  templateId: string;
  name?: string;
  cronExpression: string;
  timezone: string;
  recipients: string[];
  format: ReportFormat;
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
}

export interface GeneratedReport {
  id: string;
  templateId: string;
  fileName: string;
  fileUrl: string;
  format: ReportFormat;
  fileSize?: number;
  status: ReportStatus;
  error?: string;
  parameters?: Record<string, any>;
  generatedBy?: string;
  generatedAt: Date;
  expiresAt?: Date;
}

// ============================================================================
// API PAYLOADS
// ============================================================================

export interface CreateReportTemplateRequest {
  name: string;
  description?: string;
  paperSize?: PaperSize;
  orientation?: Orientation;
}

export interface UpdateReportTemplateRequest {
  name?: string;
  description?: string;
  layout?: ResponsiveLayout;
  paperSize?: PaperSize;
  orientation?: Orientation;
}

export interface CreateWidgetRequest {
  type: WidgetType;
  title?: string;
  dataSource?: string;
  queryConfig?: QueryConfig;
  chartConfig?: ChartConfig;
  mapConfig?: MapConfig;
  tableConfig?: TableConfig;
  kpiConfig?: KpiConfig;
  textContent?: string;
  imageUrl?: string;
  gridPosition: GridPosition;
  style?: WidgetStyle;
}

export interface GenerateReportRequest {
  format: ReportFormat;
  parameters?: Record<string, any>;
}

export interface CreateScheduleRequest {
  name?: string;
  cronExpression: string;
  timezone?: string;
  recipients: string[];
  format?: ReportFormat;
}
