const { GoogleGenAI } = require("@google/genai")
const { z } = require("zod")
const { zodToJsonSchema } = require("zod-to-json-schema")
const puppeteer = require("puppeteer")

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})

const MODEL = "gemini-3-flash-preview"

const questionSchema = z.object({
    question: z.string(),
    intention: z.string(),
    answer: z.string(),
    difficulty: z.enum(["easy", "medium", "hard"]),
    answerStructure: z.string(),
    evaluationCriteria: z.array(z.string())
})

const roadmapPhaseSchema = z.object({
    week: z.number(),
    focus: z.string(),
    tasks: z.array(z.string())
})

const structuredRoadmapSchema = z.object({
    milestones: z.array(z.object({
        title: z.string(),
        description: z.string(),
        targetDay: z.number()
    })),
    recommendedProjects: z.array(z.object({
        title: z.string(),
        description: z.string(),
        technologies: z.array(z.string())
    })),
    certifications: z.array(z.object({
        name: z.string(),
        provider: z.string(),
        priority: z.enum(["high", "medium", "low"])
    })),
    technologies: z.array(z.object({
        name: z.string(),
        priority: z.enum(["high", "medium", "low"]),
        reason: z.string()
    })),
    phases: z.array(roadmapPhaseSchema)
})

const interviewReportSchema = z.object({
    title: z.string(),
    matchScore: z.number(),
    interviewReadinessScore: z.number(),
    atsBreakdown: z.object({
        formatting: z.number(),
        keywordOptimization: z.number(),
        sectionCompleteness: z.number(),
        readability: z.number(),
        overallAts: z.number()
    }),
    skillMatchPercentage: z.number(),
    experienceMatchPercentage: z.number(),
    keywordCoverage: z.number(),
    missingSkills: z.array(z.string()),
    missingKeywords: z.array(z.string()),
    projectRelevance: z.array(z.object({
        project: z.string(),
        relevance: z.number(),
        feedback: z.string()
    })),
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    recommendations: z.array(z.object({
        priority: z.enum(["high", "medium", "low"]),
        area: z.string(),
        suggestion: z.string()
    })),
    resumeImprovements: z.array(z.object({
        section: z.string(),
        issue: z.string(),
        original: z.string(),
        improved: z.string(),
        impact: z.enum(["high", "medium", "low"])
    })),
    readinessBreakdown: z.object({
        atsScore: z.number(),
        technicalReadiness: z.number(),
        behavioralReadiness: z.number(),
        projectStrength: z.number(),
        skillCoverage: z.number()
    }),
    technicalQuestions: z.array(questionSchema),
    behavioralQuestions: z.array(questionSchema),
    situationalQuestions: z.array(questionSchema),
    codingQuestions: z.array(questionSchema),
    systemDesignQuestions: z.array(questionSchema),
    skillGaps: z.array(z.object({
        skill: z.string(),
        severity: z.enum(["low", "medium", "high"]),
        currentLevel: z.number(),
        requiredLevel: z.number(),
        category: z.string()
    })),
    preparationPlan: z.array(z.object({
        day: z.number(),
        focus: z.string(),
        tasks: z.array(z.string())
    })),
    roadmap30: structuredRoadmapSchema,
    roadmap60: structuredRoadmapSchema,
    roadmap90: structuredRoadmapSchema
})

async function generateWithSchema(prompt, schema) {
    const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(schema)
        }
    })
    return JSON.parse(response.text)
}

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {
    const prompt = `You are an expert career coach and ATS analyst. Analyze the candidate against the target job and produce a comprehensive interview preparation report.

RESUME:
${resume || "Not provided"}

SELF DESCRIPTION:
${selfDescription || "Not provided"}

JOB DESCRIPTION:
${jobDescription}

Requirements:
- Provide detailed ATS breakdown scores (formatting, keyword optimization, section completeness, readability, overall ATS).
- Calculate skill match %, experience match %, and keyword coverage %.
- List missing skills and missing keywords from the job description.
- Analyze project relevance with scores and feedback.
- List strengths, weaknesses, and prioritized improvement recommendations.
- Provide resume section improvements with original vs improved text side-by-side.
- Generate 5 technical, 5 behavioral, 4 situational, 4 coding, and 3 system design questions with difficulty, answer structure, and evaluation criteria.
- Create skill gap analysis with current vs required levels and categories.
- Create a 7-day preparation plan (preparationPlan) and structured 30-day, 60-day, and 90-day roadmaps with milestones, projects, certifications, technologies, and weekly phases.
- Calculate interviewReadinessScore combining ATS, technical, behavioral, project strength, and skill coverage.
- matchScore should reflect overall job fit (0-100).
- Be specific to the job description and candidate profile.`

    return generateWithSchema(prompt, interviewReportSchema)
}

