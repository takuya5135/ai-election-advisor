"use server";

import { generateObject, generateText } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { AI_MODELS } from "@/app/lib/models";

// Detailed schema for deep analysis
const questionSchema = z.object({
    questions: z.array(z.object({
        id: z.string(),
        text: z.string(),
        category: z.string(),
        questionType: z.enum(["standard", "administration_evaluation"]).default("standard").describe("質問のタイプ。政権評価質問は必ず'administration_evaluation'にする。"),
        analysis: z.object({
            merit: z.string().describe("この政策を実行した際のメリット（または政権の功績）"),
            demerit: z.string().describe("この政策を実行した際のデメリット（または政権の罪）"),
            background: z.string().describe("この政策が政治課題になっている背景（または政権評価の争点）"),
            impact: z.object({
                global: z.string().describe("世界への影響"),
                national: z.string().describe("自国への影響"),
                social: z.string().describe("社会への影響"),
                economic: z.string().describe("経済への影響"),
                welfare: z.string().describe("福祉への影響"),
                culture: z.string().describe("文化への影響"),
                dailyLife: z.string().describe("回答者の国民生活への具体的な影響"),
            }),
        }),
    })).min(5).max(30),
});

const getBasePrompt = (electionName: string, userProfile: any) => {
    let toneInstruction = "";
    if (userProfile.age === "elementary") {
        toneInstruction = `
            【重要：小学生向けモード】
            ユーザーは小学生です。
            1. **質問文は極めて単純に**: 「消費税を上げるべきか」ではなく「お店で買い物をする時の税金を、もっと高くしてもいいと思いますか？」のように子供でも分かる言葉に噛み砕いてください。
            2. **分析（analysis）の各項目も小学生向けに**: メリット・デメリットの説明も、お小遣いや給食、学校生活などに例えて説明できるならそうしてください。
            3. **漢字制限**: 難しい漢字は使わず、ひらがなを多用してください。
            `;
    } else if (userProfile.age === "middle_high") {
        toneInstruction = `
            【重要：中高生向けモード】
            ユーザーは中高生です。
            1. **興味を持てるテーマに**: 将来の負担、教育の無償化、ネットのルールなど、若者に関心が高いテーマに関連付けて質問してください。
            2. **用語の補足**: 専門用語を使う場合は、その意味が文脈で分かるように工夫してください。
            `;
    }

    return `
    現在の日時は ${new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })} です。
    あなたは極めて高度で公平な政治・選挙アドバイザーです。
    ユーザーが「${electionName}」において、自分の価値観に合った投票先を選ぶための、政治的スタンスを判定する質問を作成してください。

    ユーザーのプロフィール:
    ${JSON.stringify(userProfile)}
    
    ${toneInstruction}

    【最重要】質問の形式と作成方針:
    1. **形式**: 全ての質問は、ユーザーが「共感する」「共感しない」で明確に答えられる**「一つの肯定的な主張」または「具体的な提案」の形**で作成してください。
       - **禁止事項**: 「〜すべきか、それとも〜すべきか？」といった**二者択一形式の質問は絶対に避けてください**。どちらに共感しているか判断できなくなるためです。
       - **良い例**: 「物価高騰対策として、消費税率を時限的に5%に引き下げるべきだ。」
    
    【必須：以下のカテゴリをバランスよく含めること】
    2. **政策の是非**: 具体的な政策の賛否（消費税、改憲、エネルギーなど）。
    3. **根本的な政治姿勢**: 「大きな政府か小さな政府か」「自己責任か公助か」「伝統か革新か」といった哲学的な価値観を問う質問。（例：「個人の自由よりも、社会の秩序や伝統を重んじるべきだ」）
    4. **政権・政党への好悪（重要）**: 政策の細部ではなく、**「現政権の雰囲気が好きか」「野党の批判的な姿勢に共感するか」といった、直感的な好悪**を問う質問も必ず含めてください。（例：「現在の内閣の顔ぶれや政治手法には、全体として好感が持てる」）
    
    これらをバランスよく組み合わせ、ユーザーの深層心理・政治的立ち位置を「共感度」で浮き彫りにする質問にしてください。
    `;
};

