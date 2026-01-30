import { useEffect } from 'react';
import { usePosytudePrinter } from '@/hooks/usePosytudePrinter';
import { supabase } from '@/integrations/supabase/client';

export function PrintJobListener() {
    const printer = usePosytudePrinter();

    // Log component mount
    console.log('🎧 [PrintJobListener] Component state:', {
        isElectron: printer.isElectron,
        isConnected: printer.isConnected,
        printerStatus: printer.status,
        timestamp: new Date().toISOString()
    });

    useEffect(() => {
        console.log('🔌 [PrintJobListener] useEffect triggered');

        // Check if running in Electron
        if (!printer.isElectron) {
            console.warn('⚠️ [PrintJobListener] Not running in Electron app - print listener disabled');
            return;
        }

        console.log('✅ [PrintJobListener] Running in Electron - setting up realtime listener');

        // Create subscription channel
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
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    console.log('📥 [PrintJobListener] New print job received!');
                    console.log('📄 Raw payload:', JSON.stringify(payload, null, 2));

                    const job = payload.new as any;

                    console.log('📋 Job details:', {
                        id: job.id,
                        billId: job.bill_id,
                        jobType: job.job_type,
                        status: job.status,
                        requestedFrom: job.requested_from,
                        hasPayload: !!job.payload
                    });

                    // Check job status
                    if (job.status !== 'pending') {
                        console.log('⏭️ [PrintJobListener] Skipping job - status is not pending:', job.status);
                        return;
                    }

                    // Check printer connection
                    if (!printer.isConnected) {
                        console.error('❌ [PrintJobListener] Printer not connected!');
                        console.log('🔌 Printer status:', printer.status);
                        return;
                    }

                    console.log('🖨️ [PrintJobListener] Processing print job:', job.id);

                    try {
                        // Step 1: Mark as printing
                        console.log('📝 [PrintJobListener] Marking job as printing...');
                        const { error: updateError } = await supabase
                            .from('print_jobs')
                            .update({ status: 'printing' })
                            .eq('id', job.id);

                        if (updateError) {
                            console.error('❌ [PrintJobListener] Failed to update status to printing:', updateError);
                            throw updateError;
                        }

                        console.log('✅ [PrintJobListener] Job marked as printing');

                        // Step 2: Print the bill
                        console.log('🖨️ [PrintJobListener] Sending to printer...');
                        const result = await printer.printBill(job.payload);

                        console.log('📊 [PrintJobListener] Print result:', result);

                        if (!result.success) {
                            throw new Error(result.error || 'Print failed');
                        }

                        // Step 3: Mark as printed
                        console.log('📝 [PrintJobListener] Marking job as printed...');
                        const { error: printedError } = await supabase
                            .from('print_jobs')
                            .update({
                                status: 'printed',
                                printed_at: new Date().toISOString(),
                            })
                            .eq('id', job.id);

                        if (printedError) {
                            console.error('❌ [PrintJobListener] Failed to update status to printed:', printedError);
                            throw printedError;
                        }

                        console.log('✅ [PrintJobListener] Job completed successfully!');
                        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

                    } catch (err: any) {
                        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                        console.error('❌ [PrintJobListener] Print job failed!');
                        console.error('💥 Error:', err);
                        console.error('📄 Error message:', err.message);
                        console.error('📚 Error stack:', err.stack);

                        // Mark as failed
                        const { error: failedError } = await supabase
                            .from('print_jobs')
                            .update({
                                status: 'failed',
                                error_message: err.message ?? 'Print failed',
                            })
                            .eq('id', job.id);

                        if (failedError) {
                            console.error('❌ [PrintJobListener] Failed to update status to failed:', failedError);
                        }

                        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    }
                }
            )
            .subscribe((status) => {
                console.log('🔔 [PrintJobListener] Subscription status:', status);

                if (status === 'SUBSCRIBED') {
                    console.log('✅ [PrintJobListener] Successfully subscribed to print_jobs table');
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('❌ [PrintJobListener] Channel error - realtime subscription failed');
                } else if (status === 'TIMED_OUT') {
                    console.error('⏱️ [PrintJobListener] Subscription timed out');
                } else if (status === 'CLOSED') {
                    console.warn('🔌 [PrintJobListener] Channel closed');
                }
            });

        console.log('📡 [PrintJobListener] Subscription created, waiting for jobs...');

        // Cleanup function
        return () => {
            console.log('🧹 [PrintJobListener] Cleaning up - removing subscription channel');
            supabase.removeChannel(channel);
            console.log('✅ [PrintJobListener] Cleanup complete');
        };
    }, [printer.isElectron, printer.isConnected, printer.status]);

    return null;
}