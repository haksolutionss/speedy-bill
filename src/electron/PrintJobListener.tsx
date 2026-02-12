import { useEffect, useRef } from 'react';
import { usePosytudePrinter } from '@/hooks/usePosytudePrinter';
import { supabase } from '@/integrations/supabase/client';

export function PrintJobListener() {
    const printer = usePosytudePrinter();
    const processingRef = useRef(new Set<string>());

    // Process existing pending jobs on mount
    useEffect(() => {
        if (!printer.isElectron || !printer.isConnected) return;

        const processPendingJobs = async () => {
            const { data, error } = await supabase
                .from('print_jobs')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: true });


            if (error) {
                console.error('Query error:', error);
                return;
            }

            for (const job of data || []) {
                if (processingRef.current.has(job.id)) continue;
                processingRef.current.add(job.id);
                await processJob(job);
                processingRef.current.delete(job.id);
            }
        };

        processPendingJobs();
    }, [printer.isElectron, printer.isConnected]);

    const processJob = async (job: any) => {

        if (!printer.isConnected) {
            await supabase
                .from('print_jobs')
                .update({ status: 'failed', error_message: 'Printer not connected' })
                .eq('id', job.id);
            return;
        }

        try {

            const payload =
                typeof job.payload === 'string'
                    ? JSON.parse(job.payload)
                    : job.payload;

            let result;

            if (job.job_type === 'kot') {
                result = await printer.printKOT(payload);
            } else {
                result = await printer.printBill(payload);
            }

            if (!result?.success) {
                throw new Error(result?.error || 'Print failed');
            }

            await supabase
                .from('print_jobs')
                .update({ status: 'printed', printed_at: new Date().toISOString() })
                .eq('id', job.id);


        } catch (err: any) {
            console.error('❌ Job failed:', err.message);
            await supabase
                .from('print_jobs')
                .update({ status: 'failed', error_message: err.message })
                .eq('id', job.id);
        }
    };

    // Realtime subscription
    useEffect(() => {
        if (!printer.isElectron) return;

        const channel = supabase
            .channel('print-jobs-realtime')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'print_jobs',
            }, async (payload) => {
                const job = payload.new as any;
                console.log("job", job)
                if (job.status !== 'pending' || processingRef.current.has(job.id)) return;

                processingRef.current.add(job.id);
                await processJob(job);
                processingRef.current.delete(job.id);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [printer]);

    return null;
}