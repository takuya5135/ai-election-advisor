"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Allow execution up to 60 seconds (Client-side trigger safeguard, though enforced on API)
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
                // Call via Route Handler to support maxDuration configuration
                const response = await fetch("/api/advice", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        electionContext: electionStr,
                        userProfile: JSON.parse(profileStr),
                        questions: JSON.parse(questionsStr),
                        answers: JSON.parse(answersStr),
                        comments: JSON.parse(commentsStr),
                        candidates: []
                    }),
                });

                if (!response.ok) {
                    throw new Error(`API returned status: ${response.status}`);
                }

                const result = await response.json();

                if (result.success && result.data) {
                    const data = result.data;

                    // 構造化データをMarkdown形式に変換して保存（既存の表示コンポーネントとの互換性維持のため）
                    let markdownAdvice = "";

                    // 1. 総合アドバイス（小選挙区）
                    markdownAdvice += `### 🗳️ 小選挙区（候補者）の推奨\n`;
                    markdownAdvice += `${data.overallAdvice}\n\n`;

                    // 2. 比例代表アドバイス (New)
                    if (data.proportionalAdvice) {
                        markdownAdvice += `### 📊 比例代表（政党）の推奨\n`;
                        markdownAdvice += `**推奨政党: ${data.proportionalAdvice.recommendedParty}**\n`;
                        markdownAdvice += `${data.proportionalAdvice.reason}\n\n`;
                    }

                    // 3. 政策一致度分析
                    markdownAdvice += `### 🔍 政策一致度分析\n`;
                    markdownAdvice += `- **全体一致度**: ${data.policyAnalysis.alignment}%\n`;
                    markdownAdvice += `- **主な一致点**: ${data.policyAnalysis.keyMatches.join("、")}\n`;
                    markdownAdvice += `- **主な相違点**: ${data.policyAnalysis.keyDifferences.join("、")}\n\n`;

                    // 4. 候補者詳細（簡潔に）
                    markdownAdvice += `### 👤 候補者詳細データ\n`;
                    data.candidateMatches.forEach((c: any) => {
                        markdownAdvice += `**${c.candidateName} (${c.party})** - マッチ度: ${c.matchScore}%\n`;
                        markdownAdvice += `- 理由: ${c.reason}\n`;
                        if (c.risks) markdownAdvice += `- ⚠️ 注意点: ${c.risks}\n`;
                        markdownAdvice += `\n`;
                    });

                    // 5. 投票の意義 (New)
                    if (data.votingSignificance) {
                        markdownAdvice += `### 🔥 あなたの1票が持つ意味\n`;
                        markdownAdvice += `${data.votingSignificance}\n\n`;
                    }

                    // 思考プロセス (あれば末尾に小さく、または省略しても良いが、デバッグ用に残す)
                    if (data.thinkingProcess) {
                        markdownAdvice += `---\n<details><summary>AIの思考プロセス</summary>\n${data.thinkingProcess}\n</details>\n\n`;
                    }

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
