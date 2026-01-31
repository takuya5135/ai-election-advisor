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
    })).min(5).max(30), // Support both full sets and additional small sets
});

// Helper for prompt construction
const getBasePrompt = (electionName: string, userProfile: any) => `
    現在の日時は ${new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })} です。
    あなたは極めて高度で公平な政治・選挙アドバイザーです。
    ユーザーが「${electionName}」において、自分の価値観に合った投票先を選ぶための、政治的スタンスを判定する質問を作成してください。

    ユーザーのプロフィール:
    ${JSON.stringify(userProfile)}

    【最重要】質問の形式と作成方針:
    1. **形式**: 全ての質問は、ユーザーが「共感する」「共感しない」で明確に答えられる**「一つの肯定的な主張」または「具体的な提案」の形**で作成してください。
       - **禁止事項**: 「〜すべきか、それとも〜すべきか？」といった**二者択一形式の質問は絶対に避けてください**。どちらに共感しているか判断できなくなるためです。
       - **良い例**: 「物価高騰対策として、消費税率を時限的に5%に引き下げるべきだ。」
    2. **政策の是非**: 具体的な政策の賛否（消費税、改憲、エネルギーなど）。
    3. **根本的な政治姿勢**: 「大きな政府か小さな政府か」「自己責任か公助か」といった価値観を、一方の立場に立った主張（例：「社会保障を充実させるために、富裕層への課税を強化すべきだ」）として作成してください。
    4. **国家・社会観・人生観**: 同様に、一方の価値観を肯定する文章にしてください。

    これらをバランスよく組み合わせ、ユーザーの深層心理を「共感度」で浮き彫りにする質問にしてください。
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
            model: google("gemini-2.5-flash", { useSearchGrounding: true }),
            prompt: researchPrompt,
        });

        // Step 2: Generate Questions based on Context
        const prompt = `
    ${getBasePrompt(electionName, userProfile)}

    【選挙の具体的背景（主要な争点）】
    ${electionContext}

    タスク:
    上記の方針と**実際の争点**に基づき、**20問**の質問を作成してください。
    各質問には、必ず一意のID（例: q1, q2, q3...）を付与してください。
    一般的な政治観だけでなく、**「${electionName}」で実際に議論されている具体的な政策（例えば${electionContext.slice(0, 20)}...など）**についての賛否を問う質問を必ず含めてください。
    
    各質問には、ユーザーが判断するための材料として、以下の詳細な分析（analysis）を必ず付与してください。
    - メリット・デメリットの公平な分析
    - 政治課題となっている背景
    - 各分野（世界、自国、社会、経済、福祉、国民生活）への具体的な影響
    `;

        const { object } = await generateObject({
            model: google("gemini-2.5-flash"), // Schema generation using Flash
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
    ユーザーの政治的スタンスをより明確にするために、これまでの回答を踏まえた**新しい追加の質問を5問以上**作成してください。
    各質問には、以前の質問と重複しない一意のID（例: add_q1, add_q2...）を必ず付与してください。
    詳細な分析（analysis）も同様に付与してください。
    `;

        const { object } = await generateObject({
            model: google("gemini-2.5-flash"),
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

        // Step 1: Raw Research for National Elections
        const nationalPrompt = `
    現在の日時は ${today} です。
    日本国内で行われる直近の**国政選挙（衆議院議員総選挙、参議院議員通常選挙）**を調査してください。
    
    【最優先・厳守ソース】
    以下のURLを「ソースの真実」として最優先で参照し、情報を取得してください：
    1. https://go2senkyo.com/shugiin (衆院選)
    2. https://go2senkyo.com/sangiin (参院選)
    3. https://go2senkyo.com/schedule (全体スケジュール)
    
    【調査対象と期待される結果】
    - **第51回衆議院議員総選挙**: 上記ソースに従い、正確な「公示日」と「投開票日」を特定してください。
      - 注意：2026年2月8日が投開票日として記載されている可能性が高いです。他の日付（2月22日など）と混同しないでください。
    - **参議院議員通常選挙**: 直近の予定を特定してください。
    `;

        const { text: nationalResearch } = await generateText({
            // @ts-expect-error - search grounding
            model: google("gemini-2.5-flash", { useSearchGrounding: true }),
            prompt: nationalPrompt,
        });

        // Step 2: Raw Research for Local Elections
        const localPrompt = `
    現在の日時は ${today} です。
    居住地「${residence}」のユーザーに関係する「現在実施中」または「近い将来（半年〜1年以内）に予定されている」**地方選挙**を調査してください。
    
    【最優先・厳守ソース】
    1. https://go2senkyo.com/local
    2. https://go2senkyo.com/schedule
    上記ソースから「${residence}」に関連する選挙（知事、市長、区長、町長、村長、および各議会）を漏らさず取得してください。
    
    【調査対象】
    - 兵庫県西宮市などの具体的な自治体の選挙管理委員会サイトなども併せて参照してください。
    `;

        const { text: localResearch } = await generateText({
            // @ts-expect-error - search grounding
            model: google("gemini-2.5-flash", { useSearchGrounding: true }),
            prompt: localPrompt,
        });

        // Step 3: Cross-Verification and Structured Extraction
        const finalPrompt = `
    現在の日時は ${today} です。
    以下の調査資料に基づき、居住地「${residence}」のユーザーに関係する選挙を合計3〜5件、JSON形式で抽出してください。
    
    【国政選挙資料】
    ${nationalResearch}
    
    【地方選挙資料】
    ${localResearch}

    【重要ルール】
    1. **日付の優先順序**: 解散・公示・投票日が明記されている具体的な日付（例: 2月8日）を最優先してください。「未定」は可能な限り避け、報道された有力な日程を採用してください。
    2. **事実確認**: 第51回衆議院議員総選挙が2026年2月8日に行われるという情報がある場合は、必ずそれを含めてください。
    3. **出力形式**: schemaに従って正確に出力してください。
    `;

        const { object } = await generateObject({
            model: google("gemini-2.5-flash"),
            schema: electionSchema,
            prompt: finalPrompt,
        });

        return { success: true, data: object.elections };
    } catch (error) {
        console.error("Election Search Error:", error);
        return { success: false, error: "Election Search Failed" };
    }
}
