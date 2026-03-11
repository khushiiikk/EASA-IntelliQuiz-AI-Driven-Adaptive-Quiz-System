import QuizTerminal from "@/components/QuizTerminal";

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-4">
      
      {/* Futuristic Background Elements */}
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden -z-10 bg-[#040b16]">
        {/* Subtly glowing accent in the distance */}
        <div className="absolute top-[-10%] right-[-10%] w-[800px] h-[800px] bg-aviation-600/10 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-aviation-400/5 rounded-full blur-[150px] mix-blend-screen" />
        
        {/* Deep grid lines for a technical feel */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_70%,transparent_100%)]"></div>
      </div>

      <QuizTerminal />
      
    </main>
  );
}
