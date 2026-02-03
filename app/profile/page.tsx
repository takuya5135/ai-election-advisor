"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        nickname: "",
        // residence is removed as we target Hyogo 7 specifically
        age: "",
        maritalStatus: "",
        childrenCount: "",
        occupation: "",
        economicStatus: "standard",
    });

    useEffect(() => {
        // Load stored profile if available
        const storedProfile = localStorage.getItem("user_profile");
        if (storedProfile) {
            const parsed = JSON.parse(storedProfile);
            setFormData(prev => ({ ...prev, ...parsed }));
        }
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Save profile for future
        const profileWithFixedLocation = {
            ...formData,
            residence: "兵庫県西宮市・芦屋市 (兵庫7区)"
        };
        localStorage.setItem("user_profile", JSON.stringify(profileWithFixedLocation));

        // Set default election context for Hyogo 7
        localStorage.setItem("target_election", "第51回衆議院議員総選挙");
        localStorage.setItem("target_election_level", "national");

        // Skip election selection and go straight to generation
        router.push("/prologue");
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8 py-8">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-indigo-900 border-b-2 border-indigo-100 pb-2">プロフィール設定</h2>
                <p className="text-gray-600">
                    あなたの属性に合わせて、アドバイスを最適化します。<br />
                    本アプリは現在、<strong>兵庫7区（西宮市・芦屋市）</strong>専用です。
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">ニックネーム <span className="text-red-500">*</span></label>
                    <input
                        name="nickname"
                        required
                        placeholder="アドバイザー"
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
                        value={formData.nickname}
                        onChange={handleChange}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">年代</label>
                        <select
                            name="age"
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900"
                            value={formData.age}
                            onChange={handleChange}
                        >
                            <option value="">選択してください</option>
                            <option value="elementary">小学生</option>
                            <option value="middle_high">中高生</option>
                            <option value="10s">10代（大学生・社会人）</option>
                            <option value="20s">20代</option>
                            <option value="30s">30代</option>
                            <option value="40s">40代</option>
                            <option value="50s">50代</option>
                            <option value="60s">60代</option>
                            <option value="70s">70代</option>
                            <option value="80s">80代以上</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">既婚・未婚</label>
                        <select
                            name="maritalStatus"
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900"
                            value={(formData as any).maritalStatus || ""}
                            onChange={handleChange}
                        >
                            <option value="">選択してください</option>
                            <option value="single">独身</option>
                            <option value="married">既婚</option>
                            <option value="other">その他</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">子供の数</label>
                        <select
                            name="childrenCount"
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900"
                            value={(formData as any).childrenCount || ""}
                            onChange={handleChange}
                        >
                            <option value="">選択してください</option>
                            <option value="0">いない</option>
                            <option value="1">1人</option>
                            <option value="2">2人</option>
                            <option value="3">3人</option>
                            <option value="4_or_more">4人以上</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">経済状況（任意）</label>
                        <select
                            name="economicStatus"
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900"
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
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">職業（任意）</label>
                    <select
                        name="occupation"
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900"
                        value={(formData as any).occupation || ""}
                        onChange={handleChange}
                    >
                        <option value="">選択してください</option>
                        <option value="public_servant">公務員</option>
                        <option value="office_admin">会社員（一般事務・管理）</option>
                        <option value="office_tech">会社員（技術・開発）</option>
                        <option value="office_sales">会社員（営業・マーケティング）</option>
                        <option value="office_pro">会社員（企画・専門職）</option>
                        <option value="executive">経営者・役員</option>
                        <option value="self_employed">自営業・フリーランス</option>
                        <option value="professional">専門職（医師・弁護士等）</option>
                        <option value="edu_research">教育・研究職</option>
                        <option value="medical_welfare">医療・福祉・介護</option>
                        <option value="logistics_transport">運輸・配送・物流</option>
                        <option value="service_retail">サービス・飲食・小売</option>
                        <option value="construction">建設・土木・農林水産</option>
                        <option value="manufacturing">製造・生産工程</option>
                        <option value="student">学生</option>
                        <option value="homemaker">主婦・主夫</option>
                        <option value="part_time">パート・アルバイト</option>
                        <option value="unemployed">無職・家政手伝い</option>
                        <option value="other">その他</option>
                    </select>
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        className="w-full bg-indigo-600 text-white p-4 rounded-xl font-bold hover:bg-indigo-700 hover:shadow-lg transform hover:-translate-y-0.5 transition-all shadow-md active:scale-[0.98]"
                    >
                        次へ（質問に回答する）
                    </button>
                    <p className="text-center text-xs text-gray-400 mt-4 italic">
                        ※お預かりした属性情報は、アドバイス生成の目的以外には使用されません。
                    </p>
                </div>
            </form>
        </div>
    );
}
