import { supabase } from "@/db/client";

type CountRow = { count: number };

async function countRows(table: string): Promise<number | null> {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) {
    return null;
  }
  return count ?? 0;
}

export async function verifyGeneralizedParity(): Promise<void> {
  const [legacyEpisodes, generalizedEpisodes, legacyChunks, generalizedChunks] =
    await Promise.all([
      countRows("founders_episodes"),
      countRows("episodes"),
      countRows("founders_ep_chunks"),
      countRows("chunks"),
    ]);

  console.log("Parity check:");
  console.log(`  founders_episodes: ${legacyEpisodes ?? "n/a"}`);
  console.log(`  episodes:          ${generalizedEpisodes ?? "n/a"}`);
  console.log(`  founders_ep_chunks:${legacyChunks ?? "n/a"}`);
  console.log(`  chunks:            ${generalizedChunks ?? "n/a"}`);

  if (
    legacyEpisodes !== null &&
    generalizedEpisodes !== null &&
    legacyEpisodes !== generalizedEpisodes
  ) {
    throw new Error("Episode counts do not match between legacy and generalized tables.");
  }
  if (legacyChunks !== null && generalizedChunks !== null && legacyChunks !== generalizedChunks) {
    throw new Error("Chunk counts do not match between legacy and generalized tables.");
  }
}

if (import.meta.main) {
  verifyGeneralizedParity().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
