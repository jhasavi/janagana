export type ReportType = 'members' | 'events' | 'volunteers' | 'financial' | 'clubs';
export type ReportFormat = 'csv' | 'pdf';

export interface ReportFilterParams {
  status?: string;
  tierId?: string;
  eventId?: string;
  memberId?: string;
  opportunityId?: string;
  fromDate?: string;
  toDate?: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export interface ValidationError {
  row: number;
  message: string;
}

export type TemplateType = 'members' | 'events' | 'volunteers' | 'financial' | 'clubs';
