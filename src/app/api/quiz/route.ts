import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { z } from "zod";
import { NextResponse } from "next/server";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

// System prompt: Strict EASA question generator with validated JSON output
const systemPrompt = `You are an expert EASA Flight Dispatcher instructor generating multiple-choice exam questions.
Topics: Aviation Navigation and Aviation Meteorology, under the EASA FCL.055 / ATPL dispatcher syllabus.

Rules:
1. Match difficulty to the requested level (Level 1 = basic definitions, Level 10 = complex multi-variable scenarios).
2. Provide exactly four options labeled as plain text (no A/B/C/D prefix needed).
3. correctAnswer MUST be the EXACT text of one of the four options.
4. Explanation should be max 2 educational sentences.
5. Levels 1-3: factual definitions. Levels 4-7: calculations or rule application. Levels 8-10: complex scenario-based.`;

const questionSchema = z.object({
  question: z.string().describe("The full text of the question."),
  options: z.array(z.string()).length(4).describe("Exactly 4 answer options."),
  correctAnswer: z.string().describe("The exact text of the correct option — must match one from options array."),
  explanation: z.string().describe("A concise 1-2 sentence educational explanation."),
  topic: z.enum(["Navigation", "Meteorology"]),
});

export async function POST(req: Request) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: "API key missing. Add GROQ_API_KEY to .env.local" },
      { status: 500 }
    );
  }

  try {
    const { level, history } = await req.json();
    const topic = Math.random() > 0.5 ? "Aviation Navigation" : "Aviation Meteorology";
    const recentContext = history?.length > 0
      ? `Avoid repeating these recent topics: ${JSON.stringify(history.slice(-3).map((h: any) => h.q))}`
      : "No prior history.";

    const result = await generateText({
      model: groq("llama-3.1-8b-instant"),
      system: systemPrompt,
      prompt: `Generate ONE question at Level ${level}/10.
Topic focus: ${topic}.
${recentContext}

OUTPUT FORMAT INSTRUCTIONS:
You must respond with ONLY a valid, minified JSON object matching this exact schema:
{
  "question": "string",
  "options": ["string", "string", "string", "string"],
  "correctAnswer": "string",
  "explanation": "string",
  "topic": "Navigation" | "Meteorology"
}
Do not include markdown tags (\`\`\`json) or any outside text.`,
    });

    // Extract JSON if the model wraps it in markdown by mistake
    let rawText = result.text.trim();
    if (rawText.startsWith("```json")) rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    if (rawText.startsWith("```")) rawText = rawText.replace(/```/g, "").trim();

    try {
      const parsed = JSON.parse(rawText);
      const validated = questionSchema.parse(parsed);
      return NextResponse.json(validated);
    } catch (parseError) {
      console.error("JSON Parse Error on:", rawText);
      throw new Error("Failed to parse AI JSON output");
    }

  } catch (error: any) {
    console.error("[Quiz API Error]:", error?.message || error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate question." },
      { status: 500 }
    );
  }
}
