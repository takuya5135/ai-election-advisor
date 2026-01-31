"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { findElections } from "@/app/actions/ai";

type Election = {
    id: string;
    name: string;
    officialDate: string;
    voteDate: string;
    description: string;
    level: "national" | "local";
};

export default function ElectionSearchPage() {
    const router = useRouter();
    const [elections, setElections] = useState<Election[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [residence, setResidence] = useState("");
    const [isManualMode, setIsManualMode] = useState(false);
    const [manualName, setManualName] = useState("");

    useEffect(() => {
        const fetchElections = async () => {
            const storedProfile = localStorage.getItem("user_profile");
            if (!storedProfile) {
                router.push("/profile");
                return;
            }

            const profile = JSON.parse(storedProfile);
            if (!profile.residence) {
                router.push("/profile");
                return;
            }

            setResidence(profile.residence);

            try {
                const result = await findElections(profile.residence);
                if (result.success && result.data) {
                    setElections(result.data as Election[]);
                } else {
                    setError("選挙情報の取得に失敗しました。");
                }
            } catch (err) {
                console.error(err);
                setError("予期せぬエラーが発生しました。");
            } finally {
                setLoading(false);
            }
        };

        fetchElections();
    }, [router]);

    const handleSelectElection = (election: Election) => {
        localStorage.removeItem("user_answers");
        localStorage.removeItem("user_comments");
        localStorage.removeItem("generated_questions");
        localStorage.setItem("target_election", election.name);
        localStorage.setItem("target_election_level", election.level);
        router.push("/questions/generate");
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
                <div className="text-xl font-medium text-gray-600">
                    <span className="font-bold text-blue-600">{residence}</span> に関連する選挙を探しています...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-xl mx-auto py-12 px-4 text-center">
                <p className="text-red-500 mb-4">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="underline text-gray-600 hover:text-gray-900"
                >
                    再読み込み
                </button>
            </div>
        );
    }


    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualName.trim()) {
            localStorage.removeItem("user_answers");
            localStorage.removeItem("user_comments");
            localStorage.removeItem("generated_questions");
            localStorage.setItem("target_election", manualName.trim());
            // Default to national for manual entries as they are usually major national ones, 
            // or we could add a toggle. For now, let's assume if it contains "衆" "参" it's national.
            const level = (manualName.includes("衆") || manualName.includes("参")) ? "national" : "local";
            localStorage.setItem("target_election_level", level);
            router.push("/questions/generate");
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-8 px-4 space-y-8">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold">選挙を選択してください</h2>
                <p className="text-gray-600">
                    <span className="font-bold text-blue-600">{residence}</span> に関連する選挙が見つかりました。<br />
                    どの選挙についてのアドバイスを作成しますか？
                </p>
            </div>

            <div className="grid gap-4">
                {elections.map((election) => (
                    <button
                        key={election.id}
                        onClick={() => handleSelectElection(election)}
                        className="flex flex-col text-left p-6 bg-white border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all group"
                    >
                        <div className="flex flex-col md:flex-row md:justify-between md:items-start w-full mb-3 gap-2">
                            <span className={`inline-block px-2 py-1 text-xs font-bold rounded-md w-fit ${election.level === "national"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-green-100 text-green-700"
                                }`}>
                                {election.level === "national" ? "国政選挙" : "地方選挙"}
                            </span>
                            <div className="text-sm text-gray-500 font-medium text-right flex flex-col items-start md:items-end">
                                <span>公示: <span className="text-gray-900">{election.officialDate}</span></span>
                                <span>投開票: <span className="text-red-600 font-bold">{election.voteDate}</span></span>
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 group-hover:text-blue-700 mb-2">
                            {election.name}
                        </h3>
                        <p className="text-gray-600 text-sm">
                            {election.description}
                        </p>
                    </button>
                ))}
            </div>

            {!isManualMode ? (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <p className="text-sm text-gray-500 mb-2">希望の選挙が一覧にありませんか？</p>
                    <button
                        onClick={() => setIsManualMode(true)}
                        className="text-blue-600 font-medium hover:underline text-sm"
                    >
                        + 選挙名を手動で入力する
                    </button>
                </div>
            ) : (
                <form onSubmit={handleManualSubmit} className="mt-4 p-6 bg-blue-50 rounded-xl border border-blue-200 space-y-4">
                    <label className="block text-sm font-bold text-blue-800">
                        選挙名を手動入力
                    </label>
                    <input
                        type="text"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        placeholder="例: 第51回衆議院議員総選挙"
                        className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        autoFocus
                    />
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setIsManualMode(false)}
                            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                        >
                            キャンセル
                        </button>
                        <button
                            type="submit"
                            disabled={!manualName.trim()}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
                        >
                            この選挙で進む
                        </button>
                    </div>
                </form>
            )}

            <div className="mt-8 text-center space-y-4">
                <hr className="border-gray-200" />
                <button
                    onClick={() => router.push("/profile")}
                    className="text-sm text-gray-500 hover:text-gray-800 underline"
                >
                    プロフィール（居住地）を変更する
                </button>
            </div>
        </div>
    );
}
