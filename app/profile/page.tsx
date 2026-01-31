"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        nickname: "",
        residence: "",
        age: "",
        family: "",
        economicStatus: "standard",
    });
    const [electionName, setElectionName] = useState("");

    useEffect(() => {
        const storedElection = localStorage.getItem("target_election");
        if (!storedElection) {
            router.push("/");
        } else {
            setElectionName(storedElection);
        }
    }, [router]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        localStorage.setItem("user_profile", JSON.stringify(formData));
        router.push("/questions/generate"); // Next step: Generate questions
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8 py-8">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold">プロフィール設定</h2>
                <p className="text-gray-600">
                    より正確なアドバイスを行うため、あなたの状況を教えてください。<br />
                    （入力された情報は、アドバイスの生成のみに使用されます）
                </p>
                <div className="p-3 bg-blue-50 text-blue-800 rounded-md text-sm font-medium">
                    対象の選挙: {electionName}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium">ニックネーム <span className="text-red-500">*</span></label>
                    <input
                        name="nickname"
                        required
                        placeholder="アドバイザー"
                        className="w-full p-2 border rounded-md"
                        value={formData.nickname}
                        onChange={handleChange}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">居住地（市町村まで） <span className="text-red-500">*</span></label>
                    <input
                        name="residence"
                        required
                        placeholder="例: 東京都新宿区"
                        className="w-full p-2 border rounded-md"
                        value={formData.residence}
                        onChange={handleChange}
                    />
                    <p className="text-xs text-gray-500">選挙区の判定に使用します</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">年代</label>
                        <select
                            name="age"
                            className="w-full p-2 border rounded-md"
                            value={formData.age}
                            onChange={handleChange}
                        >
                            <option value="">選択してください</option>
                            <option value="10s">10代</option>
                            <option value="20s">20代</option>
                            <option value="30s">30代</option>
                            <option value="40s">40代</option>
                            <option value="50s">50代</option>
                            <option value="60s">60代</option>
                            <option value="70s">70代以上</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">家族構成（任意）</label>
                        <input
                            name="family"
                            placeholder="例: 独身、既婚子あり"
                            className="w-full p-2 border rounded-md"
                            value={formData.family}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">経済状況（任意）</label>
                    <select
                        name="economicStatus"
                        className="w-full p-2 border rounded-md"
                        value={formData.economicStatus}
                        onChange={handleChange}
                    >
                        <option value="poverty">貧困</option>
                        <option value="poor">どちらかと言えば貧しい</option>
                        <option value="standard">標準</option>
                        <option value="rich">どちらかと言えば裕福</option>
                        <option value="wealthy">裕福</option>
                    </select>
                </div>

                <button
                    type="submit"
                    className="w-full bg-blue-600 text-white p-3 rounded-md font-bold hover:bg-blue-700 transition"
                >
                    質問の作成へ進む
                </button>
            </form>
        </div>
    );
}
