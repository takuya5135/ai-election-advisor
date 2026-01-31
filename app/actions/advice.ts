"use server";

import { generateText } from "ai";
import { google } from "@ai-sdk/google";
// --- AI Advice ---

export async function generateVoteAdvice(electionName: string, userProfile: any, questions: any[], answers: any, comments: any) {
    try {
        // Step 1: Gather knowledge about the election (Simulating "Search" using Gemini's knowledge)
        const today = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
        const researchPrompt = `
        現在の日時は ${today} です。
        あなたは${electionName}に関するエキスパートです。
        以下の情報を、Google検索等の信頼できるソースから検索し、正確かつ具体的にリストアップしてください。
        
        1. **選挙区の候補者情報**:
           - 候補者名、年齢、所属政党
           - **主な公約・政策**（具体的かつ詳細に）
           - **これまでの実績**
           - **公式サイトおよびSNSのURL**（必ずURLを探してください）
        
        2. **比例代表・政党情報**:
           - 主要政党の名称
           - **政策の柱・マニフェスト**
           - **公式サイトのURL**（必ずURLを探してください）
           - **実績・理念**
           
        3. **選挙情勢**: 最新の支持率傾向や、いわゆる「当落線上の争い」などの情勢。
        4. **日程**: 公示日、投票日。
        `;

        const { text: electionContext } = await generateText({
            // @ts-expect-error - search grounding
            model: google("gemini-2.5-flash", { useSearchGrounding: true }),
            prompt: researchPrompt,
        });

        // Step 2: Generate Advice based on Context + User Data
        const prompt = `
    あなたは非常に戦略的で信頼できる選挙アドバイザーです。
    ユーザーに対して、国政選挙であれば「小選挙区」と「比例代表」のそれぞれについて、具体的な投票先のアドバイスを行ってください。
    
    【選挙データ（前提知識）】
    ${electionContext}
    
    【ユーザー情報】
    属性: ${JSON.stringify(userProfile)}
    
    【ユーザーの回答・コメント】
    ${questions.map((q: any) => `- ${q.text} [カテゴリ: ${q.category}]
      回答: ${answers[q.id]}
      コメント: ${comments[q.id] || "なし"}`).join("\n")}
    
    【重要：現政権への部門別評価】
    ユーザーは現政権（現在の政府）の各部門に対して以下の5段階評価（1:支持しない 〜 5:強く支持する）を与えています：
    - 経済・財政: ${answers['admin_econ'] || "未回答"}
    - 外交・安保: ${answers['admin_diplomacy'] || "未回答"}
    - 社会保障・内政: ${answers['admin_social'] || "未回答"}
    - 政治姿勢・統治: ${answers['admin_governance'] || "未回答"}
    - 多様性・人権: ${answers['admin_values'] || "未回答"}
    
    ---
    
    タスク:
    以下の構成で、ユーザーに最適な投票行動をMarkdown形式で提案してください。
    
    ## 1. あなたの政治スタンス（要約）
    ユーザーの立ち位置を「中道実利主義」「リベラル革新派」のように**20文字以内**で端的に表現してください。
    現政権への部門別評価（特に支持/非支持が顕著な分野）も反映させてください。
    
    ## 2. 推奨する投票先（結論）
    ### 【選挙区 / 首長選】（人物への投票）
    - **推奨候補者**: [氏名]（[政党]）
    - **理由**: ユーザーの[具体的な政策回答]や[政権の特定部門（経済等）への評価]と、候補者の[具体的な公約・実績・政権への立ち位置]が合致するため。
    
    ### 【比例代表 / 議会選】（政党への投票）
    ※国政選挙や、政党を選ぶ選挙の場合のみ記載。
    - **推奨政党**: [政党名]
    - **理由**: 政党の[政治理念・実績・与野党の立場]が、ユーザーの[重視する価値観]および[部門別の政権支持傾向]と一致するため。
    
    ## 3. この一票がもたらす変化（社会的インパクト）
    推奨候補・政党への投票が、社会にどのような具体的な変化をもたらすか記述してください。
    
    ## 4. 戦略的アドバイス
    情勢（${electionName}の勝敗ラインなど）を踏まえ、死票を避けるための次善の策や、戦略的な投票行動について助言してください。
    
    ## 5. 参考情報：候補者・政党の詳細データ
    今回分析の対象とした主な候補者・政党の情報を提示します。
    
    ### [選挙区の主な候補者]
    （候補者ごとに以下を記載）
    - **氏名**: [氏名]
    - **公約**: [具体的な公約]
    - **公式サイト**: [公式サイト・SNS](URL) （※必ずMarkdownリンク形式で、実際のURLを入れてください。見つからない場合はリンクなしのURLテキストまたは「なし」と記載）
    
    ### [主要政党の情報]
    （政党ごとに以下を記載）
    - **政党名**: [名称]
    - **理念・政策**: [理念や重要政策]
    - **公式サイト**: [公式サイト](URL) （※必ずMarkdownリンク形式で、実際のURLを入れてください）
    `;

        const { text } = await generateText({
            model: google("gemini-3-pro-preview"),
            prompt: prompt,
        });

        return { success: true, advice: text };
    } catch (error) {
        console.error("Advice Generation Error:", error);
        return { success: false, error: "Advice generation failed." };
    }
}
