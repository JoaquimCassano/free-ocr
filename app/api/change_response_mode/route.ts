import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: Request) {
  const { mode, content } = await request.json();

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const response = await client.responses.create({
    model: "gpt-5-nano",
    instructions:
      "Your role here is to receive an OCR response and rewrite the content based on the specified mode. As an example, if you receive a text extracted from an image of a receipt, and the mode is json, you should convert the text of the OCR into a json object with relevant fields like merchant name, total amount, date, and items purchased. Always return only the necessary rewritten content without any additional explanations or formatting. If the mode is ",
    input: `OCR Content: ${content}\nMode: ${mode}`,
  });

  return NextResponse.json({ text: response.output_text });
}
