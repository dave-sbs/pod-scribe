import type { Dossier, EngagementLexicon, SourceReference } from "@/core/types";
import { CitedText } from "./CitedText";
import { Card } from "@/web/components/ui/card";
import { Badge } from "@/web/components/ui/badge";

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
        <Badge key={`${item}-${i}`} variant="secondary" className="font-normal">
          {item}
        </Badge>
      ))}
    </div>
  );
}

export function DossierView({ dossier, lexicon, sources = [] }: DossierViewProps) {
  if (!dossier || !lexicon) return null;

  return (
    <Card className="mx-auto mb-4 max-w-[720px] gap-0 px-5 py-4">
      <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
        Strategic appendix
      </p>
      <h3 className="mt-0.5 text-sm font-semibold text-foreground">
        Mindspace dossier: {dossier.brandOrIndustry}
      </h3>

      <div className="mt-3">
        <p className="text-xs font-semibold text-foreground">Worldview</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          <CitedText text={dossier.worldview} sources={sources} />
        </p>
      </div>

      {dossier.sacredCows.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-foreground">Sacred cows</p>
          <ul className="mt-1 flex flex-col gap-1">
            {dossier.sacredCows.map((item, i) => (
              <li key={i} className="text-xs leading-relaxed text-muted-foreground">
                <CitedText text={item} sources={sources} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {dossier.taboos.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-foreground">
            Taboos and absences
          </p>
          <ul className="mt-1 flex flex-col gap-1">
            {dossier.taboos.map((item, i) => (
              <li key={i} className="text-xs leading-relaxed text-muted-foreground">
                <CitedText text={item} sources={sources} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {dossier.contradictions.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-foreground">
            Tensions and contradictions
          </p>
          <ul className="mt-1 flex flex-col gap-1">
            {dossier.contradictions.map((item, i) => (
              <li key={i} className="text-xs leading-relaxed text-muted-foreground">
                <CitedText text={item} sources={sources} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold text-foreground">
            Resonant language
          </p>
          <Chips items={lexicon.resonantLanguage} />
          {lexicon.resonantLanguage.length === 0 && (
            <p className="mt-1 text-xs text-muted-foreground">None detected</p>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground">Avoid language</p>
          <Chips items={lexicon.avoidLanguage} />
          {lexicon.avoidLanguage.length === 0 && (
            <p className="mt-1 text-xs text-muted-foreground">None detected</p>
          )}
        </div>
      </div>

      {lexicon.outreachTips.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-foreground">Outreach tips</p>
          <ul className="mt-1 flex list-inside list-disc flex-col gap-1">
            {lexicon.outreachTips.map((tip, i) => (
              <li key={i} className="text-xs leading-relaxed text-muted-foreground">
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
