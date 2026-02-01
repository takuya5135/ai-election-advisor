import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const queryKey = searchParams.get("key");
    const apiKey = queryKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        return NextResponse.json({ error: "API Key not found. Please set env var or pass ?key=YOUR_KEY" }, { status: 400 });
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        // 思考モデル（Thinking）を含んでいるか確認しやすいように整形
        const models = data.models || [];
        const thinkingModels = models.filter((m: any) =>
            m.name.includes("thinking") || m.name.includes("preview") || m.name.includes("exp")
        );

        return NextResponse.json({
            count: models.length,
            thinking_related: thinkingModels.map((m: any) => m.name),
            all_models: models.map((m: any) => m.name),
            raw_data: data
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
