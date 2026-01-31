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
    })).min(5).max(25), // Support both full sets and additional small sets
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

        // Step 1: Raw Research with Search Grounding
        const researchPrompt = `
    現在の日時は ${today} です。
    居住地「${residence}」のユーザーに関係する「現在実施中」または「近い将来（半年〜1年以内）に予定されている」選挙を調査してください。
    
    【最優先事項：国政および地方選挙の網羅的調査】
    現在の日時（${today}）に基づき、居住地「${residence}」のユーザーが投票可能な全ての選挙を特定してください。
    
    1. **国政選挙**: 最も直近で行われる予定の衆院選・参院選。
    2. **地方選挙（市区町村レベルまで）**: 
       - ${residence}に関連する**都道府県・市区町村**の首長選挙（知事、市長、区長、町長、村長）。
       - ${residence}に関連する**議会選挙**（都道府県議会、市区町村議会）。
    
    【調査の心得（厳守事項）】
    - **信頼できるソースを最優先**: まず最初に「**選挙ドットコム (go2senkyo.com)**」、「**NHKの選挙特集ページ**」、「**各自治体の選挙管理委員会サイト**」を検索し、情報を取得してください。
    - **「未定」の回避**: 解散が報道されている場合や日程が有力視されている場合、「未定」で済ませず、報じられている日付（例: 2026年1月27日公示、2月8日投開票など）を**具体的**に拾い上げてください。
    - 既に終了した過去の選挙は除外してください。
    - 日程の確定度（確定、有力、あるいは任期満了による推定）を明確に区別しつつ、可能な限り具体的な日付を特定してください。
    `;

        const { text: rawResearch } = await generateText({
            // @ts-expect-error - search grounding
            model: google("gemini-2.5-flash", { useSearchGrounding: true }),
            prompt: researchPrompt,
        });

        // Step 2: Cross-Verification and Structured Extraction
        const finalPrompt = `
    現在の日時は ${today} です。
    以下の調査資料に基づき、居住地「${residence}」のユーザーにとって重要な選挙を3〜5件、JSON形式で抽出してください。

    【調査資料】
    ${rawResearch}

    【重要ルール】
    1. **日付のダブルチェック**: 調査資料の中で日付が食い違っている場合、より信頼できるソースを選択してください。
    2. **事実確認**: 2026年などの未来の日付については、ハルシネーション（嘘）を避け、必ず調査資料にある具体的な根拠に基づいた日付を入れてください。根拠がない場合は「未定」または「任期満了に基づく推定」であることを明記してください。
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
