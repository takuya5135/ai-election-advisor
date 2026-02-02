"use server";

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { AI_MODELS } from "@/app/lib/models";
import fs from 'fs/promises';
import path from 'path';

const AdviceSchema = z.object({
    policyAnalysis: z.object({
        alignment: z.number().min(0).max(100),
        keyMatches: z.array(z.string()),
        keyDifferences: z.array(z.string())
    }),
    candidateMatches: z.array(z.object({
        rank: z.number().min(1).max(3).describe("推奨順位 (1位〜3位)"),
        candidateId: z.string(),
        candidateName: z.string(),
        party: z.string(),
        matchScore: z.number().min(0).max(100),
        reason: z.string().describe("その順位になった理由。1位は強く推奨する理由、2位・3位は次点としてのメリットや、1位との違いを説明。"),
        compatibility: z.object({
            economic: z.string().describe("経済政策の相性"),
            social: z.string().describe("社会政策の相性"),
            style: z.string().describe("政治スタイルの相性"),
        }),
        risks: z.string().describe("この候補者を選ぶ際のリスクや注意点（あれば）。なければ空欄でOK。")
    })),
    proportionalAdvice: z.array(z.object({
        rank: z.number().min(1).max(3).describe("推奨順位 (1位〜3位)"),
        partyName: z.string().describe("比例代表で投票すべき政党名"),
        reason: z.string().describe("なぜその政党が推奨されるのか、簡潔に")
    })).min(1).max(3),
    overallAdvice: z.string().describe("小選挙区での投票アドバイスまとめ（最も推奨する候補者を中心に簡潔に）"),
    votingSignificance: z.string().describe("今回の投票が社会に与える影響と、ユーザーへの励まし（モチベーション）のメッセージ。200文字〜300文字程度。"),
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
        console.log("Generating advice for Hyogo 7...");

        // Load the Truth JSON
        const dataPath = path.join(process.cwd(), 'app', 'lib', 'data', 'election_data.json');
        const electionDataRaw = await fs.readFile(dataPath, 'utf-8');
        const electionJson = JSON.parse(electionDataRaw);

        // Construct User Summary
        const userSummary = `
        ユーザープロフィール: ${JSON.stringify(userProfile)}
        
        回答した質問とスタンス (回答とコメント):
        ${questions.map((q: any, i: number) => {
            let answerText = answers[q.id];
            // Handle "Answer with Comment" specifically
            if (answerText === "comment") {
                answerText = "【重要：回答は下記のコメントを参照】";
            }

            const comment = comments && comments[q.id] ? ` (コメント: ${comments[q.id]})` : "";
            return `Q${i + 1}: ${q.text} (カテゴリ: ${q.category}) -> 回答: ${answerText}${comment}`;
        }).join("\n")}
        `;

        // Determine District
        // In this redesign, we FORCE Hyogo 7 data. 
        // We inject the entire electionJson as the "World Knowledge".
        // We focus specifically on target_district defined in JSON.

        const targetDistrict = electionJson.target_district;

        const candidatesList = targetDistrict.candidates.map((c: any) => {
            return `
            氏名: ${c.name} (${c.party})
            年齢/ステータス: ${c.age || "不明"}歳 / ${c.status}
            役割: ${c.roles.join(", ")}
            所属連合: ${c.alliance}
            スローガン: ${c.slogan}
            主要政策: ${c.policies.join(", ")}
            支持基盤: ${c.base_support}
            `;
        }).join("\n--------------------------------\n");

        const logicAndParties = JSON.stringify(electionJson.party_alignments, null, 2);

        // Advice Generation Prompt
        const advicePrompt = `
        あなたは${electionJson.election_meta.name}における、${targetDistrict.name}専属の選挙アドバイザーです。

        【重要：思考と判断のルール】
        1. **提供されたJSONデータ（下記のコンテキスト情報）のみ**を事実として扱ってください。
        2. この選挙区に立候補しているのは、リストにある**${targetDistrict.candidates.length}名のみ**です。
        3. **出力全体が「A4用紙1枚（1000〜1200文字程度）」に収まるよう、極めて簡潔にまとめてください。**

        【戦略的投票（Strategic Voting）の考慮】
        今回ユーザーは「死票（Dead Vote）を避けたい」という意図を持っています。
        - 1位の候補者だけでなく、次点（2位・3位）の候補も含めて提案してください。
        - 当選確率や「死票回避」の観点も加味してランク付けを行ってください。

        【コンテキスト情報（真実）】
        選挙概要: ${electionJson.election_meta.overall_context}
        政党・勢力図: ${logicAndParties}
        
        【${targetDistrict.name} 候補者リスト】
        ${candidatesList}

        【ユーザー情報】
        ${userSummary}

        【タスク】
        以下の構成でアドバイスを作成してください。

        1. **小選挙区（候補者）のランキング**:
           - **最も推奨する候補者（1位）から3位まで**を選定してください。
           - 順位付けの根拠（政策一致度、または死票回避の戦略性）を明確に説明してください。

        2. **比例代表（政党）のランキング**:
           - **比例代表で投票すべき政党も、1位から3位まで**ランク付けして提案してください。
           - 「政権の監視役」「改革の推進力」など、ユーザーのスタンスに合った政党を選んでください。

        3. **投票の意義とモチベーション**:
           - なぜ今回の選挙に行くべきなのか、熱意あるメッセージで締めくくってください。

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
