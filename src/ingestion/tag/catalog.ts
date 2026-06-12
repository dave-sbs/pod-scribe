import { readFile } from "fs/promises";
import { join } from "path";
import { upsertEntity, upsertEntityAlias } from "@/db/episodes";

export type CatalogEntity = {
  type: "brand" | "person" | "org" | "other";
  name: string;
  slug: string;
  aliases: string[];
};

const CATALOG_PATH = join(process.cwd(), "data/entities/catalog.json");

export async function readCatalog(): Promise<CatalogEntity[]> {
  const raw = await readFile(CATALOG_PATH, "utf-8");
  return JSON.parse(raw) as CatalogEntity[];
}

export async function seedCatalog(): Promise<Map<string, number>> {
  const entities = await readCatalog();
  const slugToId = new Map<string, number>();

  for (const entity of entities) {
    const entityId = await upsertEntity({
      type: entity.type,
      name: entity.name,
      slug: entity.slug,
    });
    slugToId.set(entity.slug, entityId);

    await upsertEntityAlias(entityId, entity.name.toLowerCase());
    for (const alias of entity.aliases) {
      if (alias.trim()) {
        await upsertEntityAlias(entityId, alias.toLowerCase());
      }
    }
  }

  return slugToId;
}
