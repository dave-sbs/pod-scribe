import { useRef, useEffect, useState, useCallback } from "react";
import {
  useConversationStore,
  selectActiveConversation,
} from "../stores/conversation";
import {
  streamChat,
  generateTitle,
  resumeResearch,
  clarifyResearch,
} from "../lib/api";
import { MessageBubble } from "./MessageBubble";
import { InputBar } from "./InputBar";
import { LoadingIndicator } from "./LoadingIndicator";
import { ErrorBanner } from "./ErrorBanner";
import { ResearchProgress } from "./ResearchProgress";
import { CheckpointPrompt } from "./CheckpointPrompt";
import { ClarificationForm } from "./ClarificationForm";
import { DossierView } from "./DossierView";
import type {
  ClarificationAnswer,
  ClarificationQuestion,
  DeepRunStatus,
  Finding,
} from "@/core/types";

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
  const upsertDeepRun = useConversationStore((s) => s.upsertDeepRun);
  const setDeepArtifact = useConversationStore((s) => s.setDeepArtifact);

  const [loadingPhase, setLoadingPhase] = useState<
    "searching" | "generating" | null
  >(null);
  const [mode, setMode] = useState<"quick" | "deep">("quick");
  const [error, setError] = useState<string | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );
  const [checkpoint, setCheckpoint] = useState<{
    runId: string;
    checkpoint: "plan" | "synthesis";
    note?: string;
  } | null>(null);
  const [checkpointCollapsed, setCheckpointCollapsed] = useState(false);
  const [pendingClarification, setPendingClarification] = useState<{
    convId: string;
    query: string;
    questions: ClarificationQuestion[];
  } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastQuestionRef = useRef<string>("");
  const activeDeepRun =
    conversation?.activeDeepRunId && conversation.deepRuns
      ? conversation.deepRuns[conversation.activeDeepRunId]
      : undefined;

  // Auto-scroll to bottom on new content
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation?.messages, loadingPhase]);

  const runStream = useCallback(
    async (
      convId: string,
      text: string,
      selectedMode: "quick" | "deep",
      clarifications?: ClarificationAnswer[]
    ) => {
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
          mode: selectedMode,
          summary: currentConv?.summary,
          clarifications,
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
          onStatus: (runId, status) => {
            if (selectedMode === "deep") {
              setLoadingPhase("generating");
              const existingRun = useConversationStore
                .getState()
                .conversations.find((c) => c.id === convId)?.deepRuns?.[runId];
              upsertDeepRun(convId, runId, {
                query: text,
                status: status as DeepRunStatus,
                startedAt: existingRun?.startedAt ?? new Date().toISOString(),
              });
            }
          },
          onPlan: (runId, plan) => {
            upsertDeepRun(convId, runId, { query: text, plan });
          },
          onDeskStarted: (runId, _desk, index, total) => {
            setLoadingPhase("generating");
            upsertDeepRun(convId, runId, {
              query: text,
              currentDeskIndex: index,
              deskTotal: total,
            });
          },
          onDeskFinding: (runId, _desk, finding) => {
            const run =
              useConversationStore.getState().conversations.find((c) => c.id === convId)
                ?.deepRuns?.[runId];
            const findings = [...(run?.findings ?? []), finding as Finding];
            upsertDeepRun(convId, runId, { query: text, findings });
          },
          onCheckpoint: (runId, checkpointType, note) => {
            setCheckpoint({ runId, checkpoint: checkpointType, note });
            setCheckpointCollapsed(false);
          },
          onSynthesis: (runId, synthesis) => {
            upsertDeepRun(convId, runId, { query: text, synthesis });
          },
          onArtifact: (runId, dossier, lexicon, report, sources) => {
            setDeepArtifact(convId, runId, { dossier, lexicon, report, sources });
          },
        }
      );
    },
    [
      addMessage,
      appendToMessage,
      updateMessage,
      setTitle,
      setSummary,
      setStreaming,
      upsertDeepRun,
      setDeepArtifact,
    ]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      setError(null);
      lastQuestionRef.current = text;
      setCheckpoint(null);
      setCheckpointCollapsed(false);
      setPendingClarification(null);
      const selectedMode = mode;

      let convId = conversation?.id;
      if (!convId) {
        convId = createConversation();
      }

      // Add user message
      addMessage(convId, "user", text);

      if (selectedMode === "deep") {
        // First, scope the work with clarifying questions before kicking off.
        setLoadingPhase("searching");
        const { questions } = await clarifyResearch(text);
        setLoadingPhase(null);
        if (questions.length > 0) {
          setPendingClarification({ convId, query: text, questions });
          return;
        }
        // No questions returned: proceed straight to research.
        await runStream(convId, text, "deep");
        return;
      }

      await runStream(convId, text, "quick");
    },
    [conversation?.id, createConversation, addMessage, mode, runStream]
  );

  const submitClarifications = useCallback(
    async (answers: ClarificationAnswer[]) => {
      const pending = pendingClarification;
      if (!pending) return;
      setPendingClarification(null);
      await runStream(pending.convId, pending.query, "deep", answers);
    },
    [pendingClarification, runStream]
  );

  const cancelClarifications = useCallback(() => {
    setPendingClarification(null);
    setStreaming(false);
    setLoadingPhase(null);
  }, [setStreaming]);

  const handleCheckpointResume = async (checkpointType: "plan" | "synthesis") => {
    if (!checkpoint) return;
    await resumeResearch(checkpoint.runId, checkpointType);
    setCheckpoint(null);
  };

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
              Scribe
            </h1>
            <p className="text-text-secondary mb-8">
              Research Companion for Podcast Transcripts
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
        <InputBar
          onSend={sendMessage}
          mode={mode}
          onModeChange={setMode}
          disabled={isStreaming || !!pendingClarification}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-[720px] mx-auto">
          {activeDeepRun && <ResearchProgress run={activeDeepRun} />}
          <DossierView
            dossier={activeDeepRun?.dossier}
            lexicon={activeDeepRun?.lexicon}
            sources={activeDeepRun?.sources}
          />
          {conversation.messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isStreaming={
                msg.id === streamingMessageId && isStreaming
              }
            />
          ))}

          {pendingClarification && (
            <ClarificationForm
              questions={pendingClarification.questions}
              onSubmit={submitClarifications}
              onCancel={cancelClarifications}
            />
          )}

          {loadingPhase === "searching" && (
            <LoadingIndicator phase="searching" />
          )}

          {error && <ErrorBanner message={error} onRetry={handleRetry} />}
        </div>
      </div>

      {checkpoint && (
        <div className="bg-bg-primary border-t border-border px-4 py-3 shadow-[0_-8px_20px_rgba(0,0,0,0.04)]">
          <div className="max-w-[720px] mx-auto">
            <CheckpointPrompt
              runId={checkpoint.runId}
              checkpoint={checkpoint.checkpoint}
              note={checkpoint.note}
              collapsed={checkpointCollapsed}
              onToggleCollapsed={() =>
                setCheckpointCollapsed((collapsed) => !collapsed)
              }
              onResume={handleCheckpointResume}
            />
          </div>
        </div>
      )}

      {/* Input */}
      <InputBar
        onSend={sendMessage}
        mode={mode}
        onModeChange={setMode}
        disabled={isStreaming || !!pendingClarification}
      />

    </div>
  );
}
