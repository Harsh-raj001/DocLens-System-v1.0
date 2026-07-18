-- Add summary and topics columns to the documents table
alter table public.documents 
add column if not exists summary text,
add column if not exists topics jsonb;
