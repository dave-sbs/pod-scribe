import { useState } from "react";
import type { ClarificationAnswer, ClarificationQuestion } from "@/core/types";

type ClarificationFormProps = {
  questions: ClarificationQuestion[];
  onSubmit: (answers: ClarificationAnswer[]) => void;
  onCancel: () => void;
};

export function ClarificationForm({
  questions,
  onSubmit,
  onCancel,
}: ClarificationFormProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const setAnswer = (id: string, value: string) =>
    setAnswers((prev) => ({ ...prev, [id]: value }));

  const handleSubmit = () => {
    const payload: ClarificationAnswer[] = questions.map((q) => ({
      id: q.id,
      question: q.question,
      answer: (answers[q.id] ?? "").trim(),
    }));
    onSubmit(payload);
  };

  return (
    <div className="max-w-[720px] mx-auto mb-4 rounded-2xl border border-border bg-bg-card shadow-sm overflow-hidden">
      <div className="px-4 pt-4">
        <p className="text-[11px] uppercase tracking-wide text-text-muted">
          Scoping the research
        </p>
        <h3 className="mt-1 text-base font-semibold text-text-primary">
          A few questions to focus the investigation
        </h3>
        <p className="mt-1 text-xs text-text-muted">
          Answer what's useful — blanks are fine. The research team will scope
          around your answers.
        </p>
      </div>

      <div className="px-4 py-4 space-y-4">
        {questions.map((q, i) => (
          <div key={q.id}>
            <label className="block text-sm font-medium text-text-primary">
              {i + 1}. {q.question}
            </label>
            {q.rationale && (
              <p className="mt-0.5 text-[11px] text-text-muted">{q.rationale}</p>
            )}
            {q.options && q.options.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {q.options.map((opt) => {
                  const active = answers[q.id] === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setAnswer(q.id, active ? "" : opt)}
                      className={`rounded-full px-2.5 py-1 text-xs border transition-colors ${
                        active
                          ? "border-accent bg-accent-light text-accent"
                          : "border-border bg-bg-primary text-text-secondary hover:border-accent/40"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}
            <textarea
              value={answers[q.id] ?? ""}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              rows={2}
              placeholder="Your answer (optional)"
              className="mt-2 w-full resize-none rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-2 px-4 pb-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-secondary transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="rounded-lg bg-accent text-white px-3 py-1.5 text-xs hover:bg-accent-hover transition-colors"
        >
          Start deep research
        </button>
      </div>
    </div>
  );
}
