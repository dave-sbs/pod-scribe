import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { Conversation, Message, SourceReference } from "@/core/types";

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
