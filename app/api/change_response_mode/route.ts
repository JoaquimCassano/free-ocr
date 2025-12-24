import { NextResponse } from "next/server";
import OpenAI from "openai";
import { MODE_INSTRUCTIONS } from "@/lib/constants";

export async function POST(request: Request) {
  const { mode, content } = await request.json();

  const instruction = MODE_INSTRUCTIONS[mode as keyof typeof MODE_INSTRUCTIONS];

  if (!instruction) {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await client.responses.create({
    model: "gpt-5-nano",
    instructions: instruction,
    input: `OCR Content:\n${content}`,
  });

  return NextResponse.json({ text: response.output_text });
}
