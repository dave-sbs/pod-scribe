import { useMemo } from "react";
import {
  Moon,
  PanelLeft,
  PanelLeftClose,
  Plus,
  MessagesSquare,
  Sun,
  Trash2,
} from "lucide-react";
import { useConversationStore } from "../stores/conversation";
import { useThemeStore } from "../stores/theme";
import { Button } from "@/web/components/ui/button";
import { Separator } from "@/web/components/ui/separator";

// --- Theme toggle ---

function ThemeToggle() {
  const dark = useThemeStore((s) => s.dark);
  const toggle = useThemeStore((s) => s.toggle);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className="text-muted-foreground"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}

// --- Collapsed sidebar (icon rail) ---

type CollapsedSidebarProps = {
  onExpand: () => void;
};

export function CollapsedSidebar({ onExpand }: CollapsedSidebarProps) {
  const createConversation = useConversationStore((s) => s.createConversation);
  const conversations = useConversationStore((s) => s.conversations);
  const activeId = useConversationStore((s) => s.activeId);
  const setActive = useConversationStore((s) => s.setActive);

  // Cycle through recent conversations
  const sorted = useMemo(
    () =>
      [...conversations].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    [conversations]
  );

  const handleCycleChat = () => {
    if (sorted.length === 0) return;
    const currentIdx = sorted.findIndex((c) => c.id === activeId);
    const nextIdx = (currentIdx + 1) % sorted.length;
    setActive(sorted[nextIdx].id);
  };

  return (
    <div className="flex h-full w-14 flex-col items-center border-r bg-sidebar py-3">
      <Button
        variant="ghost"
        size="icon"
        onClick={onExpand}
        className="text-muted-foreground"
        aria-label="Expand sidebar"
      >
        <PanelLeft />
      </Button>

      <div className="mt-2 flex flex-col items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => createConversation()}
          className="text-muted-foreground"
          aria-label="New chat"
        >
          <Plus />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleCycleChat}
          disabled={conversations.length === 0}
          className="text-muted-foreground"
          aria-label="Switch chat"
        >
          <MessagesSquare />
        </Button>
      </div>

      <div className="flex-1" />

      <ThemeToggle />
    </div>
  );
}

// --- Expanded sidebar ---

type DateGroup = {
  label: string;
  conversations: Array<{ id: string; title: string }>;
};

function groupByDate(
  conversations: Array<{ id: string; title: string; updatedAt: string }>
): DateGroup[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);
  const weekAgo = new Date(today.getTime() - 7 * 86_400_000);

  const groups: Record<string, DateGroup> = {};
  const order = ["Today", "Yesterday", "Previous 7 days", "Older"];
  for (const label of order) {
    groups[label] = { label, conversations: [] };
  }

  for (const conv of conversations) {
    const updated = new Date(conv.updatedAt);
    let label: string;
    if (updated >= today) label = "Today";
    else if (updated >= yesterday) label = "Yesterday";
    else if (updated >= weekAgo) label = "Previous 7 days";
    else label = "Older";
    groups[label].conversations.push(conv);
  }

  return order.map((l) => groups[l]).filter((g) => g.conversations.length > 0);
}

type SidebarProps = {
  onClose?: () => void;
  onCollapse?: () => void;
};

export function Sidebar({ onClose, onCollapse }: SidebarProps) {
  const conversations = useConversationStore((s) => s.conversations);
  const activeId = useConversationStore((s) => s.activeId);
  const createConversation = useConversationStore((s) => s.createConversation);
  const setActive = useConversationStore((s) => s.setActive);
  const deleteConversation = useConversationStore((s) => s.deleteConversation);

  const sorted = useMemo(
    () =>
      [...conversations].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    [conversations]
  );
  const groups = useMemo(() => groupByDate(sorted), [sorted]);

  const handleNew = () => {
    createConversation();
    onClose?.();
  };

  const handleSelect = (id: string) => {
    setActive(id);
    onClose?.();
  };

  return (
    <div className="flex h-full w-[280px] flex-col border-r bg-sidebar">
      {/* Header */}
      <div className="flex items-center gap-2 p-3">
        {onCollapse && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onCollapse}
            className="text-muted-foreground"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose />
          </Button>
        )}
        <Button
          variant="outline"
          onClick={handleNew}
          className="flex-1 justify-center"
        >
          <Plus data-icon="inline-start" />
          New Chat
        </Button>
      </div>

      <Separator />

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {groups.map((group) => (
          <div key={group.label} className="mb-3">
            <p className="px-2 py-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              {group.label}
            </p>
            {group.conversations.map((conv) => {
              const active = conv.id === activeId;
              return (
                <div key={conv.id} className="group/item relative">
                  <Button
                    variant={active ? "secondary" : "ghost"}
                    onClick={() => handleSelect(conv.id)}
                    className="w-full justify-start truncate pr-8 font-normal"
                  >
                    <span className="truncate">{conv.title}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                    aria-label="Delete conversation"
                    className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground opacity-0 transition-opacity group-hover/item:opacity-100 hover:text-destructive"
                  >
                    <Trash2 />
                  </Button>
                </div>
              );
            })}
          </div>
        ))}

        {conversations.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            No conversations yet
          </p>
        )}
      </div>

      <Separator />

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-3">
        <ThemeToggle />
      </div>
    </div>
  );
}
