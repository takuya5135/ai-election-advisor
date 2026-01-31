"use server";

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

// Detailed schema for deep analysis
const questionSchema = z.object({
    questions: z.array(z.object({
        id: z.string(),
        text: z.string(),
        category: z.string(),
        analysis: z.object({
            merit: z.string().describe("この政策を実行した際のメリット"),
            demerit: z.string().describe("この政策を実行した際のデメリット"),
            background: z.string().describe("この政策が政治課題になっている背景"),
            impact: z.object({
                global: z.string().describe("世界への影響"),
                national: z.string().describe("自国への影響"),
                social: z.string().describe("社会への影響"),
                economic: z.string().describe("経済への影響"),
                welfare: z.string().describe("福祉への影響"),
                dailyLife: z.string().describe("回答者の国民生活への具体的な影響"),
            }),
        }),
    })).min(5).max(15), // Initial batch size (adjustable)
});

// Helper for prompt construction
const getBasePrompt = (electionName: string, userProfile: any) => `
あなたは極めて高度で公平な政治・選挙アドバイザーです。
ユーザーが「${electionName}」において、自分の価値観に合った投票先を選ぶための、政治的スタンスを判定する質問を作成してください。

ユーザーのプロフィール:
${JSON.stringify(userProfile)}

【重要】質問の作成方針:
1. **政策の是非**: 具体的な政策の賛否（消費税、改憲、エネルギーなど）。
2. **根本的な政治姿勢**: 「大きな政府か小さな政府か」「自己責任か公助か」「伝統か革新か」といった根本的な価値観。
3. **国家・社会観**: 愛国心の度合い、国際協調と国益のバランス、社会への関わり方に対する個人の考え方。
4. **人生観**: 個人の自由と社会秩序のどちらを重視するかなど。

これらをバランスよく組み合わせ、ユーザーの深層心理や政治的DNAを浮き彫りにする質問にしてください。
`;

export async function generateElectionQuestions(electionName: string, userProfile: any) {
    try {
        const prompt = `
    ${getBasePrompt(electionName, userProfile)}

    タスク:
    上記の方針に基づき、**10問程度**の質問を作成してください。
    各質問には、ユーザーが判断するための材料として、以下の詳細な分析（analysis）を必ず付与してください。
    - メリット・デメリットの公平な分析
    - 政治課題となっている背景
    - 各分野（世界、自国、社会、経済、福祉、国民生活）への具体的な影響
    `;

        const { object } = await generateObject({
            model: google("gemini-1.5-flash"),
            schema: questionSchema,
            prompt: prompt,
        });

        return { success: true, data: object.questions };
    } catch (error) {
        console.error("AI Generation Error:", error);
        return { success: false, error: "AI Generation Failed" };
    }
}

export async function generateAdditionalQuestions(electionName: string, userProfile: any, previousQuestions: any[], previousAnswers: any) {
    try {
        const prompt = `
    ${getBasePrompt(electionName, userProfile)}

    現在の状況:
    ユーザーは既に以下の質問に回答しましたが、まだ判定には情報が不足している、あるいはユーザー自身がより深い分析を求めています。

    これまでの質問と回答:
    ${previousQuestions.map((q: any) => `- ${q.text} [${q.category}] -> 回答: ${previousAnswers[q.id]}`).join("\n")}

    タスク:
    ユーザーの政治的スタンスをより明確にするために、**追加で5問〜10問**の新しい質問を作成してください。
    これまで聞いていない視点（例えば、より抽象的な国家観や、具体的な外交政策の踏み込んだ内容など）を補完してください。
    詳細な分析（analysis）も同様に付与してください。
    `;

        const { object } = await generateObject({
            model: google("gemini-1.5-flash"),
            schema: questionSchema,
            prompt: prompt,
        });

        // Ensure IDs are unique by appending timestamp or random string if needed, 
        // but normally the AI generates fresh IDs. We'll handle key conflicts in frontend if any.
        return { success: true, data: object.questions };

    } catch (error) {
        console.error("Additional AI Generation Error:", error);
        return { success: false, error: "Additional AI Generation Failed" };
    }
}
