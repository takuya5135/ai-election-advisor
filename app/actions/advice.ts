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

export async function generateVoteAdvice({
    userProfile,
    questions,
    answers,
    comments,
    electionContext,
    candidates = []
}: {
    userProfile: any;
    questions: any[];
    answers: any;
    comments?: any;
    electionContext: string;
    candidates?: any[];
}) {
    try {
        // Step 1: Gather knowledge about the election

        // Construct a prompt that includes all user data
        const userSummary = `
        ユーザープロフィール: ${JSON.stringify(userProfile)}
        
        回答した質問とスタンス (回答とコメント):
        ${questions.map((q: any, i: number) => {
            const comment = comments && comments[q.id] ? ` (コメント: ${comments[q.id]})` : "";
            return `Q${i + 1}: ${q.text} (カテゴリ: ${q.category}) -> 回答: ${answers[q.id]}${comment}`;
        }).join("\n")}
        `;

        const candidateSummary = candidates && candidates.length > 0
            ? candidates.map((c: any) =>
                `- ${c.name} (${c.party}): ${c.pledge || "公約情報なし"} (経歴: ${c.career || "不明"}, 年齢: ${c.age || "不明"})`
            ).join("\n")
            : "候補者情報が直接提供されていません。検索フェーズで補完してください。";

        // Use standard Flash model for initial context understanding
        const searchPrompt = `
        以下の選挙と候補者に関する最新の情勢、および各候補者の詳細な政策スタンス（特に経済、憲法、エネルギー、社会保障）を検索して整理してください。
        
        選挙名: ${electionContext}
        候補者リスト:
        ${candidateSummary}

        出力は、AIがアドバイスを生成するための「内部資料」として詳細に記述してください。
        `;

        const { text: detailedContext } = await generateText({
            // @ts-expect-error
            model: google(AI_MODELS.FLASH, { useSearchGrounding: true }),
            prompt: searchPrompt,
        });

        // Step 2: Generate Advice using Thinking Mode
        const advicePrompt = `
        あなたはプロフェッショナルな選挙アドバイザーです。
        ユーザーの価値観と、各候補者の政策・実態を深く分析し、最も投票すべき候補者（あるいは政党）を提案してください。

        【ユーザー情報】
        ${userSummary}

        【選挙・候補者情報の詳細分析（Grounding済み）】
        ${detailedContext}

        【タスク】
        1. ユーザーの回答傾向から、真に重視している価値観（本音）を分析してください。
        2. 各候補者の公約だけでなく、過去の実績や発言、所属政党の動向も含めて、ユーザーとの相性を「Deep Thinking」してください。
        3. 上位3名のマッチする候補者を選定し、論理的な理由とともに提示してください。
        4. 単なるマッチングだけでなく、その候補者を選ぶことの「リスク」や「懸念点」も公平に伝えてください。
        
        思考プロセスを重視し、表面的な一致だけでなく、政治姿勢の根本的な一致を見てください。
        `;

        const { object } = await generateObject({
            model: google(AI_MODELS.THINKING),
            schema: AdviceSchema,
            prompt: advicePrompt,
        });

        return { success: true, data: object };

    } catch (error) {
        console.error("Advice Generation Error:", error);
        return { success: false, error: "Failed to generate advice." };
    }
}
