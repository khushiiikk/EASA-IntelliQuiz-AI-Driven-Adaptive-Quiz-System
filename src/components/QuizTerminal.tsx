"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plane, AlertTriangle, CheckCircle2, XCircle, Activity, Bot,
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
      setScore(score + level * 10);
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
      const data = await res.json();
      setChatMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: data.text || "No response received." };
        return updated;
      });
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
        className="w-full max-w-6xl mx-auto md:px-4"
      >
        <div className="rounded-[2rem] border border-aviation-600/30 bg-aviation-800/60 backdrop-blur-2xl shadow-[0_0_50px_rgba(4,11,22,0.8)] overflow-hidden flex flex-col relative p-6 md:p-12 min-h-[600px]">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row items-center justify-between w-full mb-12 relative gap-6 md:gap-0 z-20">
            {/* Logo in left most corner */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="p-3 bg-aviation-700/50 rounded-xl border border-aviation-600/50 shadow-lg">
                <Plane size={24} className="text-aviation-400" />
              </div>
              <span className="text-white font-bold text-xl tracking-tight leading-none">EASA<br/><span className="text-aviation-400 text-xs tracking-widest uppercase">Engine</span></span>
            </div>
            
            {/* Title in central */}
            <div className="md:absolute md:left-1/2 md:-translate-x-1/2 flex items-center justify-center">
              <h1 className="text-center text-lg md:text-xl font-black text-white tracking-widest uppercase opacity-90">
                Adaptive Intelligence
              </h1>
            </div>
            
            {/* Profile Button - right corner */}
            <div className="w-full md:w-auto flex justify-end">
              {pastSessions.length > 0 ? (
                <button
                  className="text-xs font-mono text-slate-300 hover:text-white hover:bg-aviation-600/50 transition-colors border border-aviation-600/50 px-5 py-2.5 rounded-full flex items-center gap-2 bg-aviation-900/50"
                  onClick={() => setShowProfile(true)}
                >
                  <BarChart2 size={14} className="text-aviation-400" /> {pastSessions.length} Session{pastSessions.length > 1 ? "s" : ""}
                </button>
              ) : <div className="hidden md:block w-[120px]" />}
            </div>
          </div>

          {/* Body Content - Horizontal Layout */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12 flex-1 relative z-10 w-full mb-16">
            
            {/* Left Column - Text and CTA */}
            <div className="w-full lg:w-[45%] flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] md:text-xs text-slate-300 font-medium w-max mb-8 uppercase tracking-widest shadow-inner">
                <span className="text-aviation-400 shrink-0 font-bold">IN</span> Made for Aviators
              </div>
              
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 tracking-tight leading-[1.1]">
                Guiding <span className="text-transparent bg-clip-text bg-gradient-to-r from-aviation-400 to-white">Future</span> <br/> Professionals
              </h2>
              
              <p className="text-slate-400 mb-10 text-base md:text-lg leading-relaxed max-w-lg">
                Evaluate decision-making ability, master EASA protocols, and plan your aviation future through dynamic difficulty adaptation.
              </p>

              <div className="flex flex-wrap items-center gap-8">
                <button
                  onClick={startGame}
                  className="group relative px-8 py-4 bg-[#0a192f] border border-aviation-400/50 hover:bg-aviation-400 hover:text-[#040b16] hover:border-aviation-400 transition-all rounded-full font-bold text-white text-[15px] flex items-center gap-3 shadow-[0_0_20px_rgba(100,255,218,0.15)]"
                >
                  Start Journey <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>
                
                <button className="text-sm font-semibold text-slate-300 hover:text-aviation-400 flex items-center gap-2 transition-colors">
                  Explore Benefits <span>→</span>
                </button>
              </div>
            </div>

            {/* Right Column - Circular Illustration */}
            <div className="w-full lg:w-[50%] relative flex items-center justify-center min-h-[400px]">
              
              {/* Giant Background Circle (simulating FinPath aesthetic but themed for deep navy/cyan) */}
              <div className="absolute w-[350px] h-[350px] md:w-[450px] md:h-[450px] bg-gradient-to-br from-white to-slate-200 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden lg:right-[-10%] top-1/2 -translate-y-1/2">
                
                <div className="absolute w-full h-full bg-[radial-gradient(circle_at_center,rgba(100,255,218,0.1)_0,transparent_70%)]" />
                
                <Plane size={180} className="text-[#0a192f]/5 absolute -rotate-12" />
                
                {/* Embedded decorative boxes acting like the UI inside FinPath graphic */}
                <div className="absolute bottom-16 left-12 w-28 h-20 bg-white shadow-lg border border-slate-200 rounded-xl flex items-center justify-center">
                  <BarChart2 size={32} className="text-[#0a192f]" />
                </div>
                <div className="absolute top-20 right-16 w-20 h-20 bg-white shadow-xl border border-slate-200 rounded-full flex items-center justify-center">
                  <Shield size={32} className="text-[#0a192f]" />
                </div>
                
                {/* Central main hero object */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gradient-to-br from-[#0a192f] to-[#040b16] rounded-full flex items-center justify-center shadow-2xl border-4 border-white">
                   <Brain size={64} className="text-aviation-400" />
                </div>
              </div>

              {/* Floating interactive tags overlapping the big circle */}
              <motion.div 
                animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[10%] left-[5%] bg-white border border-slate-200 px-5 py-4 rounded-2xl shadow-2xl z-20 flex gap-4 text-[#0a192f] items-center"
              >
                <div className="p-2 bg-aviation-400/20 rounded-lg"><Activity size={20} className="text-aviation-400" /></div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Dynamic</div>
                  <div className="text-sm font-black">Level Scaling</div>
                </div>
              </motion.div>

              <motion.div 
                animate={{ y: [0, 8, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-[5%] right-[-5%] bg-white border border-slate-200 px-5 py-4 rounded-2xl shadow-2xl z-20 flex gap-4 text-[#0a192f] items-center"
              >
                <div className="p-2 bg-radar-green/20 rounded-lg"><CheckCircle2 size={20} className="text-radar-green" /></div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Compliance</div>
                  <div className="text-sm font-black">EASA Logic</div>
                </div>
              </motion.div>

            </div>
          </div>

          {/* Bottom simple feature cards (FinPath footer style) */}
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 relative z-20">
             {[
               { icon: <Activity size={24} />, title: "Track Proficiency", desc: "Monitor your levels across Navigation and Meteorology." },
               { icon: <Shield size={24} />, title: "Secure Evaluation", desc: "EASA-compliant questions generated instantly safely." },
               { icon: <Brain size={24} />, title: "Cognitive AI", desc: "AI adapts to your reasoning capability in real-time." },
             ].map((feat, i) => (
               <div key={i} className="bg-aviation-900/60 border border-aviation-700/50 backdrop-blur-md rounded-2xl p-6 flex flex-col gap-4 hover:border-aviation-400/50 transition-colors shadow-lg">
                 <div className="w-12 h-12 rounded-full bg-aviation-800 border border-aviation-600/50 flex items-center justify-center text-aviation-400 shadow-inner">
                   {feat.icon}
                 </div>
                 <div>
                   <div className="text-white font-bold text-base mb-1">{feat.title}</div>
                   <div className="text-xs text-slate-400">{feat.desc}</div>
                 </div>
               </div>
             ))}
          </div>

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
            className="h-full bg-gradient-to-r from-aviation-600 to-aviation-400"
            animate={{ width: `${(level / 10) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <div className="flex items-center gap-2 text-aviation-400 text-xs font-bold uppercase tracking-widest">
          <Bot size={16} /> {score}
        </div>
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
            <div className="absolute inset-0 rounded-full border-t-2 border-aviation-600 animate-spin" />
            <div className="absolute inset-2 rounded-full border-r-2 border-aviation-400 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
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
                : <Wind size={12} className="text-aviation-400" />}
              {questionData.topic.toUpperCase()}
            </div>
            <span className="text-xs font-mono text-slate-500">{history.length + 1} / 10</span>
          </div>

          <h2 className="text-lg md:text-xl font-semibold text-white mb-7 leading-relaxed">
            {questionData.question}
          </h2>

          {/* Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
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
                <div className="flex items-center gap-3">
                  <div className="relative w-8 h-8 rounded-full overflow-hidden border border-aviation-500 bg-aviation-800 flex items-center justify-center shrink-0">
                    <Bot size={18} className="text-aviation-400" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-aviation-400 block leading-tight">ARIA</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest">Dispatch Mentor</span>
                  </div>
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
          className="w-14 h-14 bg-gradient-to-br from-aviation-600 to-aviation-500 hover:from-aviation-500 hover:to-aviation-400 transition-all rounded-2xl shadow-2xl shadow-aviation-400/30 text-white flex items-center justify-center overflow-hidden border border-aviation-400/30"
          title="Ask ARIA — EASA Mentor"
        >
          <Bot size={28} className="text-white" />
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
