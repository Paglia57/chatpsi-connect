-- Fix critical security issue: Add RLS policies for userinativos table
-- This table contains sensitive customer data (WhatsApp numbers and names) but has no access control

-- Create restrictive RLS policies for the userinativos table
-- Only allow service role access for maximum security since this contains sensitive customer data

CREATE POLICY "Service role only can view userinativos" 
ON public.userinativos 
FOR SELECT 
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

CREATE POLICY "Service role only can insert userinativos" 
ON public.userinativos 
FOR INSERT 
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

CREATE POLICY "Service role only can update userinativos" 
ON public.userinativos 
FOR UPDATE 
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

CREATE POLICY "Service role only can delete userinativos" 
ON public.userinativos 
FOR DELETE 
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Add comment for documentation
COMMENT ON TABLE public.userinativos IS 'Contains sensitive customer data - access restricted to service role only for security';