async function generatePdfFromHtml(htmlContent) {
    const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] })
    const page = await browser.newPage()
    await page.setContent(htmlContent, { waitUntil: "networkidle0" })
    const pdfBuffer = await page.pdf({
        format: "A4",
        margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" }
    })
    await browser.close()
    return pdfBuffer
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {
    const resumePdfSchema = z.object({
        html: z.string()
    })

    const prompt = `Generate an ATS-friendly resume tailored for this job.

RESUME: ${resume || "Not provided"}
SELF DESCRIPTION: ${selfDescription || "Not provided"}
JOB DESCRIPTION: ${jobDescription}

Return JSON with "html" field containing professional, simple HTML resume (1-2 pages). Human-written tone, ATS-friendly, highlight relevant skills.`

    const jsonContent = await generateWithSchema(prompt, resumePdfSchema)
    return generatePdfFromHtml(jsonContent.html)
}

const mockQuestionSchema = z.object({
    question: z.string(),
    questionType: z.string(),
    difficulty: z.enum(["easy", "medium", "hard"])
})

async function generateMockQuestion({ report, previousExchanges }) {
    const history = previousExchanges.map((e, i) =>
        `Q${i + 1} (${e.questionType}, ${e.difficulty}): ${e.question}\nAnswer: ${e.userAnswer || "No answer"}\nScore: ${e.score ?? "N/A"}\nFeedback: ${e.feedback || ""}`
    ).join("\n\n")

    const prompt = `You are conducting a mock interview for: ${report.title}

JOB DESCRIPTION: ${report.jobDescription}
CANDIDATE RESUME: ${report.resume || report.selfDescription || "Not provided"}
SKILL GAPS: ${report.skillGaps?.map(g => g.skill).join(", ") || "None identified"}

PREVIOUS EXCHANGES:
${history || "No previous questions yet."}

Ask ONE new interview question. Adapt based on previous answers — probe weak areas or go deeper on strong topics.
Choose appropriate type (technical, behavioral, situational, coding, system_design) and difficulty.
Do NOT repeat previous questions.`

    return generateWithSchema(prompt, mockQuestionSchema)
}

const mockEvaluationSchema = z.object({
    score: z.number(),
    feedback: z.string(),
    strengths: z.array(z.string()),
    improvements: z.array(z.string())
})

async function evaluateMockAnswer({ question, questionType, difficulty, userAnswer, report }) {
    const prompt = `Evaluate this mock interview answer.

ROLE: ${report.title}
QUESTION TYPE: ${questionType}
DIFFICULTY: ${difficulty}
QUESTION: ${question}
CANDIDATE ANSWER: ${userAnswer}

JOB CONTEXT: ${report.jobDescription.slice(0, 1500)}

Score 0-100. Provide constructive feedback, strengths, and specific improvements.`

    return generateWithSchema(prompt, mockEvaluationSchema)
}

const coachResponseSchema = z.object({
    response: z.string()
})

async function generateCoachResponse({ report, message, chatHistory }) {
    const history = chatHistory.map(m => `${m.role}: ${m.content}`).join("\n")

    const prompt = `You are an AI Career Coach with full context on this candidate's profile.

ROLE TARGET: ${report.title}
MATCH SCORE: ${report.matchScore}%
INTERVIEW READINESS: ${report.interviewReadinessScore ?? report.matchScore}%
ATS BREAKDOWN: ${JSON.stringify(report.atsBreakdown || {})}
SKILL GAPS: ${JSON.stringify(report.skillGaps || [])}
STRENGTHS: ${(report.strengths || []).join(", ")}
WEAKNESSES: ${(report.weaknesses || []).join(", ")}
RECOMMENDATIONS: ${JSON.stringify(report.recommendations || [])}
RESUME SUMMARY: ${(report.resume || report.selfDescription || "").slice(0, 2000)}
JOB DESCRIPTION: ${report.jobDescription.slice(0, 1500)}

CHAT HISTORY:
${history}

USER MESSAGE: ${message}

Provide helpful, specific, actionable career advice. Reference their actual scores and gaps when relevant. Be encouraging but honest.`

    const result = await generateWithSchema(prompt, coachResponseSchema)
    return result.response
}

module.exports = {
    generateInterviewReport,
    generateResumePdf,
    generateMockQuestion,
    evaluateMockAnswer,
    generateCoachResponse
}
