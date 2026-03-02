import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Force Node.js runtime — required for pdf-parse and Buffer
export const runtime = "nodejs";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    temperature: 0.2,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 4096,
    responseMimeType: "application/json",
  },
});

interface AnalysisResult {
  atsScore: number;
  skillMatch: number;
  formattingScore: number;
  missingSkills: string[];
  improvements: string[];
}

function buildPrompt(resumeText: string, jobDescription: string): string {
  return `You are an expert ATS (Applicant Tracking System) resume analyzer with deep knowledge of HR practices and recruitment.

Analyze the provided resume against the job description and return ONLY a valid JSON object with no markdown, no code blocks, and no extra text.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Evaluate strictly on these criteria and return this exact JSON shape:
{
  "atsScore": <integer 0-100, overall ATS compatibility considering keywords, structure, formatting signals>,
  "skillMatch": <integer 0-100, percentage of required/preferred skills from the JD found in the resume>,
  "formattingScore": <integer 0-100, quality of resume structure: clear sections, bullet points, dates, contact info, etc.>,
  "missingSkills": [<list of specific skills, technologies, or qualifications mentioned in the JD but absent from the resume>],
  "improvements": [<list of 4-6 specific, actionable suggestions to improve this resume for this job>]
}

Scoring rules:
- atsScore: Penalize for missing keywords, keyword stuffing, tables, graphics, unusual fonts, missing sections, no quantified achievements.
- skillMatch: Count exact and near-exact skill matches from the JD. Hard skills count more than soft skills.
- formattingScore: Reward clear section headers, reverse chronological order, consistent date formats, proper contact info, readable bullet points.
- missingSkills: Be specific (e.g., "Docker", "Agile methodology", "3+ years Python" — not vague categories).
- improvements: Be actionable (e.g., "Add quantified achievements to your Software Engineer role at XYZ", not "Add more details").

Return ONLY the raw JSON object.`;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const pdfFile = formData.get("pdf") as File | null;
    const jobDescription = formData.get("jobDescription") as string | null;

    if (!pdfFile) {
      return NextResponse.json(
        { error: "No PDF file provided." },
        { status: 400 }
      );
    }

    if (!jobDescription || jobDescription.trim().length < 20) {
      return NextResponse.json(
        { error: "Job description is too short. Please provide more detail." },
        { status: 400 }
      );
    }

    if (pdfFile.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Uploaded file must be a PDF." },
        { status: 400 }
      );
    }

    const MAX_SIZE_MB = 5;
    if (pdfFile.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `PDF file must be smaller than ${MAX_SIZE_MB}MB.` },
        { status: 400 }
      );
    }

    // Extract text from PDF.
    // Import the internal module directly to bypass index.js which reads a
    // test file on load and crashes Next.js routes at initialization time.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse/lib/pdf-parse.js");
    const arrayBuffer = await pdfFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const pdfData = await pdfParse(buffer);
    const resumeText = (pdfData.text as string).trim();

    if (!resumeText || resumeText.length < 50) {
      return NextResponse.json(
        {
          error:
            "Could not extract readable text from this PDF. Please ensure the PDF is not image-only or scanned.",
        },
        { status: 422 }
      );
    }

    // Call Gemini
    const prompt = buildPrompt(resumeText, jobDescription.trim());
    const result = await model.generateContent(prompt);
    const rawText = result.response.text().trim();

    // Safely parse JSON — fall back to regex extraction if wrapped in markdown
    let analysis: AnalysisResult;
    try {
      analysis = JSON.parse(rawText);
    } catch {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return NextResponse.json(
          { error: "AI returned an unexpected format. Please try again." },
          { status: 500 }
        );
      }
      analysis = JSON.parse(jsonMatch[0]);
    }

    // Validate and clamp all scores to 0-100
    const validated: AnalysisResult = {
      atsScore: Math.min(100, Math.max(0, Math.round(Number(analysis.atsScore) || 0))),
      skillMatch: Math.min(100, Math.max(0, Math.round(Number(analysis.skillMatch) || 0))),
      formattingScore: Math.min(100, Math.max(0, Math.round(Number(analysis.formattingScore) || 0))),
      missingSkills: Array.isArray(analysis.missingSkills)
        ? analysis.missingSkills.slice(0, 15)
        : [],
      improvements: Array.isArray(analysis.improvements)
        ? analysis.improvements.slice(0, 8)
        : [],
    };

    return NextResponse.json(validated);
  } catch (error) {
    console.error("[analyze-resume] Error:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
