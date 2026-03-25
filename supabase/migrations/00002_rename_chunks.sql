-- Rename chunks table to founders_ep_chunks
ALTER TABLE chunks RENAME TO founders_ep_chunks;

-- Rename indexes to match new table name
ALTER INDEX chunks_episode_id_idx  RENAME TO founders_ep_chunks_episode_id_idx;
ALTER INDEX chunks_embedding_idx   RENAME TO founders_ep_chunks_embedding_idx;
ALTER INDEX chunks_fts_idx         RENAME TO founders_ep_chunks_fts_idx;

-- Update hybrid_search to reference founders_ep_chunks
CREATE OR REPLACE FUNCTION hybrid_search(
  query_text      TEXT,
  query_embedding VECTOR(1536),
  match_count     INTEGER DEFAULT 20,
  rrf_k           INTEGER DEFAULT 60
)
RETURNS TABLE (
  chunk_id        BIGINT,
  episode_id      BIGINT,
  episode_number  INTEGER,
  title           TEXT,
  slug            TEXT,
  url             TEXT,
  date            TEXT,
  start_timestamp TEXT,
  end_timestamp   TEXT,
  text            TEXT,
  rrf_score       DOUBLE PRECISION
)
LANGUAGE SQL
AS $$
  WITH semantic AS (
    SELECT
      c.id,
      ROW_NUMBER() OVER (ORDER BY c.embedding <=> query_embedding) AS rank
    FROM founders_ep_chunks c
    WHERE c.embedding IS NOT NULL
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  keyword AS (
    SELECT
      c.id,
      ROW_NUMBER() OVER (
        ORDER BY ts_rank_cd(c.fts, websearch_to_tsquery('english', query_text)) DESC
      ) AS rank
    FROM founders_ep_chunks c
    WHERE c.fts @@ websearch_to_tsquery('english', query_text)
    ORDER BY ts_rank_cd(c.fts, websearch_to_tsquery('english', query_text)) DESC
    LIMIT match_count * 2
  ),
  rrf AS (
    SELECT
      COALESCE(s.id, k.id) AS id,
      COALESCE(1.0 / (rrf_k + s.rank), 0.0) +
      COALESCE(1.0 / (rrf_k + k.rank), 0.0) AS score
    FROM semantic s
    FULL OUTER JOIN keyword k ON s.id = k.id
  )
  SELECT
    c.id            AS chunk_id,
    c.episode_id,
    e.episode_number,
    e.title,
    e.slug,
    e.url,
    e.date,
    c.start_timestamp,
    c.end_timestamp,
    c.text,
    rrf.score       AS rrf_score
  FROM rrf
  JOIN founders_ep_chunks c ON c.id = rrf.id
  JOIN founders_episodes e ON e.id = c.episode_id
  ORDER BY rrf.score DESC
  LIMIT match_count;
$$;
