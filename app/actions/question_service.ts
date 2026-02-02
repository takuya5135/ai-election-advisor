"use server";

import fs from 'fs/promises';
import path from 'path';

export async function getQuestionsFromPool(userProfile: any, electionContext: string) {
    try {
        const poolPath = path.join(process.cwd(), 'app', 'lib', 'data', 'question_pool.json');
        const poolData = await fs.readFile(poolPath, 'utf-8');
        const pool = JSON.parse(poolData);

        const allQuestions = pool.questions;

        // 1. Separate "Administration Evaluation" questions (Mandatory)
        const adminQuestions = allQuestions.filter((q: any) => q.questionType === "administration_evaluation");

        // 2. Separate Standard Questions by Category
        const standardQuestions = allQuestions.filter((q: any) => q.questionType === "standard");

        // Group by category to ensure balance
        const categories = {
            "Economy": [] as any[],
            "Social": [] as any[],
            "Diplomacy/Governance": [] as any[],
            "Values": [] as any[],
            "Future": [] as any[]
        };

        standardQuestions.forEach((q: any) => {
            if (categories[q.category as keyof typeof categories]) {
                categories[q.category as keyof typeof categories].push(q);
            } else {
                // Fallback for unknown categories if any
                categories["Values"].push(q);
            }
        });

        // 3. Select Questions (Total ~15 standard + 5 admin = 20 questions)
        // Stratified Sampling: Pick 3-4 from each major category
        const selectedStandard: any[] = [];

        const pickRandom = (arr: any[], count: number) => {
            const shuffled = [...arr].sort(() => 0.5 - Math.random());
            return shuffled.slice(0, count);
        };

        selectedStandard.push(...pickRandom(categories["Economy"], 4));
        selectedStandard.push(...pickRandom(categories["Social"], 4));
        selectedStandard.push(...pickRandom(categories["Diplomacy/Governance"], 4));
        selectedStandard.push(...pickRandom(categories["Values"], 3));
        selectedStandard.push(...pickRandom(categories["Future"], 2)); // Add future/AI topics

        // Shuffle the standard questions so they are mixed
        const finalStandard = selectedStandard.sort(() => 0.5 - Math.random());

        // 4. Combine: Standard Questions FIRST, then Admin Questions
        const finalQuestions = [...finalStandard, ...adminQuestions];

        return { success: true, data: finalQuestions };

    } catch (error) {
        console.error("Values Pool Error:", error);
        return { success: false, error: "Failed to load questions." };
    }
}

export async function getAdditionalQuestionsFromPool(currentQuestionIds: string[], count: number = 5) {
    try {
        const poolPath = path.join(process.cwd(), 'app', 'lib', 'data', 'question_pool.json');
        const poolData = await fs.readFile(poolPath, 'utf-8');
        const pool = JSON.parse(poolData);

        const allQuestions = pool.questions;

        // Filter for "standard" questions only (exclude admin eval) and those not already seen
        const availableQuestions = allQuestions.filter((q: any) =>
            q.questionType === "standard" && !currentQuestionIds.includes(q.id)
        );

        if (availableQuestions.length < count) {
            // Pool is effectively exhausted (or not enough for a full batch)
            // We return success: false to trigger fallback to live AI
            return { success: false, reason: "exhausted" };
        }

        // Randomly pick 'count' questions
        const shuffled = availableQuestions.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, count);

        return { success: true, data: selected };

    } catch (error) {
        console.error("Additional Pool Error:", error);
        return { success: false, error: "Failed to load additional questions." };
    }
}
