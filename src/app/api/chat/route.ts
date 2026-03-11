import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

// ARIA: Adaptive Real-time Instructor for Aviators
const tutorSystem = `You are ARIA (Adaptive Real-time Instructor for Aviators), an expert EASA Flight Dispatcher Mentor.
Help students understand aviation navigation and meteorology concepts.
Rules:
- Be concise, authoritative, and encouraging (3-5 sentences max per reply).
- NEVER give direct answers to quiz questions — give hints and explain underlying concepts only.
- Reference EASA regulations or ICAO standards where applicable.
- Plain text only, no markdown.`;

export async function POST(req: Request) {
  if (!process.env.GROQ_API_KEY) {
    return new Response("API key not configured. Add GROQ_API_KEY to .env.local", { status: 500 });
  }

  try {
    const { messages } = await req.json();
    const result = await generateText({
      model: groq("llama-3.1-8b-instant"),
      system: tutorSystem,
      messages,
    });
    return Response.json({ text: result.text });
  } catch (error: any) {
    console.error("[Chat API Error]:", error?.message || error);
    return new Response(error?.message || "Chat failed.", { status: 500 });
  }
}
