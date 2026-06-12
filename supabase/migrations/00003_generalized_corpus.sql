CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS sources (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  kind        TEXT NOT NULL DEFAULT 'podcast',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS episodes (
  id              BIGSERIAL PRIMARY KEY,
  source_id       BIGINT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  legacy_episode_id BIGINT,
  episode_number  INTEGER,
  title           TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  url             TEXT NOT NULL,
  published_date  TEXT,
  category        TEXT,
  topic           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS episodes_source_id_idx ON episodes(source_id);
CREATE INDEX IF NOT EXISTS episodes_topic_idx ON episodes(topic);
CREATE INDEX IF NOT EXISTS episodes_episode_number_idx ON episodes(episode_number);

CREATE TABLE IF NOT EXISTS chunks (
  id               BIGSERIAL PRIMARY KEY,
  episode_id       BIGINT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  chunk_index      INTEGER NOT NULL,
  start_timestamp  TEXT NOT NULL,
  end_timestamp    TEXT NOT NULL,
  text             TEXT NOT NULL,
  embedding        VECTOR(1536),
  fts              TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', text)) STORED,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (episode_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS chunks_episode_id_idx ON chunks(episode_id);
CREATE INDEX IF NOT EXISTS chunks_embedding_idx ON chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS chunks_fts_idx ON chunks USING gin(fts);

CREATE TABLE IF NOT EXISTS entities (
  id              BIGSERIAL PRIMARY KEY,
  type            TEXT NOT NULL CHECK (type IN ('brand', 'person', 'org', 'other')),
  canonical_name  TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS entity_aliases (
  id          BIGSERIAL PRIMARY KEY,
  entity_id   BIGINT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  alias       TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (alias)
);

CREATE INDEX IF NOT EXISTS entity_aliases_entity_id_idx ON entity_aliases(entity_id);

CREATE TABLE IF NOT EXISTS episode_entities (
  episode_id   BIGINT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  entity_id    BIGINT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  relevance    DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (episode_id, entity_id)
);

CREATE INDEX IF NOT EXISTS episode_entities_entity_id_idx ON episode_entities(entity_id);

CREATE TABLE IF NOT EXISTS chunk_entities (
  chunk_id     BIGINT NOT NULL REFERENCES chunks(id) ON DELETE CASCADE,
  entity_id    BIGINT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  relevance    DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (chunk_id, entity_id)
);

CREATE INDEX IF NOT EXISTS chunk_entities_entity_id_idx ON chunk_entities(entity_id);

CREATE TABLE IF NOT EXISTS research_runs (
  id             TEXT PRIMARY KEY,
  query_text     TEXT NOT NULL,
  mode           TEXT NOT NULL CHECK (mode IN ('quick', 'deep')),
  status         TEXT NOT NULL,
  plan_json      JSONB,
  synthesis_json JSONB,
  artifact_json  JSONB,
  checkpoint     TEXT,
  metadata       JSONB,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS research_runs_status_idx ON research_runs(status);
CREATE INDEX IF NOT EXISTS research_runs_created_at_idx ON research_runs(created_at DESC);

CREATE TABLE IF NOT EXISTS research_findings (
  id                BIGSERIAL PRIMARY KEY,
  run_id            TEXT REFERENCES research_runs(id) ON DELETE SET NULL,
  brand_entity_id   BIGINT REFERENCES entities(id) ON DELETE SET NULL,
  desk              TEXT NOT NULL,
  claim_text        TEXT NOT NULL,
  evidence          JSONB NOT NULL DEFAULT '[]'::jsonb,
  citations         JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence        DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  insight_type      TEXT NOT NULL DEFAULT 'topic',
  cross_source_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  embedding         VECTOR(1536),
  fts               TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', claim_text)) STORED,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS research_findings_run_id_idx ON research_findings(run_id);
CREATE INDEX IF NOT EXISTS research_findings_brand_entity_id_idx ON research_findings(brand_entity_id);
CREATE INDEX IF NOT EXISTS research_findings_embedding_idx ON research_findings USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS research_findings_fts_idx ON research_findings USING gin(fts);

CREATE OR REPLACE FUNCTION search_corpus(
  query_text         TEXT,
  query_embedding    VECTOR(1536),
  match_count        INTEGER DEFAULT 20,
  rrf_k              INTEGER DEFAULT 60,
  filter_source      TEXT DEFAULT NULL,
  filter_topic       TEXT DEFAULT NULL,
  filter_entity_ids  BIGINT[] DEFAULT NULL,
  date_from          TEXT DEFAULT NULL,
  date_to            TEXT DEFAULT NULL
)
RETURNS TABLE (
  chunk_id        BIGINT,
  episode_id      BIGINT,
  source_id       BIGINT,
  source_name     TEXT,
  episode_number  INTEGER,
  title           TEXT,
  slug            TEXT,
  url             TEXT,
  date            TEXT,
  topic           TEXT,
  start_timestamp TEXT,
  end_timestamp   TEXT,
  text            TEXT,
  entity_names    TEXT[],
  rrf_score       DOUBLE PRECISION
)
LANGUAGE SQL
AS $$
  WITH filtered_chunks AS (
    SELECT c.*
    FROM chunks c
    JOIN episodes e ON e.id = c.episode_id
    JOIN sources s ON s.id = e.source_id
    WHERE
      (filter_source IS NULL OR s.slug = filter_source)
      AND (filter_topic IS NULL OR e.topic = filter_topic)
      AND (date_from IS NULL OR e.published_date >= date_from)
      AND (date_to IS NULL OR e.published_date <= date_to)
      AND (
        filter_entity_ids IS NULL
        OR cardinality(filter_entity_ids) = 0
        OR EXISTS (
          SELECT 1
          FROM episode_entities ee
          WHERE ee.episode_id = c.episode_id
            AND ee.entity_id = ANY(filter_entity_ids)
        )
      )
  ),
  semantic AS (
    SELECT
      c.id,
      ROW_NUMBER() OVER (ORDER BY c.embedding <=> query_embedding) AS rank
    FROM filtered_chunks c
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
    FROM filtered_chunks c
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
    c.id AS chunk_id,
    c.episode_id,
    src.id AS source_id,
    src.name AS source_name,
    ep.episode_number,
    ep.title,
    ep.slug,
    ep.url,
    ep.published_date AS date,
    ep.topic,
    c.start_timestamp,
    c.end_timestamp,
    c.text,
    COALESCE(
      (
        SELECT array_agg(DISTINCT en.canonical_name)
        FROM episode_entities ee
        JOIN entities en ON en.id = ee.entity_id
        WHERE ee.episode_id = ep.id
      ),
      ARRAY[]::TEXT[]
    ) AS entity_names,
    rrf.score AS rrf_score
  FROM rrf
  JOIN chunks c ON c.id = rrf.id
  JOIN episodes ep ON ep.id = c.episode_id
  JOIN sources src ON src.id = ep.source_id
  ORDER BY rrf.score DESC
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION search_findings(
  query_text              TEXT,
  query_embedding         VECTOR(1536),
  match_count             INTEGER DEFAULT 8,
  min_confidence          DOUBLE PRECISION DEFAULT 0.4,
  filter_brand_entity_id  BIGINT DEFAULT NULL
)
RETURNS TABLE (
  id            BIGINT,
  run_id        TEXT,
  desk          TEXT,
  claim_text    TEXT,
  evidence      JSONB,
  citations     JSONB,
  confidence    DOUBLE PRECISION,
  insight_type  TEXT,
  score         DOUBLE PRECISION
)
LANGUAGE SQL
AS $$
  WITH filtered_findings AS (
    SELECT rf.*
    FROM research_findings rf
    WHERE rf.confidence >= min_confidence
      AND (
        filter_brand_entity_id IS NULL
        OR rf.brand_entity_id = filter_brand_entity_id
      )
  ),
  semantic AS (
    SELECT
      rf.id,
      ROW_NUMBER() OVER (ORDER BY rf.embedding <=> query_embedding) AS rank
    FROM filtered_findings rf
    WHERE rf.embedding IS NOT NULL
    ORDER BY rf.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  keyword AS (
    SELECT
      rf.id,
      ROW_NUMBER() OVER (
        ORDER BY ts_rank_cd(rf.fts, websearch_to_tsquery('english', query_text)) DESC
      ) AS rank
    FROM filtered_findings rf
    WHERE rf.fts @@ websearch_to_tsquery('english', query_text)
    ORDER BY ts_rank_cd(rf.fts, websearch_to_tsquery('english', query_text)) DESC
    LIMIT match_count * 2
  ),
  rrf AS (
    SELECT
      COALESCE(s.id, k.id) AS id,
      COALESCE(1.0 / (60 + s.rank), 0.0) +
      COALESCE(1.0 / (60 + k.rank), 0.0) AS score
    FROM semantic s
    FULL OUTER JOIN keyword k ON s.id = k.id
  )
  SELECT
    rf.id,
    rf.run_id,
    rf.desk,
    rf.claim_text,
    rf.evidence,
    rf.citations,
    rf.confidence,
    rf.insight_type,
    rrf.score
  FROM rrf
  JOIN research_findings rf ON rf.id = rrf.id
  ORDER BY rrf.score DESC
  LIMIT match_count;
$$;
