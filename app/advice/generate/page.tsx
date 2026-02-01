"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { generateVoteAdvice } from "@/app/actions/advice";

// Allow execution up to 60 seconds (Vercel Serverless Function limit check)
export const maxDuration = 60;

export default function AdviceGeneratePage() {
    const router = useRouter();
    const [status, setStatus] = useState("回答を分析中...");

    useEffect(() => {
        const processAdvice = async () => {
            const profileStr = localStorage.getItem("user_profile");
            const electionStr = localStorage.getItem("target_election");
            const questionsStr = localStorage.getItem("generated_questions");
            const answersStr = localStorage.getItem("user_answers");
            const commentsStr = localStorage.getItem("user_comments") || "{}";

            if (!profileStr || !electionStr || !questionsStr || !answersStr) {
                router.push("/");
                return;
            }

            try {
                const result = await generateVoteAdvice(
                    electionStr,
                    JSON.parse(profileStr),
                    JSON.parse(questionsStr),
                    JSON.parse(answersStr),
                    JSON.parse(commentsStr)
                );

                if (result.success && result.data) {
                    const data = result.data;

                    // 構造化データをMarkdown形式に変換して保存（既存の表示コンポーネントとの互換性維持のため）
                    let markdownAdvice = "";

                    // 1. 総合アドバイス
                    markdownAdvice += `${data.overallAdvice}\n\n`;

                    // 2. 思考プロセス (あれば)
                    if (data.thinkingProcess) {
                        markdownAdvice += `### AIの思考プロセス (Deep Thinking)\n${data.thinkingProcess}\n\n`;
                    }

                    markdownAdvice += `---\n\n`;

                    // 3. 政策一致度分析
                    markdownAdvice += `### 🔍 政策一致度分析\n`;
                    markdownAdvice += `- **全体一致度**: ${data.policyAnalysis.alignment}%\n`;
                    markdownAdvice += `- **主な一致点**: ${data.policyAnalysis.keyMatches.join("、")}\n`;
                    markdownAdvice += `- **主な相違点**: ${data.policyAnalysis.keyDifferences.join("、")}\n\n`;

                    // 4. 候補者との相性
                    markdownAdvice += `### 👤 候補者・政党との相性詳細\n\n`;
                    data.candidateMatches.forEach((c: any) => {
                        markdownAdvice += `#### ${c.candidateName} (${c.party}) - マッチ度: ${c.matchScore}%\n`;
                        markdownAdvice += `${c.reason}\n\n`;
                        markdownAdvice += `- **経済政策**: ${c.compatibility.economic}\n`;
                        markdownAdvice += `- **社会政策**: ${c.compatibility.social}\n`;
                        markdownAdvice += `- **政治スタイル**: ${c.compatibility.style}\n`;
                        if (c.risks) {
                            markdownAdvice += `- **⚠️ 注意点**: ${c.risks}\n`;
                        }
                        markdownAdvice += `\n`;
                    });

                    localStorage.setItem("ai_advice", markdownAdvice);
                    // バックアップとして構造化データも保存しておく
                    localStorage.setItem("ai_advice_json", JSON.stringify(data));

                    router.push("/advice");
                } else {
                    console.error("Advice generation failed:", result);
                    alert("アドバイス生成に失敗しました。もう一度お試しください。");
                    router.push("/");
                }
            } catch (err: any) {
                console.error("Error details:", err);

                // 詳細なエラー情報を収集
                const errorInfo = {
                    message: err.message || "Unknown error",
                    name: err.name,
                    stack: err.stack,
                    digest: err.digest, // Next.js特有のエラーID
                    raw: JSON.stringify(err, Object.getOwnPropertyNames(err))
                };

                alert(`アドバイス生成中にエラーが発生しました。\n\n【エラー詳細】\n${errorInfo.message}\n\n【トラブルシューティング用情報】\n${JSON.stringify(errorInfo, null, 2)}`);
                router.push("/");
            }
        };

        processAdvice();
    }, [router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
            <h2 className="text-2xl font-bold animate-pulse text-indigo-800">{status}</h2>
            <p className="text-gray-500">あなたの価値観と候補者の政策を照らし合わせています...</p>
        </div>
    );
}
