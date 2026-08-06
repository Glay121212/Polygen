import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const systemInstruction = `You are a 3D modeling script. Your task is to generate a low-poly Wavefront .obj file representing the object the user asks for.
The output MUST be ONLY the raw .obj file content. Do not include markdown code blocks, do not include explanations, do not include anything other than the valid .obj format text.
Keep the geometry relatively simple (under 500 vertices) but structurally recognizable as the requested object.
Ensure normals and faces are correctly defined so it renders properly in a 3D viewer. Use standard coordinates.`;

    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Generate a 3D model in OBJ format for: ${prompt}`,
        config: {
          systemInstruction,
        }
      });
    } catch (primaryErr) {
      console.warn("gemini-2.5-flash failed, trying fallback model...", primaryErr);
      response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: `Generate a 3D model in OBJ format for: ${prompt}`,
        config: {
          systemInstruction,
        }
      });
    }

    let objContent = response.text || "";
    
    // Clean up if the model wrapped it in markdown
    objContent = objContent.replace(/^```(obj|)\n/gi, '').replace(/\n```$/g, '').trim();

    return NextResponse.json({ obj: objContent });
  } catch (error: any) {
    console.error("Error generating 3D model:", error);
    const message = error?.message || "Failed to generate 3D model";
    return NextResponse.json({ error: message.includes("429") || message.includes("quota") ? "Rate limit reached. Please wait a moment and try again." : message }, { status: 500 });
  }
}
