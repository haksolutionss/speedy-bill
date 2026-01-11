import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export interface QueryErrorHandlerProps {
  error: unknown;
  refetch?: () => void;
  onRetry?: () => void;
  title?: string;
  className?: string;
}

export function QueryErrorHandler({ 
  error, 
  refetch,
  onRetry, 
  title = 'Error loading data',
  className = ''
}: QueryErrorHandlerProps) {
  const handleRetry = refetch || onRetry;
  const errorMessage = error instanceof Error 
    ? error.message 
    : typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : 'An unexpected error occurred';
  
  const isNetworkError = errorMessage.toLowerCase().includes('network') || 
                          errorMessage.toLowerCase().includes('fetch');

  return (
    <Alert variant="destructive" className={className}>
      {isNetworkError ? (
        <WifiOff className="h-4 w-4" />
      ) : (
        <AlertCircle className="h-4 w-4" />
      )}
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        <span>{errorMessage}</span>
        {handleRetry && (
          <Button 
            onClick={handleRetry} 
            variant="outline" 
            size="sm" 
            className="w-fit"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
