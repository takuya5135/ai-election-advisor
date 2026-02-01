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
        occupation: "",
        economicStatus: "standard",
    });
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        // Load stored profile if available
        const storedProfile = localStorage.getItem("user_profile");
        if (storedProfile) {
            setFormData(JSON.parse(storedProfile));
        }
    }, []);

    const fetchSuggestions = async (query: string) => {
        if (!query || query.length < 2) {
            setSuggestions([]);
            return;
        }

        setIsSearching(true);
        try {
            // 国土地理院の住所検索API
            const response = await fetch(`https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            // 重複を排除して正確な住所文字列を抽出
            const results = data
                .map((item: any) => item.properties.title)
                .filter((value: string, index: number, self: string[]) => self.indexOf(value) === index)
                .slice(0, 10);
            setSuggestions(results);
            setShowSuggestions(results.length > 0);
        } catch (error) {
            console.error("Address search error:", error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Save profile for future
        localStorage.setItem("user_profile", JSON.stringify(formData));
        router.push("/elections"); // Next step: Select election based on residence
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        if (name === "residence") {
            const timer = setTimeout(() => fetchSuggestions(value), 300);
            return () => clearTimeout(timer);
        }
    };

    const handleSelectSuggestion = (suggestion: string) => {
        setFormData((prev) => ({ ...prev, residence: suggestion }));
        setShowSuggestions(false);
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8 py-8">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-indigo-900 border-b-2 border-indigo-100 pb-2">プロフィール設定</h2>
                <p className="text-gray-600">
                    あなたの属性に合わせて、最適な選挙情報とアドバイスを提供します。<br />
                    入力情報はブラウザにのみ保存され、後で変更も可能です。
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">ニックネーム <span className="text-red-500">*</span></label>
                    <input
                        name="nickname"
                        required
                        placeholder="アドバイザー"
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                        value={formData.nickname}
                        onChange={handleChange}
                    />
                </div>

                <div className="space-y-2 relative">
                    <label className="text-sm font-bold text-gray-700">居住地（町名まで） <span className="text-red-500">*</span></label>
                    <div className="relative">
                        <input
                            name="residence"
                            required
                            placeholder="例: 西宮市六湛寺町（入力すると候補が出ます）"
                            autoComplete="off"
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                            value={formData.residence}
                            onChange={(e) => {
                                const val = e.target.value;
                                setFormData(prev => ({ ...prev, residence: val }));
                                // シンプルなデバウンス代わり
                                fetchSuggestions(val);
                            }}
                            onFocus={() => {
                                if (suggestions.length > 0) setShowSuggestions(true);
                            }}
                            onBlur={() => {
                                // クリックイベントを拾うために少し遅延させる
                                setTimeout(() => setShowSuggestions(false), 200);
                            }}
                        />
                        {isSearching && (
                            <div className="absolute right-3 top-3.5">
                                <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-gray-500">選挙区の正確な判定に使用します。町名まで入力してください。</p>

                    {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                            {suggestions.map((suggestion, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => handleSelectSuggestion(suggestion)}
                                    className="w-full text-left p-3 hover:bg-indigo-50 transition-colors border-b border-gray-50 last:border-0 text-sm"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">年代</label>
                        <input
                            type="number"
                            name="age"
                            required
                            min="18"
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900"
                            placeholder="例: 25"
                            value={formData.age}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">家族構成（任意）</label>
                        <input
                            name="family"
                            placeholder="例: 既婚・子供2人、独身など"
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={formData.family}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">経済状況（任意）</label>
                        <select
                            name="economicStatus"
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
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

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">職業（任意）</label>
                        <select
                            name="occupation"
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
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
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        className="w-full bg-indigo-600 text-white p-4 rounded-xl font-bold hover:bg-indigo-700 hover:shadow-lg transform hover:-translate-y-0.5 transition-all shadow-md active:scale-[0.98]"
                    >
                        自分に合った選挙を探す
                    </button>
                    <p className="text-center text-xs text-gray-400 mt-4 italic">
                        ※お預かりした属性情報は、アドバイス生成の目的以外には使用されません。
                    </p>
                </div>
            </form>
        </div>
    );
}
