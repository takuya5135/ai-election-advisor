"use server";

import { generateText, generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { AI_MODELS } from "@/app/lib/models";

const AdviceSchema = z.object({
    policyAnalysis: z.object({
        alignment: z.number().min(0).max(100),
        keyMatches: z.array(z.string()),
        keyDifferences: z.array(z.string())
    }),
    candidateMatches: z.array(z.object({
        candidateId: z.string(),
        candidateName: z.string(),
        party: z.string(),
        matchScore: z.number().min(0).max(100),
        reason: z.string().describe("なぜこの候補者がマッチするのか、具体的な政策や実績を挙げて200文字以下で簡潔に説明"),
        compatibility: z.object({
            economic: z.string().describe("経済政策の相性"),
            social: z.string().describe("社会政策の相性"),
            style: z.string().describe("政治スタイルの相性"),
        }),
        risks: z.string().describe("この候補者を選ぶ際のリスクや注意点（あれば）。なければ空欄でOK。")
    })),
    overallAdvice: z.string().describe("ユーザーへの総合的なアドバイスと、投票の際に重視すべき視点（300文字以内）"),
    thinkingProcess: z.string().describe("なぜこのような結果になったのか、AIの思考プロセス（Deep Thinking）の要約").optional()
});

export async function generateAdvice(
    userProfile: any,
    questions: any[],
    answers: any,
    electionContext: string,
    candidates: any[]
) {
    try {
        // Step 1: Gather knowledge about the election (Simulating "Search" using Gemini's knowledge)
        2. ** 事実に基づく断定 **: 候補者が確定しているため、具体的な名前と公約に基づき、事実としてアドバイスを構成してください。
    
    ## 1. あなたの政治スタンス（要約）
        ユーザーの立ち位置を「中道実利主義」「リベラル革新派」のように ** 20文字以内 ** で端的に表現してください。
        現政権への部門別評価（特に支持 / 非支持が顕著な分野）も反映させてください。
    
    ## 2. 推奨する投票先（結論）
    ### 【選挙区 / 首長選】（人物への投票）
    - ** 推奨候補者 **: [氏名]（[政党]）
    - ** 理由 **: ユーザーの[具体的な政策回答]や[政権の特定部門（経済等）への評価]と、候補者の[具体的な公約・実績・政権への立ち位置]が合致するため。
    
    ### 【比例代表 / 議会選】（政党への投票）
    ※国政選挙や、政党を選ぶ選挙の場合のみ記載。
    - ** 推奨政党 **: [政党名]
            - ** 理由 **: 政党の[政治理念・実績・与野党の立場]が、ユーザーの[重視する価値観]および[部門別の政権支持傾向]と一致するため。
    
    ## 3. この一票がもたらす変化（社会的インパクト）
        推奨候補・政党への投票が、社会にどのような具体的な変化をもたらすか記述してください。
    
    ## 4. 戦略的アドバイス
        情勢（${ electionName } の勝敗ラインなど）を踏まえ、死票を避けるための次善の策や、戦略的な投票行動について助言してください。
    
    ## 5. 参考情報：候補者・政党の詳細データ
        今回分析の対象とした主な候補者・政党の情報を提示します。
    
    ###[選挙区の主な候補者]
    （候補者ごとに以下を記載）
    - ** 氏名 **: [氏名]
            - ** 公約 **: [具体的な公約]
                - ** 公式サイト **: [公式サイト・SNS](URL) （※必ずMarkdownリンク形式で、実際のURLを入れてください。見つからない場合はリンクなしのURLテキストまたは「なし」と記載）
    
    ###[主要政党の情報]
    （政党ごとに以下を記載）
    - ** 政党名 **: [名称]
            - ** 理念・政策 **: [理念や重要政策]
                - ** 公式サイト **: [公式サイト](URL) （※必ずMarkdownリンク形式で、実際のURLを入れてください）
        `;

        const { text } = await generateText({
            model: google("gemini-3-pro-preview"),
            prompt: prompt,
        });

        return { success: true, advice: text };
    } catch (error) {
        console.error("Advice Generation Error:", error);
        return { success: false, error: "Advice generation failed." };
    }
}
