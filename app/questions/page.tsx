"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { generateAdditionalQuestions, generateSingleReplacementQuestion } from "@/app/actions/ai";
import { getAdditionalQuestionsFromPool } from "@/app/actions/question_service";

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

type Answer = "agree" | "neutral" | "disagree" | "unknown" | "comment" | 1 | 2 | 3 | 4 | 5;

export default function QuestionsPage() {
    const router = useRouter();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [answers, setAnswers] = useState<Record<string, Answer>>({});
    const [comments, setComments] = useState<Record<string, string>>({});
    const [currentComment, setCurrentComment] = useState("");
    const [currentStep, setCurrentStep] = useState(0);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isReplacing, setIsReplacing] = useState(false);
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
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleChangeQuestion = async () => {
        if (isReplacing) return;
        setIsReplacing(true);

        try {
            const currentQ = questions[currentStep];
            const profile = JSON.parse(localStorage.getItem("user_profile") || "{}");
            const election = localStorage.getItem("target_election") || "";

            // 1. Try to get a replacement from the pool first
            const currentIds = questions.map(q => q.id);
            let newQuestion: Question | null = null;

            try {
                const poolResult = await getAdditionalQuestionsFromPool(currentIds, 1);
                if (poolResult.success && poolResult.data && poolResult.data.length > 0) {
                    console.log("Replacement found in pool.");
                    newQuestion = poolResult.data[0];
                }
            } catch (err) {
                console.error("Pool replacement error:", err);
            }

            // 2. Fallback to Live AI if pool didn't return a question
            if (!newQuestion) {
                console.log("Pool exhausted, generating replacement via AI.");
                const result = await generateSingleReplacementQuestion({
                    electionName: election,
                    userProfile: profile,
                    excludedQuestionIds: questions.map(q => q.id),
                    currentQuestionText: currentQ.text
                });

                if (result.success && result.data) {
                    newQuestion = result.data as Question;
                }
            }

            if (newQuestion) {
                // Common update logic
                const newQuestions = [...questions];
                newQuestions[currentStep] = newQuestion;
                // Replace current question in place
                setQuestions(newQuestions);
                localStorage.setItem("generated_questions", JSON.stringify(newQuestions));

                // Reset analysis view and comment for the new question
                setShowAnalysis(false);
                setCurrentComment("");
                // Clear any existing answer for the old ID
            } else {
                alert("新しい質問の生成に失敗しました。");
            }
        } catch (e) {
            console.error(e);
            alert("エラーが発生しました。");
        } finally {
            setIsReplacing(false);
        }
    };

    const handleLoadMore = async () => {
        setIsLoadingMore(true);
        const profile = JSON.parse(localStorage.getItem("user_profile") || "{}");
        const election = localStorage.getItem("target_election") || "";

        // 1. Try to get questions from the pool first
        const currentIds = questions.map(q => q.id);

        let newQuestionsData: Question[] | null = null;

        try {
            const poolResult = await getAdditionalQuestionsFromPool(currentIds, 5); // Fetch 5 questions
            if (poolResult.success && poolResult.data) {
                console.log("Loaded additional questions from pool.");
                newQuestionsData = poolResult.data;
            } else {
                console.log("Pool exhausted or failed, switching to Live AI generation.");
            }
        } catch (err) {
            console.error("Pool fetch error:", err);
        }

        // 2. Fallback to Live AI if pool didn't return questions
        if (!newQuestionsData) {
            const result = await generateAdditionalQuestions(election, profile, questions, answers, comments);
            if (result.success && result.data) {
                newQuestionsData = result.data;
            }
        }

        if (newQuestionsData) {
            const newQuestions = [...questions, ...newQuestionsData];
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
                <div className="bg-blue-50 p-6 rounded-xl border border-blue-200 text-left space-y-3">
                    <p className="font-bold text-blue-800 flex items-center">
                        <span className="mr-2 text-xl">✅</span> 回答が完了しました
                    </p>
                    <p className="text-sm text-blue-700 leading-relaxed">
                        あなたの政治的な価値観・好みに基づき、最適な候補者と政党を分析します。<br />
                        もし物足りない場合は、さらに追加の質問に答えて精度を高めることも可能です。
                    </p>
                </div>

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
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
                {isReplacing && (
                    <div className="absolute inset-0 bg-white/80 z-50 flex flex-col items-center justify-center">
                        <div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full mb-4"></div>
                        <p className="text-indigo-800 font-bold">新しい質問を選んでいます...</p>
                    </div>
                )}

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
                    value={currentComment}
                    onChange={(e) => setCurrentComment(e.target.value)}
                    placeholder="このテーマについての具体的な考えや気になった点があれば自由に記載してください。"
                    className="w-full p-3 border border-gray-300 rounded-lg text-base text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[80px] placeholder:text-gray-500"
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
                <div className="space-y-3">
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
                    </div>

                    {/* Answer with Comment Button */}
                    <button
                        onClick={() => handleAnswer("comment")}
                        className="w-full p-4 border-2 border-indigo-100 bg-indigo-50/50 rounded-xl hover:bg-indigo-100 hover:border-indigo-500 transition-all text-indigo-900 font-bold flex items-center justify-center gap-2"
                    >
                        <span>💬</span>
                        <span>コメント内容で回答する</span>
                    </button>

                    {/* Change Question Button (Replaces Neutral/Unknown) */}
                    <button
                        onClick={handleChangeQuestion}
                        disabled={isReplacing}
                        className="w-full p-3 border-2 border-gray-200 bg-gray-50 rounded-xl hover:bg-gray-100 hover:border-gray-400 transition-all text-gray-600 font-medium text-sm flex items-center justify-center gap-2"
                    >
                        <span>🔄</span>
                        <span>興味がない／分からないので質問を変える</span>
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
