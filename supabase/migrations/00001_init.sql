-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- founders_episodes table
CREATE TABLE IF NOT EXISTS founders_episodes (
  id          BIGSERIAL PRIMARY KEY,
  episode_number INTEGER,
  title       TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  url         TEXT NOT NULL,
  date        TEXT,
  category    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Chunks table
CREATE TABLE IF NOT EXISTS chunks (
  id               BIGSERIAL PRIMARY KEY,
  episode_id       BIGINT NOT NULL REFERENCES founders_episodes(id) ON DELETE CASCADE,
  chunk_index      INTEGER NOT NULL,
  start_timestamp  TEXT NOT NULL,
  end_timestamp    TEXT NOT NULL,
  text             TEXT NOT NULL,
  embedding        VECTOR(1536),
  fts              TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', text)) STORED,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (episode_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS chunks_episode_id_idx  ON chunks(episode_id);
CREATE INDEX IF NOT EXISTS chunks_embedding_idx   ON chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS chunks_fts_idx         ON chunks USING gin(fts);

-- Hybrid search via Reciprocal Rank Fusion (RRF)
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
    FROM chunks c
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
    FROM chunks c
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
  JOIN chunks c ON c.id = rrf.id
  JOIN founders_episodes e ON e.id = c.episode_id
  ORDER BY rrf.score DESC
  LIMIT match_count;
$$;
