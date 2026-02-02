export type DateRange = { from: Date; to: Date };

export interface ReportType {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  description: string;
}

export const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#ca8a04', '#9333ea', '#0891b2'];
