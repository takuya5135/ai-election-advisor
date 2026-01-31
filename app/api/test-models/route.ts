import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
        return NextResponse.json({ error: "API Key not set" }, { status: 500 });
    }

    try {
        // Google AI Studio (Generative Language API) endpoint to list models
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json({
                error: "Failed to fetch models",
                details: data
            }, { status: response.status });
        }

        // Filter to only show "generateContent" supported models for clarity
        const chatModels = data.models?.filter((m: any) =>
            m.supportedGenerationMethods?.includes("generateContent")
        ).map((m: any) => m.name);

        return NextResponse.json({
            message: "API Key is valid. Here are your available models:",
            available_models: chatModels || data.models
        });

    } catch (error) {
        return NextResponse.json({
            error: "Network or Server Error",
            details: String(error)
        }, { status: 500 });
    }
}
