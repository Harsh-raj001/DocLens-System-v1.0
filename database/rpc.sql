-- Function to perform similarity search on chunks using pgvector
create or replace function match_chunks (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  doc_id uuid
)
returns table (
  id uuid,
  document_id uuid,
  page_number integer,
  chunk_text text,
  similarity float
)
language sql stable
as $$
  select
    chunks.id,
    chunks.document_id,
    chunks.page_number,
    chunks.chunk_text,
    1 - (chunks.embedding <=> query_embedding) as similarity
  from public.chunks
  where chunks.document_id = doc_id
    and 1 - (chunks.embedding <=> query_embedding) > match_threshold
  order by chunks.embedding <=> query_embedding
  limit match_count;
$$;
