"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { generateAdditionalQuestions } from "@/app/actions/ai";

type Analysis = {
    merit: string;
    demerit: string;
    background: string;
    impact: {
        global: string;
        national: string;
        social: string;
        economic: string;
        welfare: string;
        culture: string;
        dailyLife: string;
    };
};

type Question = {
    id: string;
    text: string;
    category: string;
    questionType?: "standard" | "administration_evaluation";
    analysis?: Analysis;
};

type Answer = "agree" | "neutral" | "disagree" | "unknown" | 1 | 2 | 3 | 4 | 5;

export default function QuestionsPage() {
    const router = useRouter();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [answers, setAnswers] = useState<Record<string, Answer>>({});
    const [comments, setComments] = useState<Record<string, string>>({});
    const [currentComment, setCurrentComment] = useState("");
    const [currentStep, setCurrentStep] = useState(0);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [showAnalysis, setShowAnalysis] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem("generated_questions");
        const storedAnswers = localStorage.getItem("user_answers");
        const storedComments = localStorage.getItem("user_comments");
        if (!stored) {
            router.push("/");
            return;
        }
        setQuestions(JSON.parse(stored));
        if (storedAnswers) setAnswers(JSON.parse(storedAnswers));
        if (storedComments) setComments(JSON.parse(storedComments));
    }, [router]);

    // Reset local comment input when step changes
    useEffect(() => {
        if (questions[currentStep]) {
            setCurrentComment(comments[questions[currentStep].id] || "");
        }
    }, [currentStep, questions, comments]);

    const handleAnswer = (val: Answer) => {
        if (!questions[currentStep]) return;

        // Save answer and comment
        const currentQId = questions[currentStep].id;
        const newAnswers = { ...answers, [currentQId]: val };
        const newComments = { ...comments, [currentQId]: currentComment };

        setAnswers(newAnswers);
        setComments(newComments);

        // Persist
        localStorage.setItem("user_answers", JSON.stringify(newAnswers));
        localStorage.setItem("user_comments", JSON.stringify(newComments));

        if (currentStep < questions.length - 1) {
            setCurrentStep(prev => prev + 1);
            setShowAnalysis(false); // Reset analysis view for new question
            window.scrollTo(0, 0);
        } else {
            // End of current list - Show options logic handled in render
            // forcing a re-render or state check is fine, user stays on this index for "Completion" view
            // Actually, let's introduce a "completed" state or just check index in render
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleLoadMore = async () => {
        setIsLoadingMore(true);
        const profile = JSON.parse(localStorage.getItem("user_profile") || "{}");
        const election = localStorage.getItem("target_election") || "";

        const result = await generateAdditionalQuestions(election, profile, questions, answers, comments);

        if (result.success && result.data) {
            const newQuestions = [...questions, ...result.data];
            setQuestions(newQuestions);
            localStorage.setItem("generated_questions", JSON.stringify(newQuestions));
            setIsLoadingMore(false);
            // Resume answering (currentStep is already at the end of old list, which is start of new list)
        } else {
            alert("追加の質問を生成できませんでした。");
            setIsLoadingMore(false);
        }
    };

    const handleFinish = () => {
        router.push("/advice/generate");
    };

    if (questions.length === 0) return null;

    // "Completion" View (Before deciding to finish or load more)
    if (currentStep >= questions.length) {
        return (
            <div className="max-w-xl mx-auto py-12 px-4 space-y-8 text-center animate-in fade-in">
                <h2 className="text-3xl font-bold text-gray-800">回答ありがとうございます</h2>
                {Object.values(answers).filter(a => a === "unknown").length > 3 ? (
                    <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-200 text-left space-y-3">
                        <p className="font-bold text-yellow-800 flex items-center">
                            <span className="mr-2 text-xl">💡</span> より詳しくあなたの考えを知るために
                        </p>
                        <p className="text-sm text-yellow-700 leading-relaxed">
                            「わからない・関心ない」という回答がいくつかありました。よりあなたにぴったりの候補者を見つけるために、別の角度からの質問を追加で作成することをお勧めします。
                        </p>
                    </div>
                ) : (
                    <p className="text-gray-600 leading-relaxed">
                        現在の情報でアドバイスを作成することも可能ですが、<br />
                        より精度の高い判定を行うために、追加の質問に答えることもできます。
                    </p>
                )}

                <div className="grid gap-4 mt-8">
                    <button
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                        className="p-4 bg-white border-2 border-indigo-600 text-indigo-700 rounded-xl font-bold hover:bg-indigo-50 transition flex items-center justify-center"
                    >
                        {isLoadingMore ? (
                            <span className="flex items-center"><span className="animate-spin mr-2">⏳</span> 質問を作成中...</span>
                        ) : (
                            "🔍 追加の質問に答えて精度を高める"
                        )}
                    </button>

                    {!isLoadingMore && (
                        <button
                            onClick={handleFinish}
                            className="p-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg"
                        >
                            ✨ この内容でアドバイスを見る
                        </button>
                    )}
                </div>
            </div>
        );
    }

    const currentQ = questions[currentStep];
    const progress = ((currentStep) / questions.length) * 100;

    return (
        <div className="max-w-3xl mx-auto space-y-6 py-6 px-4">
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="text-right text-xs text-gray-500">
                {currentStep + 1} / {questions.length}
            </div>

            {/* Question Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 md:p-8 space-y-4">
                    <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full uppercase tracking-wider">
                        {currentQ.category}
                    </span>
                    <h2 className="text-xl md:text-2xl font-bold leading-relaxed text-gray-900">
                        Q{currentStep + 1}. {currentQ.text}
                    </h2>

                    {/* Analysis Toggle */}
                    {currentQ.analysis && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <button
                                onClick={() => setShowAnalysis(!showAnalysis)}
                                className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
                            >
                                <span>{showAnalysis ? "▼ 分析・詳細を隠す" : "▶ この争点の詳細・分析を見る"}</span>
                            </button>

                            {showAnalysis && (
                                <div className="mt-4 space-y-4 bg-slate-50 p-4 rounded-lg text-sm text-gray-700 animate-in slide-in-from-top-2 duration-200">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <h4 className="font-bold text-green-700 mb-1">メリット</h4>
                                            <p>{currentQ.analysis.merit}</p>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-red-700 mb-1">デメリット</h4>
                                            <p>{currentQ.analysis.demerit}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-700 mb-1">背景</h4>
                                        <p>{currentQ.analysis.background}</p>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-indigo-700 mb-1">具体的な影響</h4>
                                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 list-disc list-inside bg-white p-3 rounded border">
                                            <li><span className="font-semibold">国民生活:</span> {currentQ.analysis.impact.dailyLife}</li>
                                            <li><span className="font-semibold">経済:</span> {currentQ.analysis.impact.economic}</li>
                                            <li><span className="font-semibold">社会:</span> {currentQ.analysis.impact.social}</li>
                                            <li><span className="font-semibold">福祉:</span> {currentQ.analysis.impact.welfare}</li>
                                            <li><span className="font-semibold">文化:</span> {currentQ.analysis.impact.culture}</li>
                                            <li><span className="font-semibold">自国:</span> {currentQ.analysis.impact.national}</li>
                                            <li><span className="font-semibold">世界:</span> {currentQ.analysis.impact.global}</li>
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Comment Box */}
            <div className="bg-white p-4 rounded-xl border border-slate-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    コメント・メモ（任意）
                </label>
                <textarea
                    key={currentQ.id}
                    defaultValue={comments[currentQ.id] || ""}
                    onChange={(e) => setCurrentComment(e.target.value)}
                    placeholder="このテーマについての具体的な考えや気になった点があれば自由に記載してください。"
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[80px]"
                />
            </div>

            {/* Answer Options */}
            {currentQ.questionType === "administration_evaluation" ? (
                <div className="space-y-6">
                    <div className="flex flex-col space-y-4">
                        <div className="flex justify-between text-xs font-bold text-gray-500 px-2 uppercase tracking-tighter">
                            <span>1: 全く支持しない</span>
                            <span>3: どちらでもない</span>
                            <span>5: 強く支持する</span>
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                            {[1, 2, 3, 4, 5].map((num) => (
                                <button
                                    key={num}
                                    onClick={() => handleAnswer(num as Answer)}
                                    className={`p-6 text-xl font-bold rounded-xl transition-all border-2 ${answers[currentQ.id] === num
                                        ? "bg-blue-600 border-blue-600 text-white shadow-lg scale-105"
                                        : "bg-white border-gray-200 text-gray-700 hover:border-blue-400 hover:bg-blue-50"
                                        }`}
                                >
                                    {num}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                        onClick={() => handleAnswer("agree")}
                        className="p-4 border-2 border-blue-100 bg-blue-50/50 rounded-xl hover:bg-blue-100 hover:border-blue-500 transition-all text-blue-900 font-bold"
                    >
                        ◯ 共感する
                    </button>
                    <button
                        onClick={() => handleAnswer("disagree")}
                        className="p-4 border-2 border-red-100 bg-red-50/50 rounded-xl hover:bg-red-100 hover:border-red-500 transition-all text-red-900 font-bold"
                    >
                        ✕ 共感しない
                    </button>
                    <button
                        onClick={() => handleAnswer("neutral")}
                        className="p-4 border-2 border-gray-100 bg-gray-50/50 rounded-xl hover:bg-gray-100 hover:border-gray-400 transition-all text-gray-700 font-medium"
                    >
                        △ どちらでもない
                    </button>
                    <button
                        onClick={() => handleAnswer("unknown")}
                        className="p-4 border-2 border-slate-200 bg-slate-100 rounded-xl hover:bg-slate-200 hover:border-slate-400 transition-all text-slate-600 font-medium"
                    >
                        ？ 分からない・関心ない
                    </button>
                </div>
            )}

            {/* Navigation (Back) */}
            <div className="flex justify-start">
                <button
                    onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                    disabled={currentStep === 0}
                    className="text-gray-400 text-sm hover:text-gray-600 disabled:opacity-30"
                >
                    ← 前に戻る
                </button>
            </div>
        </div>
    );
}
