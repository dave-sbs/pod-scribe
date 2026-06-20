import { useState, useCallback } from "react";
import { ArrowUp } from "lucide-react";

import { Button } from "@/web/components/ui/button";
import { Spinner } from "@/web/components/ui/spinner";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/web/components/ui/input-group";
import { ToggleGroup, ToggleGroupItem } from "@/web/components/ui/toggle-group";

type InputBarProps = {
  onSend: (message: string) => void;
  mode: "quick" | "deep";
  onModeChange: (mode: "quick" | "deep") => void;
  disabled: boolean;
};

export function InputBar({ onSend, mode, onModeChange, disabled }: InputBarProps) {
  const [value, setValue] = useState("");

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  }, [value, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="mx-auto w-full max-w-[720px]">
      <InputGroup className="rounded-lg bg-card shadow-sm">
        <InputGroupTextarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask the research…"
          disabled={disabled}
          rows={3}
          className="max-h-[200px] min-h-[88px] text-sm"
        />
        <InputGroupAddon align="block-end" className="border-t">
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            spacing={0}
            value={mode}
            onValueChange={(next) => next && onModeChange(next as "quick" | "deep")}
          >
            <ToggleGroupItem value="quick">Quick lookup</ToggleGroupItem>
            <ToggleGroupItem value="deep">Deep research</ToggleGroupItem>
          </ToggleGroup>
          <Button
            type="button"
            size="icon"
            className="ml-auto rounded-md"
            onClick={handleSubmit}
            disabled={disabled || !value.trim()}
            aria-label="Send message"
          >
            {disabled ? <Spinner /> : <ArrowUp />}
          </Button>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}
