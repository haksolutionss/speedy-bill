import { useEffect } from 'react';
import { usePosytudePrinter } from '@/hooks/usePosytudePrinter';
import { supabase } from '@/integrations/supabase/client';

export function PrintJobListener() {
    const printer = usePosytudePrinter();

    useEffect(() => {
        if (!printer.isElectron) return;

        const channel = supabase
            .channel('print-jobs-channel')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'print_jobs',
                },
                async (payload) => {
                    const job = payload.new;

                    if (job.status !== 'pending' || job.job_type !== 'bill') return;
                    if (!printer.isConnected) return;

                    try {
                        // mark printing
                        await supabase
                            .from('print_jobs')
                            .update({ status: 'printing' })
                            .eq('id', job.id);

                        const result = await printer.printBill(job.payload);

                        if (!result.success) throw new Error(result.error);

                        await supabase
                            .from('print_jobs')
                            .update({
                                status: 'printed',
                                printed_at: new Date().toISOString(),
                            })
                            .eq('id', job.id);

                    } catch (err: any) {
                        await supabase
                            .from('print_jobs')
                            .update({
                                status: 'failed',
                                error_message: err.message ?? 'Print failed',
                            })
                            .eq('id', job.id);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [printer]);

    return null;
}
