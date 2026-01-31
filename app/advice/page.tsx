"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown"; // Note: might need to install this or render simply

// Simple Markdown renderer component since we didn't install react-markdown to keep deps light
function MarkdownRenderer({ content }: { content: string }) {
    // Very basic splitting for demo. In production, use react-markdown
    const sections = content.split("\n").map((line, i) => {
        if (line.startsWith("### ")) return <h3 key={i} className="text-lg font-bold mt-4 mb-2">{line.replace("### ", "")}</h3>;
        if (line.startsWith("## ")) return <h2 key={i} className="text-xl font-bold mt-6 mb-3 border-b pb-1">{line.replace("## ", "")}</h2>;
        if (line.startsWith("# ")) return <h1 key={i} className="text-2xl font-bold mt-8 mb-4">{line.replace("# ", "")}</h1>;
        if (line.startsWith("- ")) return <li key={i} className="ml-4 list-disc mb-1">{line.replace("- ", "")}</li>;
        if (line.trim() === "") return <div key={i} className="h-2"></div>;
        return <p key={i} className="mb-2 leading-relaxed">{line}</p>;
    });

    return <div>{sections}</div>;
}

export default function AdvicePage() {
    const router = useRouter();
    const [advice, setAdvice] = useState("");

    useEffect(() => {
        const storedAdvice = localStorage.getItem("ai_advice");
        if (!storedAdvice) {
            router.push("/");
        } else {
            setAdvice(storedAdvice);
        }
    }, [router]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8 py-8 animate-in fade-in duration-500">
            <div className="bg-white p-6 md:p-10 rounded-xl shadow-lg border border-indigo-100 print:shadow-none print:border-none print:p-0">
                <div className="flex items-center space-x-4 mb-6">
                    <div className="text-4xl">💡</div>
                    <h1 className="text-2xl font-bold text-gray-800">アドバイス結果</h1>
                </div>

                <div className="prose prose-blue max-w-none text-gray-700">
                    <MarkdownRenderer content={advice} />
                </div>
            </div>

            <div className="flex justify-center space-x-4 print:hidden">
                <button
                    onClick={handlePrint}
                    className="bg-indigo-600 text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:bg-indigo-700 hover:scale-105 transition transform flex items-center space-x-2"
                >
                    <span>📄</span>
                    <span>PDFで保存 / 印刷</span>
                </button>
                <button
                    onClick={() => router.push("/")}
                    className="bg-gray-600 text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:bg-gray-700 hover:scale-105 transition transform"
                >
                    トップに戻る
                </button>
            </div>

            <p className="text-center text-sm text-gray-500 print:mt-10">
                ※ このアドバイスはAIによって生成された参考情報です。<br />最終的な投票判断はご自身の責任で行ってください。
            </p>

            <style jsx global>{`
                @media print {
                    header, footer, nav { display: none !important; }
                    body { background: white !important; }
                    .container { max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
                }
            `}</style>
        </div>
    );
}
