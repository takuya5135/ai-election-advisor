import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
        return NextResponse.json({
            error: "API Key is missing",
            envCheck: {
                GOOGLE_GENERATIVE_AI_API_KEY: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY
            }
        }, { status: 500 });
    }

    try {
        // Google Generative AI APIのmodels.listエンドポイントを叩く
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json({
                error: "Failed to fetch models from Google API",
                status: response.status,
                details: errorText
            }, { status: response.status });
        }

        const data = await response.json();

        // 見やすいように少し加工して返す
        const models = data.models?.map((m: any) => ({
            name: m.name,
            displayName: m.displayName,
            description: m.description,
            supportedGenerationMethods: m.supportedGenerationMethods
        })) || [];

        return NextResponse.json({
            count: models.length,
            models
        });

    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
