import { Skeleton } from '@/components/ui/skeleton';

interface LoadingTableProps {
  columns: number;
}

export function LoadingTable({ columns }: LoadingTableProps) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
