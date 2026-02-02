"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ProloguePage() {
    const router = useRouter();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        setVisible(true);
    }, []);

    const handleNext = () => {
        router.push("/questions/generate");
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black text-white overflow-hidden relative selection:bg-red-900 selection:text-white">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-900 via-black to-black opacity-80 z-0"></div>

            <div className={`z-10 max-w-2xl w-full space-y-12 transition-all duration-1000 transform ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>

                {/* Header Section */}
                <div className="text-center space-y-4">
                    <p className="text-red-500 font-bold tracking-[0.2em] text-sm animate-pulse">PROLOGUE</p>
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter leading-tight">
                        <span className="block text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-500">2026年</span>
                        <span className="block mt-2">第51回衆議院議員総選挙</span>
                    </h1>
                    <div className="w-24 h-1 bg-red-600 mx-auto mt-6 rounded-full"></div>
                </div>

                {/* Main Content */}
                <div className="space-y-10 font-serif leading-loose">

                    <section className="space-y-4">
                        <p className="text-lg md:text-xl font-medium text-gray-300">
                            2026年第51回衆院選は、26年続いた自公体制が終焉し、
                            <span className="text-white font-bold border-b border-white/30 mx-1">「自民・維新」</span>
                            対
                            <span className="text-white font-bold border-b border-white/30 mx-1">「中道改革連合（立憲・公明）」</span>
                            という新たな二大勢力が激突する、戦後政治の<span className="text-red-500 font-bold">歴史的分水嶺</span>です。
                        </p>
                    </section>

                    <div className="grid md:grid-cols-2 gap-8 border-t border-gray-800 pt-8">
                        <div className="space-y-3">
                            <h3 className="text-xl font-bold text-gray-100 flex items-center">
                                <span className="text-red-600 mr-2">■</span> 歴史的位置づけ
                            </h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                この選挙は、1955年体制の成立や2009年の政権交代を凌駕する<strong className="text-gray-200">「政治構造の地殻変動」</strong>と位置づけられます。
                                長年の安定基軸だった自公の解消と、思想的親和性に基づく自維の接近、そして現実路線へ舵を切った中道勢力の結集は、
                                従来の「保守対リベラル」という枠組みを根底から塗り替えました。
                            </p>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-xl font-bold text-gray-100 flex items-center">
                                <span className="text-blue-600 mr-2">■</span> 国家の未来への影響
                            </h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                日本の未来は、この審判により二分されます。
                                自維が勝てば、積極財政と防衛力強化による<strong className="text-gray-200">「経済ナショナリズムと攻めの統治」</strong>へ。
                                中道連合が勝てば、教育や福祉を重視する<strong className="text-gray-200">「生活者ファーストの再建」</strong>へと国家の舵が切られます。
                            </p>
                        </div>
                    </div>

                    <p className="text-center text-gray-400 text-sm italic pt-4">
                        多極化が進む中、この選択は日本の生存戦略そのものを決定づける重い意味を持っています。
                    </p>
                </div>

                {/* Button Section */}
                <div className="pt-8 text-center">
                    <button
                        onClick={handleNext}
                        className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-red-700/80 font-serif rounded-sm overflow-hidden focus:outline-none hover:bg-red-600 hover:scale-105"
                    >
                        <span className="absolute w-0 h-0 transition-all duration-500 ease-out bg-white rounded-full group-hover:w-56 group-hover:h-56 opacity-10"></span>
                        <span className="relative flex items-center tracking-widest">
                            歴史的選択へ進む
                            <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </span>
                    </button>
                    <p className="mt-4 text-xs text-gray-600 uppercase tracking-widest">The 51st General Election of Members of the House of Representatives</p>
                </div>
            </div>
        </div>
    );
}
