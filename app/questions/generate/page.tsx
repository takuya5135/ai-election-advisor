"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { generateElectionQuestions } from "@/app/actions/ai";

export default function GenerateQuestionsPage() {
    const router = useRouter();
    const [status, setStatus] = useState("プロフィールを分析中...");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const startGeneration = async () => {
            const profileStr = localStorage.getItem("user_profile");
            const electionStr = localStorage.getItem("target_election");

            if (!profileStr || !electionStr) {
                router.push("/");
                return;
            }

            setStatus("選挙情報を収集中...");
            // In a real app, we might fetch candidate data here first to inform the AI.

            setStatus("政治的スタンスを判定する質問を作成中...");

            try {
                const result = await generateElectionQuestions(electionStr, JSON.parse(profileStr));

                if (result.success && result.data) {
                    localStorage.setItem("generated_questions", JSON.stringify(result.data));
                    router.push("/questions");
                } else {
                    setError("質問の生成に失敗しました。APIキーを確認してください。");
                }

            } catch (err) {
                console.error(err);
                setError("予期せぬエラーが発生しました。");
            }
        };

        startGeneration();
    }, [router]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="text-red-500 font-bold mb-4">{error}</div>
                <button onClick={() => router.push("/")} className="underline">トップへ戻る</button>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
            <div className="relative flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
                <div className="absolute text-4xl">🤖</div>
            </div>
            <h2 className="text-2xl font-bold animate-pulse text-gray-700">{status}</h2>
            <p className="text-gray-500 max-w-md text-center">
                あなたの年代や選挙区に合わせて、最適な質問を作成しています。<br />
                これには数秒から数十秒かかる場合があります。
            </p>
        </div>
    );
}
