import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import type {
  Conversation,
  DeepRunState,
  Dossier,
  EngagementLexicon,
  Message,
  SourceReference,
} from "@/core/types";

type ConversationState = {
  conversations: Conversation[];
  activeId: string | null;
  isStreaming: boolean;

  // Actions
  createConversation: () => string;
  setActive: (id: string | null) => void;
  deleteConversation: (id: string) => void;
  addMessage: (
    conversationId: string,
    role: "user" | "assistant",
    content: string,
    sources?: SourceReference[]
  ) => string;
  updateMessage: (
    conversationId: string,
    messageId: string,
    updates: Partial<Pick<Message, "content" | "sources">>
  ) => void;
  appendToMessage: (
    conversationId: string,
    messageId: string,
    content: string
  ) => void;
  setTitle: (conversationId: string, title: string) => void;
  setSummary: (conversationId: string, summary: string) => void;
  setStreaming: (streaming: boolean) => void;
  upsertDeepRun: (
    conversationId: string,
    runId: string,
    updates: Partial<DeepRunState> & { query?: string }
  ) => void;
  setActiveDeepRun: (conversationId: string, runId: string | null) => void;
  setDeepArtifact: (
    conversationId: string,
    runId: string,
    artifact: {
      dossier: Dossier;
      lexicon: EngagementLexicon;
      report: string;
      sources: SourceReference[];
    }
  ) => void;
};

// Standalone selector — returns a stable primitive-keyed find, safe for React
export function selectActiveConversation(
  state: ConversationState
): Conversation | undefined {
  return state.conversations.find((c) => c.id === state.activeId);
}

export const useConversationStore = create<ConversationState>()(
  persist(
    (set) => ({
      conversations: [],
      activeId: null,
      isStreaming: false,

      createConversation: () => {
        const id = nanoid();
        const now = new Date().toISOString();
        const conversation: Conversation = {
          id,
          title: "New conversation",
          messages: [],
          deepRuns: {},
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          conversations: [conversation, ...state.conversations],
          activeId: id,
        }));
        return id;
      },

      setActive: (id) => set({ activeId: id }),

      deleteConversation: (id) =>
        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== id),
          activeId: state.activeId === id ? null : state.activeId,
        })),

      addMessage: (conversationId, role, content, sources = []) => {
        const messageId = nanoid();
        const now = new Date().toISOString();
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: [
                    ...c.messages,
                    { id: messageId, role, content, sources, createdAt: now },
                  ],
                  updatedAt: now,
                }
              : c
          ),
        }));
        return messageId;
      },

      updateMessage: (conversationId, messageId, updates) =>
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === messageId ? { ...m, ...updates } : m
                  ),
                }
              : c
          ),
        })),

      appendToMessage: (conversationId, messageId, content) =>
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === messageId
                      ? { ...m, content: m.content + content }
                      : m
                  ),
                }
              : c
          ),
        })),

      setTitle: (conversationId, title) =>
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId ? { ...c, title } : c
          ),
        })),

      setSummary: (conversationId, summary) =>
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId ? { ...c, summary } : c
          ),
        })),

      setStreaming: (isStreaming) => set({ isStreaming }),

      upsertDeepRun: (conversationId, runId, updates) =>
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c;
            const existing = c.deepRuns?.[runId];
            const merged: DeepRunState = {
              runId,
              query: updates.query ?? existing?.query ?? "",
              status: updates.status ?? existing?.status ?? "planning",
              startedAt: updates.startedAt ?? existing?.startedAt,
              currentDeskIndex:
                updates.currentDeskIndex ?? existing?.currentDeskIndex,
              deskTotal: updates.deskTotal ?? existing?.deskTotal,
              findings: updates.findings ?? existing?.findings ?? [],
              plan: updates.plan ?? existing?.plan,
              synthesis: updates.synthesis ?? existing?.synthesis,
              dossier: updates.dossier ?? existing?.dossier,
              lexicon: updates.lexicon ?? existing?.lexicon,
              report: updates.report ?? existing?.report,
              sources: updates.sources ?? existing?.sources,
              error: updates.error ?? existing?.error,
              updatedAt: new Date().toISOString(),
            };
            return {
              ...c,
              deepRuns: {
                ...(c.deepRuns ?? {}),
                [runId]: merged,
              },
              activeDeepRunId: runId,
              updatedAt: merged.updatedAt,
            };
          }),
        })),

      setActiveDeepRun: (conversationId, runId) =>
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId ? { ...c, activeDeepRunId: runId ?? undefined } : c
          ),
        })),

      setDeepArtifact: (conversationId, runId, artifact) =>
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c;
            const existing = c.deepRuns?.[runId];
            if (!existing) return c;
            return {
              ...c,
              deepRuns: {
                ...(c.deepRuns ?? {}),
                [runId]: {
                  ...existing,
                  dossier: artifact.dossier,
                  lexicon: artifact.lexicon,
                  report: artifact.report,
                  sources: artifact.sources,
                  status: "completed",
                  updatedAt: new Date().toISOString(),
                },
              },
            };
          }),
        })),
    }),
    {
      name: "pod-scribe-conversations",
      partialize: (state) => ({
        conversations: state.conversations,
        activeId: state.activeId,
      }),
    }
  )
);