export async function generateElectionQuestions(electionName: string, userProfile: any, electionLevel?: string) {
    try {
        // Step 1: Research the election context
        // Enable search grounding to get the latest implementation details
        const researchPrompt = `
        現在の日時は ${new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })} です。
        あなたは${electionName}のエキスパートです。
        以下の情報を、Google検索等の信頼できるソースから検索し、具体的にリストアップしてください。

        ${electionLevel === "national" ? `
        3. **現政権の部門別評価**: 
           - 以下の5項目それぞれについて、現政権の功罪、実績、および今回の選挙での具体的な争点を総括してください：
             1. 経済・財政（国民の生活実感、物価高対策など）
             2. 外交・安全保障（国際的地位、国防、同盟関係など）
             3. 社会保障・内政（少子高齢化、国内インフラ、地方創生など）
             4. 政治姿勢・統治能力（政治資金問題、実行力、信頼性など）
             5. 多様性・人権・価値観（選択的夫婦別姓、LGBTQ+、社会の成熟度など）
        ` : ""}
        `;

        const { text: electionContext } = await generateText({
            // @ts-expect-error - The installed version's types might not support the settings object yet, but runtime should.
            model: google(AI_MODELS.FLASH, { useSearchGrounding: true }),
            prompt: researchPrompt,
        });

        // Step 2: Generate Questions based on Context
        const prompt = `
    ${getBasePrompt(electionName, userProfile)}

    【選挙の具体的背景（主要な争点）】
    ${electionContext}

    タスク:
    上記の方針と**実際の争点**に基づき、**20問**の質問を作成してください。
    各質問には、必ず一意のID（例: q1, q2, q3...）を付与してください。
    一般的な政治観だけでなく、**「${electionName}」で実際に議論されている具体的な政策（例えば${electionContext.slice(0, 20)}...など）**についての賛否を問う質問を必ず含めてください。
    
    各質問には、ユーザーが判断するための材料として、以下の詳細な分析（analysis）を必ず付与してください。
    - メリット・デメリットの公平な分析
    - 政治課題となっている背景
    - 各分野（世界、自国、社会、経済、福祉、国民生活）への具体的な影響

    ${electionLevel === "national" ? `
    【特別タスク: 部門別政権評価質問 (5段階評価)】
    - 通常の質問に加え、以下の5つの部門それぞれについて、現在の政権を総合的に評価する質問を**必ず**作成してください。
    - これらの質問は、ユーザーが「1:全く支持しない」〜「5:強く支持する」の5段階で評価するためのものです。
    - **質問タイプ**: \`questionType\` プロパティを必ず \`"administration_evaluation"\` に設定してください。これ以外は認めません。
    - **ID**: IDは必ず以下固定で設定してください: 'admin_econ', 'admin_diplomacy', 'admin_social', 'admin_governance', 'admin_values'
    
    - **質問文のテンプレート**:
      1. 'admin_econ': 「経済・財政政策（生活実感や物価高対応など）における現政権の実績を、あなたはどの程度評価しますか？」
      2. 'admin_diplomacy': 「外交・安全保障（国際的地位や安全維持など）における現政権の姿勢を、あなたはどの程度評価しますか？」
      3. 'admin_social': 「社会保障・内政（子育て支援や地方創生など）における現政権の取り組みを、あなたはどの程度評価しますか？」
      4. 'admin_governance': 「政治姿勢・統治能力（信頼性や実行力など）における現政権のあり方を、あなたはどの程度評価しますか？」
      5. 'admin_values': 「多様性・人権・価値観（ジェンダーやマイノリティ権利など）における現政権の社会観を、あなたはどの程度評価しますか？」

    - 各質問の分析(analysis)には、上述の「現政権の部門別評価」のリサーチ結果に基づき、その部門における具体的な功罪と争点を記載してください。
    ` : ""}
    `;

        const { object } = await generateObject({
            model: google(AI_MODELS.THINKING), // Deep Thinking Mode
            schema: questionSchema,
            prompt: prompt,
        });

        // Deep Thinkingモデルは思考プロセスを含めるため生成が素晴らしいが、
        // IDが重複する可能性がゼロではないため、重複チェックしてユニークにする（念のため）
        // 特に admin_ 系が含まれているかチェック
        const hasAdminInfo = object.questions.some(q => q.questionType === "administration_evaluation");
        if (electionLevel === "national" && !hasAdminInfo) {
            console.warn("Administration evaluation questions were likely not generated properly.");
        }

        return { success: true, data: object.questions };
    } catch (error) {
        console.error("AI Generation Error:", error);
        return { success: false, error: "AI Generation Failed" };
    }
}

// Single Replacement Question
export async function generateSingleReplacementQuestion({
    electionName,
    userProfile,
    excludedQuestionIds,
    currentQuestionText
}: {
    electionName: string;
    userProfile: any;
    excludedQuestionIds: string[];
    currentQuestionText: string;
}) {
    try {
        const prompt = `
        ${getBasePrompt(electionName, userProfile)}

        【タスク: 質問の差し替え】
        ユーザーは以下の質問に対して「関心がない/分からない」として、別の質問を求めています。
        拒否された質問: 「${currentQuestionText}」

        このユーザーのために、**全く新しい切り口の質問を1つだけ**作成してください。
        
        【要件】
        1. 拒否された質問("${currentQuestionText}")とは**異なるテーマ**を選んでください。（例: 経済系が拒否されたなら、社会・価値観系の質問にするなど）
        2. 特に**「根本的な政治姿勢（大きな政府vs小さな政府）」**や**「政権への好悪」**のように、政策知識がなくても直感的に答えやすいテーマを優先してください。
        3. IDは "replace_${Date.now()}" のようなユニークなものにしてください。

        既出のIDリスト（これらとも重複しないこと）: ${excludedQuestionIds.join(", ")}
        `;

        const singleQuestionSchema = z.object({
            question: z.object({
                id: z.string(),
                text: z.string(),
                category: z.string(),
                questionType: z.literal("standard"),
                analysis: z.object({
                    merit: z.string(),
                    demerit: z.string(),
                    background: z.string(),
                    impact: z.object({
                        global: z.string(),
                        national: z.string(),
                        social: z.string(),
                        economic: z.string(),
                        welfare: z.string(),
                        culture: z.string(),
                        dailyLife: z.string(),
                    }),
                }),
            })
        });

        const { object } = await generateObject({
            model: google(AI_MODELS.FLASH),
            schema: singleQuestionSchema,
            prompt: prompt,
        });

        return { success: true, data: object.question };

    } catch (error) {
        console.error("Single Question Generation Error:", error);
        return { success: false, error: "Failed to generate replacement question" };
    }
}

export async function generateAdditionalQuestions(electionName: string, userProfile: any, previousQuestions: any[], previousAnswers: any, previousComments: any) {
    try {
        const prompt = `
    ${getBasePrompt(electionName, userProfile)}

    現在の状況:
    ユーザーは既に以下の質問に回答しました。追加の質問を作成する際は、以下の点に厳守してください：
    1. **既出の質問と重複しない内容にすること**: 下記のリストにある既出の質問文やその意図と**重複する質問は絶対に避けてください**。全く新しい角度から質問してください。
    2. **基本的な政治スタンスの深掘り**: 「大きな政府か小さな政府か（公助か自助か）」「自由競争（新自由主義）か公平性（再分配）か」「伝統的価値観か多様性か」といった、より根本的な政治思想や哲学を問う質問を重点的に増やしてください。
    3. **ユーザーの反応に合わせた深掘り**: ユーザーが「分からない」と答えたり、コメントで特定の関心を示している場合は、そこを分かりやすく噛み砕いて深掘りしてください。

    これまでの質問と回答・コメント:
    ${previousQuestions.map((q: any) => `- [${q.id}] ${q.text} [${q.category}] -> 回答: ${previousAnswers[q.id]} ${previousComments[q.id] ? `(コメント: ${previousComments[q.id]})` : ""}`).join("\n")}

    タスク:
    ユーザーは「分からない」「どちらでもない」と回答する傾向があります。これは個別の政策に詳しくないか、関心が薄い可能性があります。
    そのため、ユーザーの**「根本的な政治的価値観」や「直感的な好み」**を浮き彫りにするための **追加の質問を必ず10問** 作成してください。

    【質問作成の指針】
    以下の3つの観点をバランスよく含めてください：
    1. **政府の役割と経済観 (4問)**: 
       - 「社会保障を充実させるためなら、税金が高くなっても仕方ない（大きな政府）」 vs 「税金を安くして、サービスは民営化や自己責任に任せるべきだ（小さな政府）」
       - 「格差を是正するために、富裕層への課税を強化すべきだ」など。
    2. **社会観と価値観 (3問)**:
       - 「日本の伝統や文化を守ることを最優先すべきだ（保守）」 vs 「時代に合わせて、社会の仕組みや家族のあり方を変えていくべきだ（リベラル）」
       - 「外国人の受け入れをもっと積極的に進めるべきだ」など。
    3. **政権・政治家への直感的な評価 (3問)**:
       - 具体的な政策の是非ではなく、「現在の首相のリーダーシップや人柄に好感を持っている」「今の内閣の顔ぶれは信頼できると感じる」といった、感情的・直感的な評価を問うもの。

    各質問には、以前の質問と重複しない一意のID（例: add_q_${Date.now()}_1...）を必ず付与してください。
    詳細な分析（analysis）も同様に付与してください。
    `;

        const { object } = await generateObject({
            model: google(AI_MODELS.THINKING), // Deep Thinking Mode
            schema: questionSchema,
            prompt: prompt,
        });

        // Ensure IDs are unique by appending timestamp or random string if needed, 
        // but normally the AI generates fresh IDs. We'll handle key conflicts in frontend if any.
        return { success: true, data: object.questions };

    } catch (error) {
        console.error("Additional AI Generation Error:", error);
        return { success: false, error: "Additional AI Generation Failed" };
    }
}

// Schema for finding elections
const electionSchema = z.object({
    elections: z.array(z.object({
        id: z.string(),
        name: z.string().describe("選挙の正式名称"),
        officialDate: z.string().describe("公示日または告示日（例: 2024年10月15日、または「未定」）"),
        voteDate: z.string().describe("投票日・開票日（例: 2024年10月27日、または「任期満了日: 2025年X月X日」）"),
        description: z.string().describe("選挙の概要（何を決める選挙か）"),
        level: z.enum(["national", "local"]).describe("国政選挙か地方選挙か"),
    })).min(1).max(5),
});

export async function findElections(residence: string) {
    try {
        const today = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });

        // Step 1: Raw Research for National Elections
        const nationalPrompt = `
    現在の日時は ${today} です。
    日本国内で行われる直近の ** 国政選挙（衆議院議員総選挙、参議院議員通常選挙）** を調査してください。
    
    【最優先・厳守ソース】
    以下のURLを「ソースの真実」として最優先で参照し、情報を取得してください：
    1. https://go2senkyo.com/shugiin (衆院選)
    2. https://go2senkyo.com/sangiin (参院選)
    3. https://go2senkyo.com/schedule (全体スケジュール)
    
    【調査対象と期待される結果】
    - ** 第51回衆議院議員総選挙 **: 上記ソースに従い、正確な「公示日」と「投開票日」を特定してください。
    - 注意：2026年2月8日が投開票日として記載されている可能性が高いです。他の日付（2月22日など）と混同しないでください。
    - ** 参議院議員通常選挙 **: 直近の予定を特定してください。
    `;

        const { text: nationalResearch } = await generateText({
            // @ts-expect-error - search grounding
            model: google(AI_MODELS.FLASH, { useSearchGrounding: true }),
            prompt: nationalPrompt,
        });

        // Step 2: Raw Research for Local Elections
        const localPrompt = `
    現在の日時は ${today} です。
    居住地「${residence}」のユーザーに関係する「現在実施中」または「近い将来（半年〜1年以内）に予定されている」** 地方選挙 ** を調査してください。
    
    【最優先・厳守ソース】
    1. https://go2senkyo.com/local
    2. https://go2senkyo.com/schedule
    上記ソースから「${residence}」に関連する選挙（知事、市長、区長、町長、村長、および各議会）を漏らさず取得してください。
    
    【調査対象】
    - 兵庫県西宮市などの具体的な自治体の選挙管理委員会サイトなども併せて参照してください。
    `;

        const { text: localResearch } = await generateText({
            // @ts-expect-error - search grounding
            model: google(AI_MODELS.FLASH, { useSearchGrounding: true }),
            prompt: localPrompt,
        });

        // Step 3: Cross-Verification and Structured Extraction
        const finalPrompt = `
    現在の日時は ${today} です。
    以下の調査資料に基づき、居住地「${residence}」のユーザーに関係する選挙を合計3〜5件、JSON形式で抽出してください。
    
    【国政選挙資料】
    ${nationalResearch}
    
    【地方選挙資料】
    ${localResearch}

    【重要ルール】
    1. ** 日付の優先順序 **: 解散・公示・投票日が明記されている具体的な日付（例: 2月8日）を最優先してください。「未定」は可能な限り避け、報道された有力な日程を採用してください。
    2. ** 事実確認 **: 第51回衆議院議員総選挙が2026年2月8日に行われるという情報がある場合は、必ずそれを含めてください。
    3. ** 出力形式 **: schemaに従って正確に出力してください。
    `;

        const { object } = await generateObject({
            model: google(AI_MODELS.FLASH),
            schema: electionSchema,
            prompt: finalPrompt,
        });

        return { success: true, data: object.elections };
    } catch (error) {
        console.error("Election Search Error:", error);
        return { success: false, error: "Election Search Failed" };
    }
}
