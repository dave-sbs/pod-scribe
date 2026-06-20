import { supabase } from "@/db/client";

export type ResolvedEntity = {
  id: number;
  canonicalName: string;
  type: "brand" | "person" | "org" | "other";
  matchedAlias: string;
};

export async function resolveEntities(query: string): Promise<ResolvedEntity[]> {
  const normalized = query.toLowerCase();
  const { data, error } = await supabase
    .from("entity_aliases")
    .select("alias, entity_id, entities(id, canonical_name, type)");

  if (error) {
    return [];
  }

  const matches: ResolvedEntity[] = [];
  const seen = new Set<number>();

  for (const row of (data ?? []) as Array<{
    alias: string;
    entity_id: number;
    entities:
      | { id: number; canonical_name: string; type: string }
      | Array<{ id: number; canonical_name: string; type: string }>
      | null;
  }>) {
    if (!row.alias || !normalized.includes(row.alias.toLowerCase())) continue;

    const entity = Array.isArray(row.entities) ? row.entities[0] : row.entities;
    if (!entity || seen.has(row.entity_id)) continue;
    seen.add(row.entity_id);
    matches.push({
      id: entity.id,
      canonicalName: entity.canonical_name,
      type: (entity.type as ResolvedEntity["type"]) ?? "other",
      matchedAlias: row.alias,
    });
  }

  return matches;
}

export function rewriteQueryWithEntities(
  query: string,
  entities: ResolvedEntity[],
): string {
  if (entities.length === 0) return query;
  const canonical = entities.map((e) => e.canonicalName).join(", ");
  return `${query}\nFocus entities: ${canonical}`;
}
