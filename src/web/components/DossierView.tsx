import type { Dossier, EngagementLexicon, SourceReference } from "@/core/types";
import { CitedText } from "./CitedText";

type DossierViewProps = {
  dossier?: Dossier;
  lexicon?: EngagementLexicon;
  sources?: SourceReference[];
};

function Chips({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span
          key={`${item}-${i}`}
          className="rounded-full bg-bg-secondary px-2.5 py-1 text-[11px] text-text-secondary"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export function DossierView({ dossier, lexicon, sources = [] }: DossierViewProps) {
  if (!dossier || !lexicon) return null;

  return (
    <div className="max-w-[720px] mx-auto mb-4 rounded-2xl border border-border bg-bg-card px-5 py-4">
      <p className="text-[11px] uppercase tracking-wide text-text-muted">
        Strategic appendix
      </p>
      <h3 className="text-sm font-semibold text-text-primary mt-0.5">
        Mindspace dossier: {dossier.brandOrIndustry}
      </h3>

      <div className="mt-3">
        <p className="text-xs font-semibold text-text-primary">Worldview</p>
        <p className="text-sm text-text-secondary mt-1 leading-relaxed">
          <CitedText text={dossier.worldview} sources={sources} />
        </p>
      </div>

      {dossier.sacredCows.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-text-primary">Sacred cows</p>
          <ul className="mt-1 space-y-1">
            {dossier.sacredCows.map((item, i) => (
              <li key={i} className="text-xs text-text-secondary leading-relaxed">
                <CitedText text={item} sources={sources} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {dossier.taboos.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-text-primary">
            Taboos and absences
          </p>
          <ul className="mt-1 space-y-1">
            {dossier.taboos.map((item, i) => (
              <li key={i} className="text-xs text-text-secondary leading-relaxed">
                <CitedText text={item} sources={sources} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {dossier.contradictions.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-text-primary">
            Tensions and contradictions
          </p>
          <ul className="mt-1 space-y-1">
            {dossier.contradictions.map((item, i) => (
              <li key={i} className="text-xs text-text-secondary leading-relaxed">
                <CitedText text={item} sources={sources} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-semibold text-text-primary">
            Resonant language
          </p>
          <Chips items={lexicon.resonantLanguage} />
          {lexicon.resonantLanguage.length === 0 && (
            <p className="text-xs text-text-muted mt-1">None detected</p>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold text-text-primary">Avoid language</p>
          <Chips items={lexicon.avoidLanguage} />
          {lexicon.avoidLanguage.length === 0 && (
            <p className="text-xs text-text-muted mt-1">None detected</p>
          )}
        </div>
      </div>

      {lexicon.outreachTips.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-text-primary">Outreach tips</p>
          <ul className="mt-1 space-y-1 list-disc list-inside">
            {lexicon.outreachTips.map((tip, i) => (
              <li key={i} className="text-xs text-text-secondary leading-relaxed">
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
