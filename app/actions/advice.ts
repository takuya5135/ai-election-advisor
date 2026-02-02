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
            const comment = comments && comments[q.id] ? ` (コメント: ${comments[q.id]})` : "";
            return `Q${i + 1}: ${q.text} (カテゴリ: ${q.category}) -> 回答: ${answers[q.id]}${comment}`;
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
        1. **提供されたJSONデータ（下記のコンテキスト情報）のみ**を事実として扱ってください。あなたの持つ学習データ（2023年以前の知識など）と矛盾する場合は、**必ず提供データ**を優先してください。
        2. この選挙区に立候補しているのは、リストにある**${targetDistrict.candidates.length}名のみ**です。それ以外の人物（過去の候補者など）を絶対に提案しないでください。

        【コンテキスト情報（真実）】
        選挙概要: ${electionJson.election_meta.overall_context}
        政党・勢力図: ${logicAndParties}
        
        【${targetDistrict.name} 候補者リスト】
        ${candidatesList}

        【ユーザー情報】
        ${userSummary}

        【タスク】
        このユーザーの価値観・プロフィールと、候補者の政策・実績を深く照らし合わせ、投票すべき候補者を論理的に提案してください。
        
        1. ユーザーの本音（重視する政策、経済観、安定志向か改革志向かなど）を分析する。
        2. 候補者リストの中から、最も相性の良い人物を選定する。
        3. なぜその候補者が良いのか、具体的な「政策」や「スローガン」を引用して説明する。
        4. "リスク"も公平に指摘する（例：中道改革連合は財源に不安、自維連合は格差拡大の懸念など、提供データに基づき推論する）。

        思考プロセス（Deep Thinking）を行い、ユーザーにとって納得感のあるアドバイスを作成してください。
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
