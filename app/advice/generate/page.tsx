"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { generateVoteAdvice } from "@/app/actions/advice";

export default function AdviceGeneratePage() {
    const router = useRouter();
    const [status, setStatus] = useState("回答を分析中...");

    useEffect(() => {
        const processAdvice = async () => {
            const profileStr = localStorage.getItem("user_profile");
            const electionStr = localStorage.getItem("target_election");
            const questionsStr = localStorage.getItem("generated_questions");
            const answersStr = localStorage.getItem("user_answers");

            if (!profileStr || !electionStr || !questionsStr || !answersStr) {
                router.push("/");
                return;
            }

            try {
                const result = await generateVoteAdvice(
                    electionStr,
                    JSON.parse(profileStr),
                    JSON.parse(questionsStr),
                    JSON.parse(answersStr)
                );

                if (result.success && result.advice) {
                    localStorage.setItem("ai_advice", result.advice);
                    router.push("/advice");
                } else {
                    alert("アドバイス生成に失敗しました。");
                    router.push("/");
                }
            } catch (err) {
                console.error(err);
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
