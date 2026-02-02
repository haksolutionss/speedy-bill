import { cn } from '@/lib/utils';
import type { ReportType } from '../types';

interface ReportTypeSelectorProps {
  reportTypes: ReportType[];
  activeReport: string;
  onSelectReport: (id: string) => void;
}

export function ReportTypeSelector({ reportTypes, activeReport, onSelectReport }: ReportTypeSelectorProps) {
  return (
    <>
      {/* Desktop Grid */}
      <div className="hidden lg:grid lg:grid-cols-5 gap-3">
        {reportTypes.map((report) => (
          <button
            key={report.id}
            onClick={() => onSelectReport(report.id)}
            className={cn(
              "p-4 rounded-lg border text-left transition-all hover:shadow-md",
              activeReport === report.id
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "bg-card hover:border-primary/50"
            )}
          >
            <report.icon className={cn(
              "h-5 w-5 mb-2",
              activeReport === report.id ? "text-primary" : "text-muted-foreground"
            )} />
            <p className="font-medium text-sm">{report.label}</p>
            <p className="text-xs text-muted-foreground">{report.description}</p>
          </button>
        ))}
      </div>

      {/* Mobile/Tablet Scrollable */}
      <div className="lg:hidden -mx-4 md:mx-0">
        <div className="overflow-x-auto scrollbar-hide px-4 md:px-0">
          <div className="flex gap-2 pb-2 min-w-max">
            {reportTypes.map((report) => (
              <button
                key={report.id}
                onClick={() => onSelectReport(report.id)}
                className={cn(
                  "flex-shrink-0 px-4 py-3 rounded-lg border text-left transition-all",
                  activeReport === report.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "bg-card hover:border-primary/50"
                )}
              >
                <div className="flex items-center gap-2">
                  <report.icon className={cn(
                    "h-4 w-4",
                    activeReport === report.id ? "text-primary" : "text-muted-foreground"
                  )} />
                  <p className="font-medium text-sm whitespace-nowrap">{report.shortLabel}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
