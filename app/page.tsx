"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [electionQuery, setElectionQuery] = useState("");

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!electionQuery.trim()) return;

    // In a real app, we might search for the election ID here.
    // For now, we pass the name to the profile page.
    localStorage.setItem("target_election", electionQuery);
    router.push("/profile");
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-8 pt-10 md:pt-20">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent pb-2">
          AI選挙アドバイザー
        </h1>
        <p className="text-xl text-muted-foreground text-gray-600 max-w-[600px]">
          あなたの価値観と政治情勢を分析し、<br />
          最適な投票先を公平な視点でご提案します。
        </p>
      </div>

      <div className="w-full max-w-md p-6 bg-white rounded-xl shadow-lg border border-slate-200 text-center">
        <p className="mb-6 text-gray-600">
          まずはあなたのことについて教えてください。<br />
          居住地に合わせて最適な選挙を提案します。
        </p>
        <button
          onClick={() => router.push("/profile")}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 h-12 px-8 py-2 w-full text-lg shadow-md"
        >
          はじめる（プロフィール設定）
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl text-center mt-8">
        <div className="p-4 rounded-lg bg-slate-100">
          <div className="text-2xl mb-2">📊</div>
          <h3 className="font-bold mb-1">公平な分析</h3>
          <p className="text-sm text-gray-600">AIが客観的なデータに基づき、候補者や政党の実績を分析します。</p>
        </div>
        <div className="p-4 rounded-lg bg-slate-100">
          <div className="text-2xl mb-2">🤝</div>
          <h3 className="font-bold mb-1">あなたとの相性</h3>
          <p className="text-sm text-gray-600">独自の質問により、あなたの政治的スタンスとの適合度を判定します。</p>
        </div>
        <div className="p-4 rounded-lg bg-slate-100">
          <div className="text-2xl mb-2">🗳️</div>
          <h3 className="font-bold mb-1">投票の記録</h3>
          <p className="text-sm text-gray-600">実際の投票行動を記録し、振り返ることができます（任意）。</p>
        </div>
      </div>
    </div>
  );
}
