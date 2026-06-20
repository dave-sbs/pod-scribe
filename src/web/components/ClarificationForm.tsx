import { useState } from "react";
import type { ClarificationAnswer, ClarificationQuestion } from "@/core/types";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/web/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/web/components/ui/field";
import { Textarea } from "@/web/components/ui/textarea";
import { Button } from "@/web/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/web/components/ui/toggle-group";

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
    <Card className="mx-auto mb-4 max-w-[720px]">
      <CardHeader>
        <CardDescription className="text-[11px] tracking-wide uppercase">
          Scoping the research
        </CardDescription>
        <CardTitle>A few questions to focus the investigation</CardTitle>
        <CardDescription>
          Answer what&apos;s useful — blanks are fine. The research team will
          scope around your answers.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <FieldGroup>
          {questions.map((q, i) => (
            <Field key={q.id}>
              <FieldLabel htmlFor={`clarify-${q.id}`}>
                {i + 1}. {q.question}
              </FieldLabel>
              {q.rationale && (
                <FieldDescription>{q.rationale}</FieldDescription>
              )}
              {q.options && q.options.length > 0 && (
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  className="flex-wrap"
                  value={answers[q.id] ?? ""}
                  onValueChange={(next) => setAnswer(q.id, next)}
                >
                  {q.options.map((opt) => (
                    <ToggleGroupItem key={opt} value={opt}>
                      {opt}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              )}
              <Textarea
                id={`clarify-${q.id}`}
                value={answers[q.id] ?? ""}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                rows={2}
                placeholder="Your answer (optional)"
                className="min-h-0"
              />
            </Field>
          ))}
        </FieldGroup>
      </CardContent>

      <CardFooter className="justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={handleSubmit}>
          Start deep research
        </Button>
      </CardFooter>
    </Card>
  );
}
