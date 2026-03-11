"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plane, AlertTriangle, CheckCircle2, XCircle, Activity,
  Wind, Navigation2, Zap, MessageSquare, Send, X, Brain, Shield, BarChart2,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
type Question = {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  topic: string;
};

type HistoryEntry = {
  q: string | undefined;
  correct: boolean;
  selectedAnswer: string | null;
  correctAnswer: string;
  explanation: string;
};

type Session = {
  date: string;
  score: number;
  level: number;
  mistakes: HistoryEntry[];
};

type ChatMessage = { role: "user" | "assistant"; content: string };

// ── Main Component ─────────────────────────────────────────────────────────────
export default function QuizTerminal() {
  const [level, setLevel]             = useState(1);
  const [streak, setStreak]           = useState(0);
  const [score, setScore]             = useState(0);
  const [questionData, setQuestionData] = useState<Question | null>(null);
  const [nextQuestion, setNextQuestion] = useState<Question | null>(null); // prefetch
  const [loading, setLoading]         = useState(false);
  const [apiError, setApiError]       = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [feedbackMode, setFeedbackMode] = useState(false);
  const [history, setHistory]         = useState<HistoryEntry[]>([]);
  const [gameStatus, setGameStatus]   = useState<"intro" | "playing" | "completed">("intro");
  const [pastSessions, setPastSessions] = useState<Session[]>([]);
  const [showProfile, setShowProfile] = useState(false);
  const [showChat, setShowChat]       = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput]     = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load past sessions from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("quiz_sessions");
    if (saved) {
      try { setPastSessions(JSON.parse(saved)); }
      catch { /* silent */ }
    }
  }, []);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ── API Helpers ────────────────────────────────────────────────────────────
  const fetchQuestion = async (lvl: number, hist: HistoryEntry[]): Promise<Question | null> => {
    const res = await fetch("/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level: lvl, history: hist }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to generate question.");
    return data as Question;
  };

  const generateQuestion = async (currentLevel: number, currentHistory: HistoryEntry[]) => {
    setLoading(true);
    setApiError(null);
    setFeedbackMode(false);
    setSelectedAnswer(null);
    setNextQuestion(null);

    try {
      // If we have a pre-fetched question ready and it matches the level, use it instantly
      if (nextQuestion) {
        setQuestionData(nextQuestion);
        setNextQuestion(null);
        setLoading(false);
        // Start pre-fetching the next one in background
        fetchQuestion(currentLevel, currentHistory).then(setNextQuestion).catch(() => {});
        return;
      }

      const q = await fetchQuestion(currentLevel, currentHistory);
      setQuestionData(q);
    } catch (err: any) {
      setApiError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const startGame = () => {
    const freshHistory: HistoryEntry[] = [];
    setGameStatus("playing");
    setScore(0);
    setLevel(1);
    setStreak(0);
    setHistory(freshHistory);
    generateQuestion(1, freshHistory);
  };

  const handleSelectAnswer = (opt: string) => {
    if (feedbackMode || loading || !questionData) return;
    setSelectedAnswer(opt);
    setFeedbackMode(true);

    const isCorrect = opt === questionData.correctAnswer;
    const entry: HistoryEntry = {
      q: questionData.question,
      correct: isCorrect,
      selectedAnswer: opt,
      correctAnswer: questionData.correctAnswer,
      explanation: questionData.explanation,
    };
    const newHistory = [...history, entry];
    setHistory(newHistory);

    let newLevel = level;
    let newStreak = streak;

    if (isCorrect) {
      setScore((s) => s + level * 10);
      newStreak = streak > 0 ? streak + 1 : 1;
      if (newStreak >= 2 && level < 10) { newLevel = level + 1; newStreak = 0; }
    } else {
      newStreak = streak < 0 ? streak - 1 : -1;
      if (newStreak <= -2 && level > 1) { newLevel = level - 1; newStreak = 0; }
    }
    setStreak(newStreak);
    setLevel(newLevel);

    // Pre-fetch next question in background while user reads feedback
    fetchQuestion(newLevel, newHistory).then(setNextQuestion).catch(() => {});
  };

  const handleNext = () => {
    if (history.length >= 10) {
      finishGame();
    } else {
      generateQuestion(level, history);
    }
  };

  const finishGame = () => {
    const mistakes = history.filter((h) => !h.correct);
    const session: Session = {
      date: new Date().toLocaleString(),
      score,
      level,
      mistakes,
    };
    const updated = [session, ...pastSessions].slice(0, 10);
    setPastSessions(updated);
    localStorage.setItem("quiz_sessions", JSON.stringify(updated));
    setGameStatus("completed");
  };

  // ── Chat Handler ──────────────────────────────────────────────────────────
  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg: ChatMessage = { role: "user", content: chatInput };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      if (!res.ok) throw new Error("Chat failed.");
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      setChatMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          // Parse AI SDK data stream format
          const lines = chunk.split("\n").filter((l) => l.startsWith("0:"));
          for (const line of lines) {
            try {
              const text = JSON.parse(line.slice(2));
              assistantContent += text;
              setChatMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantContent };
                return updated;
              });
            } catch { /* skip parse errors */ }
          }
        }
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't connect right now. Check your API key." },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // ── Intro Screen ───────────────────────────────────────────────────────────
  if (gameStatus === "intro") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl mx-auto"
      >
        <div className="rounded-2xl border border-aviation-600/50 bg-aviation-800/80 backdrop-blur-xl shadow-2xl shadow-aviation-400/10 overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1 w-full bg-gradient-to-r from-aviation-400 via-fuchsia-500 to-aviation-400" />

          <div className="p-10">
            {/* Icon */}
            <div className="flex justify-center mb-8">
              <div className="p-5 bg-aviation-700/50 rounded-2xl border border-aviation-600/50 shadow-[0_0_40px_rgba(105,122,224,0.3)]">
                <Plane size={44} className="text-aviation-400" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-center text-3xl md:text-4xl font-black bg-gradient-to-r from-aviation-400 via-fuchsia-300 to-aviation-400 text-transparent bg-clip-text mb-3 tracking-tight">
              EASA Adaptive Intelligence Engine
            </h1>
            <p className="text-center text-slate-400 mb-8 text-sm leading-relaxed max-w-sm mx-auto">
              AI-powered aviation assessment designed to evaluate real decision-making ability through dynamic difficulty adaptation and cognitive performance analysis.
            </p>

            {/* Feature cards */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              {[
                { icon: <Brain size={16} />, label: "How It Works", items: ["Questions evolve based on your answers", "AI evaluates reasoning instantly", "Final proficiency level calculated"] },
                { icon: <Navigation2 size={16} />, label: "Assessment Scope", items: ["Navigation", "Meteorology", "EASA Dispatcher Logic"] },
              ].map((card, i) => (
                <div key={i} className="bg-aviation-900/50 border border-aviation-700/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-aviation-400 font-semibold text-xs uppercase tracking-widest mb-3">
                    {card.icon} {card.label}
                  </div>
                  <ul className="space-y-1.5">
                    {card.items.map((item, j) => (
                      <li key={j} className="text-slate-300 text-xs flex items-start gap-1.5">
                        <span className="text-fuchsia-400 mt-0.5 shrink-0">▸</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* AI Systems Active */}
            <div className="flex flex-wrap gap-2 justify-center mb-8">
              {["Adaptive Questioning", "Instant Feedback", "Performance Modeling", "Level Classification"].map((tag) => (
                <span key={tag} className="px-3 py-1 bg-aviation-700/40 border border-aviation-600/40 rounded-full text-xs text-aviation-400 font-mono">
                  ⚙ {tag}
                </span>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={startGame}
              className="w-full group relative py-4 bg-gradient-to-r from-aviation-600 to-fuchsia-600 hover:from-aviation-500 hover:to-fuchsia-500 transition-all rounded-xl font-bold text-white text-lg shadow-[0_0_30px_rgba(105,122,224,0.3)] hover:shadow-[0_0_50px_rgba(105,122,224,0.5)] overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full duration-700 transition-transform" />
              <span className="flex items-center justify-center gap-2">
                Start Adaptive Evaluation <Zap size={20} />
              </span>
            </button>

            {/* Professional footer */}
            <p className="text-center text-xs text-slate-600 mt-6 font-mono">
              Designed to simulate real-world dispatcher evaluation environments.
            </p>
          </div>

          {/* Past sessions quick stat */}
          {pastSessions.length > 0 && (
            <div
              className="border-t border-aviation-700/50 px-6 py-3 flex justify-between items-center text-xs font-mono text-slate-500 cursor-pointer hover:bg-aviation-700/20 transition-colors"
              onClick={() => setShowProfile(true)}
            >
              <span>📁 {pastSessions.length} evaluation session(s) on record</span>
              <span className="text-aviation-400">View Profile →</span>
            </div>
          )}
        </div>

        {/* Profile Modal */}
        <AnimatePresence>{showProfile && <ProfileModal sessions={pastSessions} onClose={() => setShowProfile(false)} />}</AnimatePresence>
      </motion.div>
    );
  }

  // ── Completed Screen ───────────────────────────────────────────────────────
  if (gameStatus === "completed") {
    const correct = history.filter((h) => h.correct).length;
    const accuracy = Math.round((correct / history.length) * 100);
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-2xl mx-auto rounded-2xl border border-aviation-600 bg-aviation-800/90 backdrop-blur-xl shadow-2xl overflow-hidden"
      >
        <div className="h-1 w-full bg-gradient-to-r from-radar-green via-aviation-400 to-fuchsia-400" />
        <div className="p-8 text-center">
          <CheckCircle2 size={56} className="mx-auto text-radar-green mb-4" />
          <h2 className="text-3xl font-bold text-white mb-1">Assessment Complete</h2>
          <p className="text-slate-400 text-sm mb-8">Your proficiency level has been classified.</p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: "Final Level", value: level, unit: "/ 10", color: "text-fuchsia-400" },
              { label: "Total Score", value: score, unit: "XP", color: "text-aviation-400" },
              { label: "Accuracy", value: `${accuracy}%`, unit: "", color: "text-radar-green" },
            ].map((s, i) => (
              <div key={i} className="bg-aviation-900/50 border border-aviation-700/50 rounded-xl p-4">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{s.label}</div>
                <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
                <div className="text-xs text-slate-600">{s.unit}</div>
              </div>
            ))}
          </div>

          {/* Mistakes Review */}
          {history.filter((h) => !h.correct).length > 0 && (
            <div className="text-left bg-aviation-900/50 border border-aviation-700 rounded-xl p-4 mb-6 max-h-48 overflow-y-auto">
              <h4 className="text-xs font-bold text-radar-red uppercase tracking-wider mb-3 flex items-center gap-1">
                <AlertTriangle size={12} /> Deviation Log — Questions to Review
              </h4>
              {history.filter((h) => !h.correct).map((h, i) => (
                <div key={i} className="mb-3 pb-3 border-b border-aviation-800 last:border-0">
                  <p className="text-xs text-slate-300 mb-1">{h.q}</p>
                  <p className="text-xs text-radar-red">Your answer: {h.selectedAnswer}</p>
                  <p className="text-xs text-radar-green">Correct: {h.correctAnswer}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <button onClick={startGame} className="px-6 py-3 bg-aviation-600 hover:bg-aviation-500 transition-colors rounded-lg font-bold text-white border border-aviation-400">
              Restart
            </button>
            <button onClick={() => setShowProfile(true)} className="px-6 py-3 bg-aviation-800 hover:bg-aviation-700 transition-colors rounded-lg font-bold text-slate-300 border border-aviation-600">
              View All History
            </button>
          </div>
        </div>
        <AnimatePresence>{showProfile && <ProfileModal sessions={pastSessions} onClose={() => setShowProfile(false)} />}</AnimatePresence>
      </motion.div>
    );
  }

  // ── Main Quiz Playing UI ────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-3xl mx-auto relative">

      {/* Profile button — top right */}
      <button
        onClick={() => setShowProfile(true)}
        title="View Profile"
        className="absolute -top-2 right-0 z-10 p-2.5 bg-aviation-800 hover:bg-aviation-700 transition-colors border border-aviation-600 rounded-xl text-aviation-400 hover:text-fuchsia-400"
      >
        <BarChart2 size={18} />
      </button>

      {/* HUD Header */}
      <div className="flex items-center justify-between mb-6 px-5 py-3.5 bg-aviation-800/70 backdrop-blur-md rounded-2xl border border-aviation-600/50 shadow-lg font-mono text-sm">
        <div className="flex items-center gap-2 text-aviation-400">
          <Activity size={16} className="animate-pulse" />
          <span className="uppercase tracking-widest text-xs font-bold">Lvl {level} / 10</span>
        </div>
        <div className="flex-1 max-w-[180px] h-1.5 bg-aviation-900 rounded-full mx-6 overflow-hidden border border-aviation-700">
          <motion.div
            className="h-full bg-gradient-to-r from-aviation-500 to-fuchsia-400"
            animate={{ width: `${(level / 10) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <span className="text-fuchsia-400 text-xs font-bold uppercase tracking-widest">Score: {score}</span>
      </div>

      {/* Error State */}
      {apiError && (
        <div className="mb-4 p-4 bg-radar-red/10 border border-radar-red/50 rounded-xl text-radar-red text-sm flex gap-3 items-start">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-bold mb-1">API Connection Error</p>
            <p className="text-xs opacity-80">{apiError}</p>
            {apiError.includes("API key") && (
              <p className="text-xs mt-1 opacity-70">→ Open <code className="bg-black/30 px-1 rounded">.env.local</code> and add your <strong>GOOGLE_GENERATIVE_AI_API_KEY</strong>.</p>
            )}
            <button onClick={() => { setApiError(null); generateQuestion(level, history); }} className="mt-2 px-3 py-1 bg-radar-red/20 hover:bg-radar-red/30 rounded text-xs font-bold">
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="h-[380px] flex flex-col items-center justify-center space-y-4">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-t-2 border-aviation-400 animate-spin" />
            <div className="absolute inset-2 rounded-full border-r-2 border-fuchsia-400 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
            <Plane className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-400" size={18} />
          </div>
          <p className="text-aviation-400 font-mono text-xs tracking-widest animate-pulse">
            GENERATING ADAPTIVE SCENARIO — LEVEL {level}
          </p>
        </div>
      )}

      {/* Question Card */}
      {!loading && !apiError && questionData && (
        <motion.div
          key={questionData.question}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-aviation-800/80 border border-aviation-600/50 rounded-2xl p-6 md:p-8 backdrop-blur-sm shadow-2xl"
        >
          {/* Topic badge + question count */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-aviation-900/60 py-1.5 px-3 rounded-full border border-aviation-700">
              {questionData.topic === "Navigation"
                ? <Navigation2 size={12} className="text-aviation-400" />
                : <Wind size={12} className="text-fuchsia-400" />}
              {questionData.topic.toUpperCase()}
            </div>
            <span className="text-xs font-mono text-slate-500">{history.length + 1} / 10</span>
          </div>

          <h2 className="text-lg md:text-xl font-semibold text-white mb-7 leading-relaxed">
            {questionData.question}
          </h2>

          {/* Options */}
          <div className="grid gap-3 mb-6">
            {questionData.options.map((opt, i) => {
              const isSelected   = selectedAnswer === opt;
              const isCorrectOpt = opt === questionData.correctAnswer;
              let cls = "bg-aviation-700/40 border-aviation-600/50 hover:bg-aviation-600/50 text-slate-200 cursor-pointer";
              if (feedbackMode) {
                if (isSelected && isCorrectOpt)   cls = "bg-radar-green/20 border-radar-green text-radar-green";
                else if (isSelected && !isCorrectOpt) cls = "bg-radar-red/20 border-radar-red text-radar-red";
                else if (!isSelected && isCorrectOpt) cls = "bg-radar-green/10 border-radar-green/50 text-radar-green/70";
                else cls = "bg-aviation-900/30 border-aviation-800 text-slate-600 opacity-50";
              }
              return (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0, transition: { delay: i * 0.08 } }}
                  disabled={feedbackMode}
                  onClick={() => handleSelectAnswer(opt)}
                  className={`text-left w-full p-4 rounded-xl border transition-all duration-200 flex items-center justify-between text-sm ${cls}`}
                >
                  <span>{opt}</span>
                  {feedbackMode && isSelected && isCorrectOpt && <CheckCircle2 size={18} className="text-radar-green shrink-0" />}
                  {feedbackMode && isSelected && !isCorrectOpt && <XCircle size={18} className="text-radar-red shrink-0" />}
                </motion.button>
              );
            })}
          </div>

          {/* Feedback */}
          <AnimatePresence>
            {feedbackMode && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="border-t border-aviation-700/50 pt-5">
                <div className={`p-4 rounded-xl flex gap-3 items-start mb-5 ${selectedAnswer === questionData.correctAnswer ? "bg-radar-green/10" : "bg-radar-red/10"}`}>
                  {selectedAnswer === questionData.correctAnswer
                    ? <CheckCircle2 className="text-radar-green shrink-0 mt-0.5" size={18} />
                    : <AlertTriangle className="text-radar-red shrink-0 mt-0.5" size={18} />}
                  <div>
                    <h4 className={`font-bold text-sm mb-1 ${selectedAnswer === questionData.correctAnswer ? "text-radar-green" : "text-radar-red"}`}>
                      {selectedAnswer === questionData.correctAnswer ? "System Match. Correct." : "Deviation Alert. Incorrect."}
                    </h4>
                    <p className="text-slate-300 text-sm leading-relaxed">{questionData.explanation}</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button onClick={handleNext} className="px-6 py-2.5 bg-aviation-500 hover:bg-aviation-400 transition-colors rounded-lg font-bold text-white text-sm shadow-lg">
                    Continue Sequence →
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Modals */}
      <AnimatePresence>{showProfile && <ProfileModal sessions={pastSessions} onClose={() => setShowProfile(false)} />}</AnimatePresence>

      {/* ARIA Chatbot — floating bottom right */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-80 md:w-96 bg-aviation-800 border border-aviation-600 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
              style={{ height: "420px" }}
            >
              {/* Chat header */}
              <div className="flex items-center justify-between p-4 bg-aviation-900/60 border-b border-aviation-700">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-radar-green rounded-full animate-pulse" />
                  <span className="font-bold text-sm text-aviation-400">ARIA</span>
                  <span className="text-xs text-slate-500">Dispatch Mentor</span>
                </div>
                <button onClick={() => setShowChat(false)} className="text-slate-500 hover:text-white"><X size={16} /></button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 && (
                  <div className="text-center text-slate-500 text-xs pt-6">
                    <Shield className="mx-auto mb-2 opacity-40" size={24} />
                    Ask ARIA about any EASA navigation or meteorology concept.
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] text-xs leading-relaxed rounded-xl p-3 ${msg.role === "user" ? "bg-aviation-600 text-white" : "bg-aviation-900/70 text-slate-300 border border-aviation-700"}`}>
                      {msg.content || <span className="animate-pulse">▋</span>}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-aviation-700 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChat()}
                  placeholder="Ask about Nav or Met..."
                  className="flex-1 bg-aviation-900/60 border border-aviation-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-aviation-400"
                />
                <button
                  onClick={sendChat}
                  disabled={chatLoading || !chatInput.trim()}
                  className="p-2 bg-aviation-600 hover:bg-aviation-500 disabled:opacity-40 transition-colors rounded-lg"
                >
                  <Send size={14} className="text-white" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setShowChat((v) => !v)}
          className="p-4 bg-gradient-to-br from-aviation-600 to-fuchsia-600 hover:from-aviation-500 hover:to-fuchsia-500 transition-all rounded-2xl shadow-2xl shadow-aviation-400/30 text-white"
          title="Ask ARIA — EASA Mentor"
        >
          <MessageSquare size={22} />
        </button>
      </div>
    </div>
  );
}

// ── Profile Modal Component ────────────────────────────────────────────────────
function ProfileModal({ sessions, onClose }: { sessions: Session[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-2xl bg-aviation-800 border border-aviation-600 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
      >
        <div className="p-5 border-b border-aviation-700 flex justify-between items-center bg-aviation-900/50">
          <h2 className="font-bold flex items-center gap-2 text-aviation-400">
            <BarChart2 size={18} /> Evaluation History
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">
          {sessions.length === 0 ? (
            <div className="text-center text-slate-500 py-12">
              <Plane className="mx-auto mb-3 opacity-30" size={28} />
              No sessions recorded yet.
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((s, i) => (
                <div key={i} className="bg-aviation-900/60 rounded-xl p-4 border border-aviation-700/50">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-mono text-slate-500">{s.date}</span>
                    <div className="flex gap-3 text-xs font-bold">
                      <span className="text-fuchsia-400">Level {s.level}</span>
                      <span className="text-aviation-400">{s.score} XP</span>
                    </div>
                  </div>
                  {s.mistakes.length > 0 ? (
                    <ul className="space-y-2">
                      {s.mistakes.map((m, j) => (
                        <li key={j} className="text-xs pl-3 border-l-2 border-radar-red/40 text-slate-400">
                          {m.q}
                          <span className="block text-radar-green text-xs">✓ {m.correctAnswer}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-radar-green flex items-center gap-1"><CheckCircle2 size={12} /> Flawless — no deviations.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
