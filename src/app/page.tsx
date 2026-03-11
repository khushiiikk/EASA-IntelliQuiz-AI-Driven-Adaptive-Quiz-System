import QuizTerminal from "@/components/QuizTerminal";

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-4">
      
      {/* Futuristic Background Elements */}
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-aviation-800 via-aviation-900 to-black">
        <div className="absolute top-[20%] left-[10%] w-72 h-72 bg-fuchsia-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse"></div>
        <div className="absolute bottom-[20%] right-[10%] w-96 h-96 bg-aviation-400/20 rounded-full blur-[150px] mix-blend-screen" style={{ animationDirection: 'reverse', animationDuration: '4s' }}></div>
        
        {/* Subtle grid lines spanning background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]"></div>
      </div>

      <QuizTerminal />
      
    </main>
  );
}
