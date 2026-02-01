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

        // 1. 選挙区と検索クエリの特定
        const queryGenerationPrompt = `
        以下のユーザー情報と選挙コンテキストに基づき、このユーザーが投票すべき**具体的な選挙区**を特定し、
        その選挙区の立候補者を検索するための **最適な検索クエリを3パターン** 生成してください。

        【ユーザー情報】
        ${JSON.stringify(userProfile)}

        【選挙コンテキスト】
        ${electionContext}
        (例: "衆議院選挙" -> 住所から "兵庫県第7区" などを特定。もし住所がなければ選挙名から主要な検索ワードを生成)

        【出力フォーマット】
        JSON形式で出力:
        {
            "district": "特定した選挙区名 (不明な場合は選挙名そのもの)",
            "queries": ["クエリ1", "クエリ2", "クエリ3"]
        }
        `;

        const { object: searchPlan } = await generateObject({
            model: google(AI_MODELS.FLASH),
            schema: z.object({
                district: z.string(),
                queries: z.array(z.string())
            }),
            prompt: queryGenerationPrompt,
        });

        console.log("Search Plan identified:", searchPlan);

        // 2. 候補者検索ループ (Retry Loop) - 最適化: 最大2回、検証APIコールなし
        let detailedContext = "";
        let candidateFound = false;
        let attempt = 0;
        const maxAttempts = 2; // タイムアウトを防ぐため最大2回に制限

        // 候補者リストが既に渡されている場合はそれを使う
        if (candidates && candidates.length > 0) {
            const candidateSummary = candidates.map((c: any) =>
                `- ${c.name} (${c.party}): ${c.pledge || "公約情報なし"} (経歴: ${c.career || "不明"}, 年齢: ${c.age || "不明"})`
            ).join("\n");
            detailedContext = `提供された候補者リスト:\n${candidateSummary}`;
            candidateFound = true;
        } else {
            console.log("Starting candidate search loop...");

            while (attempt < maxAttempts && !candidateFound) {
                attempt++;
                const currentQuery = searchPlan.queries[attempt - 1] || `${searchPlan.district} 立候補者`;
                console.log(`Attempt ${attempt}: Searching for "${currentQuery}"...`);

                const searchPrompt = `
                **重要ミッション (試行 ${attempt}/${maxAttempts})**: 
                検索クエリ「${currentQuery}」を用いて、**「${searchPlan.district}」**における**実際の立候補者（実在の人物）**を特定し、詳細情報をリストアップしてください。
                
                【必須要件】
                1. **実名（フルネーム）と政党**を必ず特定すること。「A氏」「現職」などの抽象表現は**不可**。
                2. もし ${searchPlan.district} の具体的な候補者名が見つからない場合は、**「NO_CANDIDATES_FOUND」**とだけ出力してください。
                3. **2024年〜2026年**の最新情報を優先すること。

                発見した候補者について、以下の情報をまとめてください：
                - 名前
                - 政党
                - 政策スタンス（経済、外交、憲法など）
                `;

                const { text: searchResult } = await generateText({
                    // @ts-expect-error
                    model: google(AI_MODELS.FLASH, { useSearchGrounding: true }),
                    prompt: searchPrompt,
                });

                // テキスト解析による簡易検証（APIコール節約）
                const isNotFound = searchResult.includes("NO_CANDIDATES_FOUND");
                const hasNames = searchResult.length > 50 && !isNotFound;

                console.log(`Attempt ${attempt} result length: ${searchResult.length}, Found: ${hasNames}`);

                if (hasNames) {
                    detailedContext = `選挙区: ${searchPlan.district}\n\n${searchResult}`;
                    candidateFound = true;
                } else {
                    console.warn(`Attempt ${attempt} failed: Candidates not found.`);
                }
            }

            if (!candidateFound) {
                // 最終手段: 候補者が見つからない場合は「党首対決」として情報を再取得
                console.warn("Local candidates not found. Falling back to Party Leader search.");

                const leaderSearchPrompt = `
                **緊急ミッション**: 特定の選挙区の候補者情報が不足しているため、代わりに**主要政党の党首**に関する情報を詳細に検索してください。
                
                【検索対象】
                1. 自由民主党 総裁（石破茂、小泉進次郎クラスの現職）
                2. 立憲民主党 代表（野田佳彦、枝野幸男クラスの現職）
                3. 日本維新の会 代表
                4. 国民民主党 代表
                5. その他主要政党（公明、共産、れいわ等）の党首
                
                【出力要件】
                - 各党首の**実名（フルネーム）**
                - 今回の選挙における**主要な主張・スタンス**（経済、安保、裏金問題への対応など）
                - 最近の発言
                `;

                const { text: leaderContext } = await generateText({
                    // @ts-expect-error
                    model: google(AI_MODELS.FLASH, { useSearchGrounding: true }),
                    prompt: leaderSearchPrompt,
                });

                detailedContext = `
                【注意】指定された選挙区（${searchPlan.district}）の具体的な候補者情報が十分に特定できませんでした。
                代わりに、各党の**党首（リーダー）**の政策とスタンスに基づいて、政党レベルでのマッチングとアドバイスを行います。
                
                ${leaderContext}
                `;
            }
        }

        // Step 2: Generate Advice using Thinking Mode
        const advicePrompt = `
        あなたはプロフェッショナルな選挙アドバイザーです。
        ユーザーの価値観と、各候補者の政策・実態を深く分析し、最も投票すべき候補者（あるいは政党）を提案してください。

        【ユーザー情報】
        ${userSummary}

        【特定された選挙区・候補者情勢】
        選挙区: ${searchPlan.district}
        発見された情報:
        ${detailedContext}

        【タスク】
        1. ユーザーの回答傾向から、真に重視している価値観（本音）を分析してください。
        2. 上記の【特定された選挙区・候補者情勢】にある**実在の候補者**について、ユーザーとの相性を「Deep Thinking」してください。
        3. 上位3名のマッチする候補者を選定し、論理的な理由とともに提示してください。
        
        **【絶対遵守事項】**
        - **必ず実名（フルネーム）と政党名を使用してください。**
        - 「A氏」「B氏」などの仮名や、「与党候補」といった抽象的な表現は**禁止**です。
        - もし候補者名が特定できていない場合は、正直に「候補者名が特定できませんでしたが、政党のマッチ度として」と前置きして、**実在する政党名**でアドバイスしてください。

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
