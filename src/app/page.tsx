import QuizTerminal from "@/components/QuizTerminal";

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-4">
      
      {/* Tech background: motion grid, orbs, radar, particles */}
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden -z-10 bg-[#040b16]">
        {/* Animated glow orbs */}
        <div className="absolute top-[-10%] right-[-10%] w-[800px] h-[800px] bg-aviation-600/10 rounded-full blur-[120px] mix-blend-screen animate-pulse-glow" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-aviation-400/5 rounded-full blur-[150px] mix-blend-screen animate-pulse-glow" style={{ animationDelay: "1.5s" }} />

        {/* Moving grid */}
        <div
          className="absolute inset-0 bg-[length:60px_60px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_70%,transparent_100%)] animate-grid-drift"
          style={{
            backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
          }}
        />

        {/* Radar sweep */}
        <div className="absolute inset-0 flex items-center justify-center [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,#000_40%,transparent_70%)]">
          <div
            className="w-[min(100vmax,140vw)] h-[min(100vmax,140vw)] animate-radar-sweep"
            style={{
              background: "conic-gradient(from 0deg, transparent 0deg, rgba(100,255,218,0.03) 30deg, transparent 60deg)",
            }}
          />
        </div>

        {/* Floating tech particles */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-aviation-400/30 animate-dot-float"
            style={{
              width: 4 + (i % 3),
              height: 4 + (i % 3),
              left: `${10 + (i * 7) % 80}%`,
              top: `${15 + (i * 11) % 70}%`,
              animationDelay: `${i * 0.4}s`,
              animationDuration: `${5 + (i % 4)}s`,
            }}
          />
        ))}

        {/* Subtle scan line */}
        <div
          className="absolute inset-0 overflow-hidden opacity-[0.03]"
          aria-hidden="true"
        >
          <div
            className="h-[2px] w-full bg-gradient-to-r from-transparent via-aviation-400 to-transparent animate-scanline"
            style={{ boxShadow: "0 0 20px 2px rgba(100,255,218,0.3)" }}
          />
        </div>
      </div>

      <QuizTerminal />
      
    </main>
  );
}
