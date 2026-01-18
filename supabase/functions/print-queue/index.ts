import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PrintJobPayload {
  job_type: 'kot' | 'bill' | 'test';
  printer_role?: string;
  payload: Record<string, unknown>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    // POST /print-queue/submit - Submit a new print job
    if (req.method === 'POST' && path === 'submit') {
      const body: PrintJobPayload = await req.json();
      
      const { data, error } = await supabase
        .from('print_jobs')
        .insert({
          job_type: body.job_type,
          printer_role: body.printer_role || 'counter',
          payload: body.payload,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating print job:', error);
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Print job created:', data.id);
      return new Response(
        JSON.stringify({ success: true, job_id: data.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /print-queue/pending - Get pending jobs (for Local Print Agent)
    if (req.method === 'GET' && path === 'pending') {
      const agentId = url.searchParams.get('agent_id') || 'default';
      const limit = parseInt(url.searchParams.get('limit') || '10');

      // Get pending jobs and mark as processing
      const { data: jobs, error } = await supabase
        .from('print_jobs')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Error fetching pending jobs:', error);
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Mark fetched jobs as processing
      if (jobs && jobs.length > 0) {
        const jobIds = jobs.map(j => j.id);
        await supabase
          .from('print_jobs')
          .update({ status: 'processing', agent_id: agentId })
          .in('id', jobIds);
      }

      return new Response(
        JSON.stringify({ success: true, jobs: jobs || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /print-queue/complete - Mark job as completed
    if (req.method === 'POST' && path === 'complete') {
      const { job_id, success, error_message } = await req.json();

      const { error } = await supabase
        .from('print_jobs')
        .update({
          status: success ? 'completed' : 'failed',
          error_message: error_message || null,
          processed_at: new Date().toISOString(),
        })
        .eq('id', job_id);

      if (error) {
        console.error('Error updating job:', error);
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /print-queue/status - Get job status
    if (req.method === 'GET' && path === 'status') {
      const jobId = url.searchParams.get('job_id');
      
      if (!jobId) {
        return new Response(
          JSON.stringify({ success: false, error: 'job_id required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('print_jobs')
        .select('id, status, error_message, created_at, processed_at')
        .eq('id', jobId)
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, job: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Print queue error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
