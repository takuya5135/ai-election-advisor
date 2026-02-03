
import fs from 'fs';
import path from 'path';
import { translateQuestionsForAge } from "../app/actions/ai";

// Manually load .env.local
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const envFile = fs.readFileSync(envPath, 'utf8');
        envFile.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["']|["']$/g, '');
                process.env[key] = value;
            }
        });
    }
} catch (e) {
    console.warn("Failed to load .env.local manually:", e);
}

const sampleQuestions = [
    {
        "id": "admin_econ",
        "text": "経済・財政政策（生活実感や物価高対応など）における現政権の実績を、あなたはどの程度評価しますか？",
        "category": "Economy",
        "questionType": "administration_evaluation",
        "analysis": {
            "merit": "株価維持や名目賃金の上昇が見られる。",
            "demerit": "インフレに賃金が追いつかず、実益が乏しいとの批判がある。",
            "background": "アベノミクス以降の出口戦略と物価高対策の成否が問われている。",
            "impact": {
                "dailyLife": "生活費の負担感に直結。",
                "economic": "景気動向を左右。",
                "social": "格差の拡大・縮小。",
                "national": "経済力の維持。",
                "global": "円相場への影響。",
                "welfare": "財源確保。",
                "culture": "なし"
            }
        }
    }
];

async function runTest() {
    console.log("=== Testing Elementary School Adjustment ===");
    const elementaryResult = await translateQuestionsForAge([...sampleQuestions], { age: "elementary" });
    console.log(JSON.stringify(elementaryResult[0], null, 2));

    console.log("\n=== Testing Senior Adjustment ===");
    const seniorResult = await translateQuestionsForAge([...sampleQuestions], { age: "senior" });
    console.log(JSON.stringify(seniorResult[0], null, 2));
}

runTest().catch(console.error);
