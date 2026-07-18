-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Create the documents table
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  uploaded_at timestamp with time zone default timezone('utc'::text, now()) not null,
  status text not null default 'processing',
  summary text,
  topics jsonb
);

-- Create the chunks table
create table if not exists public.chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.documents(id) on delete cascade not null,
  page_number integer not null,
  chunk_text text not null,
  embedding vector(768) -- Gemini embeddings are usually 768 dimensions
);

-- Optional: Create an index for faster similarity search
create index on public.chunks using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- Enable Row Level Security (RLS) but allow the service role (backend) to bypass it
alter table public.documents enable row level security;
alter table public.chunks enable row level security;

-- Create policies to allow public read access for the MVP (since we don't have auth yet)
create policy "Allow public read access on documents"
  on public.documents for select
  using (true);

create policy "Allow public read access on chunks"
  on public.chunks for select
  using (true);
