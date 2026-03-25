import { useMemo } from "react";
import { useConversationStore } from "../stores/conversation";
import { useThemeStore } from "../stores/theme";

// --- Shared icons ---

function PlusIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ChatIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function SidebarExpandIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <polyline points="14 9 17 12 14 15" />
    </svg>
  );
}

function SidebarCollapseIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <polyline points="16 9 13 12 16 15" />
    </svg>
  );
}

function SunIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

// --- Shared button style for icon rail ---

const railBtnClass =
  "p-2.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-card transition-colors";

// --- Theme toggle ---

function ThemeToggle() {
  const dark = useThemeStore((s) => s.dark);
  const toggle = useThemeStore((s) => s.toggle);

  return (
    <button
      onClick={toggle}
      className={railBtnClass}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
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
    <div className="h-full w-[56px] flex flex-col items-center bg-bg-secondary border-r border-border py-3">
      {/* Expand */}
      <button
        onClick={onExpand}
        className={railBtnClass}
        aria-label="Expand sidebar"
      >
        <SidebarExpandIcon />
      </button>

      <div className="mt-2 flex flex-col items-center gap-1">
        {/* New chat */}
        <button
          onClick={() => createConversation()}
          className={railBtnClass}
          aria-label="New chat"
        >
          <PlusIcon />
        </button>

        {/* Cycle chats */}
        <button
          onClick={handleCycleChat}
          className={`${railBtnClass} ${conversations.length === 0 ? "opacity-30 pointer-events-none" : ""}`}
          aria-label="Switch chat"
        >
          <ChatIcon />
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Theme toggle */}
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
    <div className="h-full w-[280px] flex flex-col bg-bg-secondary border-r border-border">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center gap-2">
        {onCollapse && (
          <button
            onClick={onCollapse}
            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-card transition-colors"
            aria-label="Collapse sidebar"
          >
            <SidebarCollapseIcon />
          </button>
        )}
        <button
          onClick={handleNew}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-border bg-bg-card text-sm font-medium text-text-primary hover:bg-bg-primary transition-colors"
        >
          <PlusIcon size={16} />
          New Chat
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {groups.map((group) => (
          <div key={group.label} className="mb-3">
            <p className="px-3 py-1.5 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
              {group.label}
            </p>
            {group.conversations.map((conv) => (
              <div key={conv.id} className="group relative">
                <button
                  onClick={() => handleSelect(conv.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors ${conv.id === activeId
                    ? "bg-accent-light text-accent font-medium"
                    : "text-text-secondary hover:bg-bg-card hover:text-text-primary"
                    }`}
                >
                  {conv.title}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-error-light text-text-muted hover:text-error transition-all"
                >
                  <TrashIcon />
                </button>
              </div>
            ))}
          </div>
        ))}

        {conversations.length === 0 && (
          <p className="px-3 py-8 text-sm text-text-muted text-center">
            No conversations yet
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border flex items-center justify-between">
        <ThemeToggle />
      </div>
    </div>
  );
}
