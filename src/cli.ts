import { ingestAll } from "@/ingestion/pipeline";
import { search } from "@/retrieval/search";
import { ask } from "@/rag/pipeline";
import { copyFoundersToGeneralized } from "@/ingestion/migrate/copyToGeneralized";
import { backfillEpisodeTags } from "@/ingestion/tag/tagEpisodes";
import { verifyGeneralizedParity } from "@/ingestion/migrate/verifyGeneralizedParity";

const [command, ...args] = process.argv.slice(2);

async function main(): Promise<void> {
  switch (command) {
    case "ingest": {
      const slugIdx = args.indexOf("--slug");
      const slug = slugIdx >= 0 ? args[slugIdx + 1] : undefined;
      if (slugIdx >= 0 && !slug) {
        console.error("--slug requires a value");
        process.exit(1);
      }
      await ingestAll(slug);
      break;
    }

    case "ingest-all": {
      await ingestAll();
      break;
    }

    case "search": {
      const query = args.join(" ").trim();
      if (!query) {
        console.error('Usage: bun run src/cli.ts search "<query>"');
        process.exit(1);
      }
      const results = await search(query);
      if (results.length === 0) {
        console.log("No results.");
        break;
      }
      for (const r of results) {
        console.log(
          `[${r.rrfScore.toFixed(4)}] Ep#${r.episodeNumber} "${r.title}" @ ${r.startTimestamp}`,
        );
        console.log(`  ${r.text.slice(0, 140)}...`);
        console.log();
      }
      break;
    }

    case "migrate-generalized": {
      await copyFoundersToGeneralized();
      break;
    }

    case "tag-episodes": {
      await backfillEpisodeTags();
      break;
    }

    case "verify-generalized-parity": {
      await verifyGeneralizedParity();
      break;
    }

    case "ask": {
      const question = args.join(" ").trim();
      if (!question) {
        console.error('Usage: bun run src/cli.ts ask "<question>"');
        process.exit(1);
      }
      const { answer, sources } = await ask(question);
      console.log(answer);
      console.log("\n--- Sources retrieved ---");
      for (const s of sources) {
        console.log(
          `  Ep#${s.episodeNumber} "${s.title}" @ ${s.timestamp} — ${s.url}`,
        );
      }
      break;
    }

    default:
      console.log(
        "Usage: bun run src/cli.ts <ingest|search|ask|migrate-generalized|tag-episodes|verify-generalized-parity> [args]",
      );
      console.log("  ingest [--slug <slug>]   Ingest episodes into Supabase");
      console.log('  search "<query>"         Hybrid search (no synthesis)');
      console.log('  ask "<question>"         Full RAG: search + synthesize');
      console.log(
        "  migrate-generalized      Copy founders_* data into sources/episodes/chunks",
      );
      console.log(
        "  tag-episodes             LLM backfill of topic + entities onto episodes",
      );
      console.log(
        "  verify-generalized-parity Compare counts across legacy and generalized tables",
      );
      process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
