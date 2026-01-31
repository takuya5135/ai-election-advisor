"use server";

import { generateText } from "ai";
import { google } from "@ai-sdk/google";
// --- AI Advice ---

export async function generateVoteAdvice(electionName: string, userProfile: any, questions: any[], answers: any) {
    try {
        const prompt = `
    あなたは公平な選挙アドバイザーです。
    ユーザーは「${electionName}」に関心を持っています。
    
    ユーザーの属性:
    ${JSON.stringify(userProfile)}
    
    ユーザーの回答:
    ${questions.map((q: any) => `- ${q.text} [カテゴリ: ${q.category}] -> 回答: ${answers[q.id]}`).join("\n")}
    
    タスク:
    1. ユーザーの政治的スタンスを分析してください（例: リベラル寄り、保守寄り、経済重視、など）。
    2. この選挙における主要な争点を踏まえ、どのような候補者や政党が適している可能性があるか、具体的な名前は挙げずに「タイプ」として提案してください。（例: 「財政出動を重視する候補者」「環境政策を優先する政党」など）
       ※ 特定の個人名を推奨することは避けてください（公職選挙法への配慮のため、あくまで政策ベースのマッチングとします）。
    3. 死票を避けるためのアドバイスも含めてください。
    4. 最後に、投票に向けた心構えや、一票の重みについてのポジティブなメッセージを添えてください。

    出力形式はMarkdownで見やすく構造化してください。
    `;

        const { text } = await generateText({
            model: google("gemini-1.5-flash-001"),
            prompt: prompt,
        });

        return { success: true, advice: text };
    } catch (error) {
        console.error("Advice Generation Error:", error);
        return { success: false, error: "Advice generation failed." };
    }
}
