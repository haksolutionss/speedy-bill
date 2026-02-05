 import { useOfflineSync } from '@/hooks/useOfflineSync';
 import { WifiOff, RefreshCw, Cloud } from 'lucide-react';
 import { cn } from '@/lib/utils';
 
 /**
  * Shows offline status and pending sync count
  */
 export function OfflineIndicator() {
   const { isOnline, isSyncing, pendingCount, syncPendingData } = useOfflineSync();
 
   // Only show when offline or has pending items
   if (isOnline && pendingCount === 0) {
     return null;
   }
 
   return (
     <div
       className={cn(
         "fixed top-2 right-2 z-50 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium shadow-lg transition-all",
         !isOnline
           ? "bg-destructive text-destructive-foreground"
           : pendingCount > 0
           ? "bg-warning text-warning-foreground"
           : "bg-success text-success-foreground"
       )}
     >
       {!isOnline ? (
         <>
           <WifiOff className="h-4 w-4" />
           <span>Offline</span>
           {pendingCount > 0 && (
             <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">
               {pendingCount} pending
             </span>
           )}
         </>
       ) : isSyncing ? (
         <>
           <RefreshCw className="h-4 w-4 animate-spin" />
           <span>Syncing...</span>
         </>
       ) : pendingCount > 0 ? (
         <>
           <Cloud className="h-4 w-4" />
           <span>{pendingCount} pending</span>
           <button
             onClick={syncPendingData}
             className="bg-white/20 px-2 py-0.5 rounded text-xs hover:bg-white/30"
           >
             Sync Now
           </button>
         </>
       ) : null}
     </div>
   );
 }