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
    proportionalAdvice: z.object({
        recommendedParty: z.string().describe("比例代表で投票すべき政党名"),
        reason: z.string().describe("なぜその政党が推奨されるのか、150文字以内で簡潔に")
    }),
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
        - もし、ユーザーと最もポリシーが一致する候補者が「泡沫候補（当選確率が極めて低い）」であり、次点のマッチする候補者が「有力候補（当選を争っている）」である場合、
        - 「本来はA候補がベストマッチですが、死票を避けて当選を確実にするならB候補も選択肢です」といった、**勝敗を意識した戦略的なアドバイス**を含めてください。
        - 比例代表においても同様に、議席獲得が見込めない政党よりは、少しでも政策が近く議席獲得可能な政党を勧める視点を持ってください。
        - ただし、ユーザーの理想を無視して「勝ち馬に乗れ」と言うのではなく、あくまで「理想」と「現実（死票回避）」のバランスを提示してください。

        【コンテキスト情報（真実）】
        選挙概要: ${electionJson.election_meta.overall_context}
        政党・勢力図: ${logicAndParties}
        
        【${targetDistrict.name} 候補者リスト】
        ${candidatesList}

        【ユーザー情報】
        ${userSummary}

        【タスク】
        以下の構成でアドバイスを作成してください。

        1. **小選挙区（候補者）のアドバイス**:
           - 最も推奨する候補者を1名（または接戦なら2名）選び、その理由を簡潔に。
           - ユーザーの重視する政策との合致点を示してください。

        2. **比例代表（政党）のアドバイス**:
           - 候補者個人だけでなく、**政党（比例代表）**としてどこに投票すべきかも提案してください。
           - 「政権の監視役」「改革の推進力」など、ユーザーのスタンスに合った政党を選んでください。

        3. **投票の意義とモチベーション（重要）**:
           - なぜ今回の選挙に行くべきなのか？
           - この1票が今の政治（${electionJson.election_meta.background}）にどう影響を与えるか？
           - ユーザーを励まし、投票所へ足を運びたくなるような、熱意あるメッセージで締めくくってください。

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
