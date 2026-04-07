import { useRef, useEffect, useState, useCallback } from "react";
import {
  useConversationStore,
  selectActiveConversation,
} from "../stores/conversation";
import { streamChat, generateTitle } from "../lib/api";
import { MessageBubble } from "./MessageBubble";
import { InputBar } from "./InputBar";
import { LoadingIndicator } from "./LoadingIndicator";
import { ErrorBanner } from "./ErrorBanner";

const STARTER_QUESTIONS = [
  "What did Steve Jobs learn from Edwin Land?",
  "How did Estee Lauder build her empire?",
  "What are the most common traits of great founders?",
  "What does David say about the importance of focus?",
];

export function ChatView() {
  const conversation = useConversationStore(selectActiveConversation);
  const isStreaming = useConversationStore((s) => s.isStreaming);
  const createConversation = useConversationStore((s) => s.createConversation);
  const addMessage = useConversationStore((s) => s.addMessage);
  const appendToMessage = useConversationStore((s) => s.appendToMessage);
  const updateMessage = useConversationStore((s) => s.updateMessage);
  const setTitle = useConversationStore((s) => s.setTitle);
  const setSummary = useConversationStore((s) => s.setSummary);
  const setStreaming = useConversationStore((s) => s.setStreaming);

  const [loadingPhase, setLoadingPhase] = useState<
    "searching" | "generating" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastQuestionRef = useRef<string>("");

  // Auto-scroll to bottom on new content
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation?.messages, loadingPhase]);

  const sendMessage = useCallback(
    async (text: string) => {
      setError(null);
      lastQuestionRef.current = text;

      let convId = conversation?.id;
      if (!convId) {
        convId = createConversation();
      }

      // Add user message
      addMessage(convId, "user", text);

      // Prepare messages for API
      const currentConv = useConversationStore.getState().conversations.find(
        (c) => c.id === convId
      );
      const apiMessages =
        currentConv?.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })) ?? [];

      setLoadingPhase("searching");
      setStreaming(true);

      // Add empty assistant message for streaming into
      const assistantId = addMessage(convId, "assistant", "");
      setStreamingMessageId(assistantId);

      let receivedSources = false;

      await streamChat(
        {
          conversationId: convId,
          messages: apiMessages,
          summary: currentConv?.summary,
        },
        {
          onSources: (sources) => {
            receivedSources = true;
            setLoadingPhase("generating");
            updateMessage(convId, assistantId, { sources });
          },
          onDelta: (content) => {
            if (!receivedSources) {
              receivedSources = true;
              setLoadingPhase(null);
            }
            appendToMessage(convId, assistantId, content);
          },
          onDone: (content, summary) => {
            setLoadingPhase(null);
            setStreaming(false);
            setStreamingMessageId(null);
            updateMessage(convId, assistantId, { content });

            if (summary) {
              setSummary(convId, summary);
            }

            // Generate title for new conversations
            const conv = useConversationStore
              .getState()
              .conversations.find((c) => c.id === convId);
            if (conv && conv.messages.length <= 2 && conv.title === "New conversation") {
              generateTitle(text).then((title) => {
                setTitle(convId, title);
              });
            }
          },
          onError: (message) => {
            setLoadingPhase(null);
            setStreaming(false);
            setStreamingMessageId(null);
            setError(message);
            // Remove the empty assistant message on error
            const store = useConversationStore.getState();
            const conv = store.conversations.find((c) => c.id === convId);
            if (conv) {
              const updatedMessages = conv.messages.filter(
                (m) => m.id !== assistantId
              );
              useConversationStore.setState({
                conversations: store.conversations.map((c) =>
                  c.id === convId ? { ...c, messages: updatedMessages } : c
                ),
              });
            }
          },
        }
      );
    },
    [
      conversation?.id,
      createConversation,
      addMessage,
      appendToMessage,
      updateMessage,
      setTitle,
      setSummary,
      setStreaming,
    ]
  );

  const handleRetry = () => {
    if (lastQuestionRef.current) {
      sendMessage(lastQuestionRef.current);
    }
  };

  // Empty state
  if (!conversation || conversation.messages.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-lg">
            <h1 className="font-serif text-4xl font-medium text-text-primary mb-2">
              Pod-Scribe
            </h1>
            <p className="text-text-secondary mb-8">
              Research companion for the Founders podcast
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {STARTER_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  disabled={isStreaming}
                  className="text-left px-4 py-3 rounded-xl border border-border bg-bg-card text-sm text-text-secondary hover:border-accent/40 hover:text-text-primary hover:bg-accent-light/30 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
        <InputBar onSend={sendMessage} disabled={isStreaming} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-[720px] mx-auto">
          {conversation.messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isStreaming={
                msg.id === streamingMessageId && isStreaming
              }
            />
          ))}

          {loadingPhase === "searching" && (
            <LoadingIndicator phase="searching" />
          )}

          {error && <ErrorBanner message={error} onRetry={handleRetry} />}
        </div>
      </div>

      {/* Input */}
      <InputBar onSend={sendMessage} disabled={isStreaming} />

    </div>
  );
}
