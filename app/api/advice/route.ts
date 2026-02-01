import { NextResponse } from "next/server";
import { generateVoteAdvice } from "@/app/actions/advice";

// Set timeout to 60 seconds to avoid E394 error
export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { userProfile, questions, answers, comments, electionContext, candidates } = body;

        const result = await generateVoteAdvice({
            userProfile,
            questions,
            answers,
            comments,
            electionContext,
            candidates
        });

        if (result.success) {
            return NextResponse.json(result);
        } else {
            return NextResponse.json({ success: false, error: result.error }, { status: 500 });
        }
    } catch (error: any) {
        console.error("API Route Error:", error);
        return NextResponse.json({
            success: false,
            error: error.message || "Internal Server Error"
        }, { status: 500 });
    }
}
