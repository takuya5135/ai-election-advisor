"use server";

import { generateText } from "ai";
import { google } from "@ai-sdk/google";
// --- AI Advice ---

export async function generateVoteAdvice(electionName: string, userProfile: any, questions: any[], answers: any, comments: any) {
    try {
        // Step 1: Gather knowledge about the election (Simulating "Search" using Gemini's knowledge)
        // Since we can't browse, we ask Gemini to be the expert.
        const researchPrompt = `
        あなたは${electionName}に関するエキスパートです。
        以下の情報を、あなたの知識ベースから検索して、正確かつ具体的にリストアップしてください。
        
        1. **主な候補者・政党**: 名前、所属、主要な公約（キャッチフレーズレベルではなく具体的な政策）。
        2. **選挙情勢**: 最新の支持率傾向や、いわゆる「当落線上の争い」などの情勢（もし情報があれば。なければ一般論で構いません）。
        3. **日程**: 投票日、開票日。
        `;

        const { text: electionContext } = await generateText({
            model: google("gemini-2.0-flash"),
            prompt: researchPrompt,
        });

        // Step 2: Generate Advice based on Context + User Data
        const prompt = `
    あなたは非常に戦略的で具体的な選挙アドバイザーです。
    
    【選挙データ（前提知識）】
    ${electionContext}
    
    【ユーザー情報】
    属性: ${JSON.stringify(userProfile)}
    
    【ユーザーの回答・コメント】
    ${questions.map((q: any) => `- ${q.text} [${q.category}]
      回答: ${answers[q.id]}
      コメント: ${comments[q.id] || "なし"}`).join("\n")}
    
    ---
    
    タスク:
    以下の構成で、ユーザーに最適な投票行動をアドバイスしてください。
    
    ## 1. あなたの政治スタンス（要約）
    ユーザーの立ち位置を「中道実利主義」「リベラル革新派」「保守安定重視」のように**一言（20文字以内）**で既存の政治用語を使って端的に表現してください。長々とした分析は不要です。
    
    ## 2. あなたと親和性の高い候補者・政党
    **具体的な候補者名（個人の場合）または政党名**を2〜3つ挙げてください。
    抽象的な「タイプ」ではなく、実在する名前を出してください。
    それぞれの親和性が高い理由を、ユーザーの回答（特にコメント部分）と候補者の公約を照らし合わせて説明してください。
    
    ## 3. この一票がもたらす変化（社会的インパクト）
    このユーザーが推奨候補に投票することで、社会や政治に具体的にどのような貢献ができるか（例：「〇〇政策の推進を後押しする」「現職の〇〇な運営に牽制球を投げる」など）を記述してください。
    
    ## 4. 戦略的アドバイス（死票を避けるために）
    現在の情勢（${electionName}の一般的な情勢）を踏まえ、
    「もし本命の〇〇候補が苦戦している場合、次善の策として〇〇候補に入れる戦略もある」
    「死票を恐れずに信念を貫くべき局面である」
    など、現実的なパワーバランス（与野党伯仲など）を考慮したアドバイスをしてください。
    
    出力形式はMarkdownで見やすく構造化してください。
    `;

        const { text } = await generateText({
            model: google("gemini-2.0-flash"),
            prompt: prompt,
        });

        return { success: true, advice: text };
    } catch (error) {
        console.error("Advice Generation Error:", error);
        return { success: false, error: "Advice generation failed." };
    }
}
