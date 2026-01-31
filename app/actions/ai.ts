"use server";

import { generateObject, generateText } from "ai";
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
                culture: z.string().describe("文化への影響"),
                dailyLife: z.string().describe("回答者の国民生活への具体的な影響"),
            }),
        }),
    })).min(15).max(25), // Increased batch size to 20
});

// Helper for prompt construction
const getBasePrompt = (electionName: string, userProfile: any) => `
    現在の日時は ${new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })} です。
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
        // Step 1: Research the election context
        // Enable search grounding to get the latest implementation details
        const researchPrompt = `
        現在の日時は ${new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })} です。
        あなたは${electionName}のエキスパートです。
        以下の情報を、Google検索等の信頼できるソースから検索し、具体的にリストアップしてください。

        1. **主要な争点**: 今この選挙で問われている具体的な政策課題（例: 物価高対策、社会保険料、外交安保など）。
        2. **候補者・政党の対立軸**: どの候補/政党が何と言って対立しているか。
        `;

        const { text: electionContext } = await generateText({
            // @ts-expect-error - The installed version's types might not support the settings object yet, but runtime should.
            model: google("gemini-2.0-flash", { useSearchGrounding: true }),
            prompt: researchPrompt,
        });

        // Step 2: Generate Questions based on Context
        const prompt = `
    ${getBasePrompt(electionName, userProfile)}

    【選挙の具体的背景（主要な争点）】
    ${electionContext}

    タスク:
    上記の方針と**実際の争点**に基づき、**20問**の質問を作成してください。
    一般的な政治観だけでなく、**「${electionName}」で実際に議論されている具体的な政策（例えば${electionContext.slice(0, 20)}...など）**についての賛否を問う質問を必ず含めてください。
    
    各質問には、ユーザーが判断するための材料として、以下の詳細な分析（analysis）を必ず付与してください。
    - メリット・デメリットの公平な分析
    - 政治課題となっている背景
    - 各分野（世界、自国、社会、経済、福祉、国民生活）への具体的な影響
    `;

        const { object } = await generateObject({
            model: google("gemini-2.0-flash"), // Schema generation using Flash
            schema: questionSchema,
            prompt: prompt,
        });

        return { success: true, data: object.questions };
    } catch (error) {
        console.error("AI Generation Error:", error);
        return { success: false, error: "AI Generation Failed" };
    }
}

export async function generateAdditionalQuestions(electionName: string, userProfile: any, previousQuestions: any[], previousAnswers: any, previousComments: any) {
    try {
        const prompt = `
    ${getBasePrompt(electionName, userProfile)}

    現在の状況:
    ユーザーは既に以下の質問に回答しました。ここでユーザーが「分からない」と答えたり、コメントで特定の関心を示している場合は、そこを深掘りしてください。

    これまでの質問と回答・コメント:
    ${previousQuestions.map((q: any) => `- ${q.text} [${q.category}] -> 回答: ${previousAnswers[q.id]} ${previousComments[q.id] ? `(コメント: ${previousComments[q.id]})` : ""}`).join("\n")}

    タスク:
    ユーザーの政治的スタンスをより明確にするために、**追加で5問〜10問**の新しい質問を作成してください。
    これまで聞いていない視点（例えば、より抽象的な国家観や、具体的な外交政策の踏み込んだ内容など）を補完してください。
    詳細な分析（analysis）も同様に付与してください。
    `;

        const { object } = await generateObject({
            model: google("gemini-2.0-flash"),
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

// Schema for finding elections
const electionSchema = z.object({
    elections: z.array(z.object({
        id: z.string(),
        name: z.string().describe("選挙の正式名称"),
        officialDate: z.string().describe("公示日または告示日（例: 2024年10月15日、または「未定」）"),
        voteDate: z.string().describe("投票日・開票日（例: 2024年10月27日、または「任期満了日: 2025年X月X日」）"),
        description: z.string().describe("選挙の概要（何を決める選挙か）"),
        level: z.enum(["national", "local"]).describe("国政選挙か地方選挙か"),
    })).min(1).max(5),
});

export async function findElections(residence: string) {
    try {
        const today = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
        const prompt = `
    現在の日時は ${today} です。
    あなたは日本の選挙制度により詳しいエキスパートです。
    ユーザーの居住地「${residence}」に関連する、現在行われている、あるいは近い将来（1年以内）予定されている主要な選挙を3〜5件リストアップしてください。

    **【最重要】日付の特定について:**
    - 今が2026年であれば、**「第51回衆議院議員総選挙」**が実施される可能性が高いです。
    - 必ず**「第51回衆議院議員総選挙 公示日 投票日」**などで検索を行い、正確な日付（例: 2026年1月28日公示、2月8日投開票など）を特定してください。
    - すでに公示されている、あるいは日程が報道されている場合、「未定」と答えることは**禁止**です。
    - 地方選挙についても、自治体の選挙管理委員会サイトにある情報を検索して正確な日付を入れてください。

    条件:
    1. **日付の正確性**: 公示日（告示日）と投票日を「YYYY年M月D日」の形式で正確に特定する。
    2. 対象: その地域で投票権があるもの（国政・都道府県・市区町村）。
    3. 項目:
       - name: 正式名称（例: 第51回衆議院議員総選挙、〇〇市長選挙）
       - officialDate: 公示日/告示日
       - voteDate: 投票日
    `;

        const { object } = await generateObject({
            // @ts-expect-error - search grounding
            model: google("gemini-2.0-flash", { useSearchGrounding: true }),
            schema: electionSchema,
            prompt: prompt,
        });

        return { success: true, data: object.elections };
    } catch (error) {
        console.error("Election Search Error:", error);
        return { success: false, error: "Election Search Failed" };
    }
}
