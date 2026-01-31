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
        localStorage.setItem("target_election", election.name);
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

            <div className="mt-8 text-center">
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
