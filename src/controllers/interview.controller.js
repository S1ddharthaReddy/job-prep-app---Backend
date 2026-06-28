const pdfParse = require("pdf-parse")
const {
    generateInterviewReport,
    generateResumePdf,
    generateMockQuestion,
    evaluateMockAnswer,
    generateCoachResponse
} = require("../services/ai.service")
const interviewReportModel = require("../models/interviewReport.model")

async function extractResumeText(file) {
    if (!file) return ""
    const resumeContent = await (new pdfParse.PDFParse(Uint8Array.from(file.buffer))).getText()
    return resumeContent.text
}

async function generateInterViewReportController(req, res) {
    try {
        const { selfDescription, jobDescription } = req.body

        if (!jobDescription?.trim()) {
            return res.status(400).json({ message: "Job description is required." })
        }

        const resumeText = await extractResumeText(req.file)
        if (!resumeText.trim() && !selfDescription?.trim()) {
            return res.status(400).json({ message: "Either a resume or self description is required." })
        }

        const interViewReportByAi = await generateInterviewReport({
            resume: resumeText,
            selfDescription,
            jobDescription
        })

        const interviewReport = await interviewReportModel.create({
            user: req.user.id,
            resume: resumeText,
            selfDescription,
            jobDescription,
            progressTracking: { completedMilestones: [], completedTasks: [] },
            mockInterview: { active: false, exchanges: [], totalScore: 0 },
            coachChat: [],
            ...interViewReportByAi
        })

        res.status(201).json({
            message: "Interview report generated successfully.",
            interviewReport
        })
    } catch (error) {
        console.error("Generate report error:", error)
        res.status(500).json({ message: "Failed to generate interview report.", error: error.message })
    }
}

async function getInterviewReportByIdController(req, res) {
    try {
        const { interviewId } = req.params
        const interviewReport = await interviewReportModel.findOne({ _id: interviewId, user: req.user.id })

        if (!interviewReport) {
            return res.status(404).json({ message: "Interview report not found." })
        }

        res.status(200).json({
            message: "Interview report fetched successfully.",
            interviewReport
        })
    } catch (error) {
        console.error("Get report error:", error)
        res.status(500).json({ message: "Failed to fetch interview report." })
    }
}

async function getAllInterviewReportsController(req, res) {
    try {
        const interviewReports = await interviewReportModel.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -situationalQuestions -codingQuestions -systemDesignQuestions -skillGaps -preparationPlan -roadmap30 -roadmap60 -roadmap90 -resumeImprovements -coachChat -mockInterview.exchanges")

        res.status(200).json({
            message: "Interview reports fetched successfully.",
            interviewReports
        })
    } catch (error) {
        console.error("Get all reports error:", error)
        res.status(500).json({ message: "Failed to fetch interview reports." })
    }
}

async function getInsightsHistoryController(req, res) {
    try {
        const reports = await interviewReportModel.find({ user: req.user.id })
            .sort({ createdAt: 1 })
            .select("title matchScore interviewReadinessScore atsBreakdown skillMatchPercentage experienceMatchPercentage keywordCoverage strengths weaknesses createdAt")

        res.status(200).json({
            message: "Insights history fetched successfully.",
            insights: reports
        })
    } catch (error) {
        console.error("Insights error:", error)
        res.status(500).json({ message: "Failed to fetch insights history." })
    }
}

async function generateResumePdfController(req, res) {
    try {
        const { interviewReportId } = req.params
        const interviewReport = await interviewReportModel.findOne({
            _id: interviewReportId,
            user: req.user.id
        })

        if (!interviewReport) {
            return res.status(404).json({ message: "Interview report not found." })
        }

        const { resume, jobDescription, selfDescription } = interviewReport
        const pdfBuffer = await generateResumePdf({ resume, jobDescription, selfDescription })

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`
        })
        res.send(pdfBuffer)
    } catch (error) {
        console.error("PDF error:", error)
        res.status(500).json({ message: "Failed to generate resume PDF." })
    }
}

async function updateProgressController(req, res) {
    try {
        const { interviewId } = req.params
        const { milestone, task, action } = req.body

        const report = await interviewReportModel.findOne({ _id: interviewId, user: req.user.id })
        if (!report) {
            return res.status(404).json({ message: "Interview report not found." })
        }

        if (!report.progressTracking) {
            report.progressTracking = { completedMilestones: [], completedTasks: [] }
        }

        if (milestone) {
            const milestones = report.progressTracking.completedMilestones || []
            if (action === "remove") {
                report.progressTracking.completedMilestones = milestones.filter(m => m !== milestone)
            } else if (!milestones.includes(milestone)) {
                milestones.push(milestone)
                report.progressTracking.completedMilestones = milestones
            }
        }

        if (task) {
            const tasks = report.progressTracking.completedTasks || []
            if (action === "remove") {
                report.progressTracking.completedTasks = tasks.filter(t => t !== task)
            } else if (!tasks.includes(task)) {
                tasks.push(task)
                report.progressTracking.completedTasks = tasks
            }
        }

        await report.save()

        res.status(200).json({
            message: "Progress updated.",
            progressTracking: report.progressTracking
        })
    } catch (error) {
        console.error("Progress error:", error)
        res.status(500).json({ message: "Failed to update progress." })
    }
}

async function startMockInterviewController(req, res) {
    try {
        const { interviewId } = req.params
        const report = await interviewReportModel.findOne({ _id: interviewId, user: req.user.id })
        if (!report) {
            return res.status(404).json({ message: "Interview report not found." })
        }

        report.mockInterview = { active: true, exchanges: [], totalScore: 0 }
        const questionData = await generateMockQuestion({ report, previousExchanges: [] })

        report.mockInterview.exchanges.push({
            question: questionData.question,
            questionType: questionData.questionType,
            difficulty: questionData.difficulty,
            userAnswer: "",
            score: null,
            feedback: "",
            strengths: [],
            improvements: []
        })
        await report.save()

        res.status(200).json({
            message: "Mock interview started.",
            mockInterview: report.mockInterview,
            currentQuestion: questionData
        })
    } catch (error) {
        console.error("Mock start error:", error)
        res.status(500).json({ message: "Failed to start mock interview." })
    }
}

async function submitMockAnswerController(req, res) {
    try {
        const { interviewId } = req.params
        const { answer } = req.body

        if (!answer?.trim()) {
            return res.status(400).json({ message: "Answer is required." })
        }

        const report = await interviewReportModel.findOne({ _id: interviewId, user: req.user.id })
        if (!report || !report.mockInterview?.active) {
            return res.status(400).json({ message: "No active mock interview session." })
        }

        const exchanges = report.mockInterview.exchanges
        const currentIndex = exchanges.length - 1
        const current = exchanges[currentIndex]

        const evaluation = await evaluateMockAnswer({
            question: current.question,
            questionType: current.questionType,
            difficulty: current.difficulty,
            userAnswer: answer,
            report
        })

        exchanges[currentIndex] = {
            ...current,
            userAnswer: answer,
            score: evaluation.score,
            feedback: evaluation.feedback,
            strengths: evaluation.strengths,
            improvements: evaluation.improvements
        }

        const scoredExchanges = exchanges.filter(e => e.score !== null)
        report.mockInterview.totalScore = scoredExchanges.length
            ? Math.round(scoredExchanges.reduce((sum, e) => sum + e.score, 0) / scoredExchanges.length)
            : 0

        const nextQuestion = await generateMockQuestion({ report, previousExchanges: exchanges })
        exchanges.push({
            question: nextQuestion.question,
            questionType: nextQuestion.questionType,
            difficulty: nextQuestion.difficulty,
            userAnswer: "",
            score: null,
            feedback: "",
            strengths: [],
            improvements: []
        })

        report.mockInterview.exchanges = exchanges
        await report.save()

        res.status(200).json({
            message: "Answer evaluated.",
            evaluation,
            mockInterview: report.mockInterview,
            nextQuestion
        })
    } catch (error) {
        console.error("Mock answer error:", error)
        res.status(500).json({ message: "Failed to evaluate answer." })
    }
}

async function endMockInterviewController(req, res) {
    try {
        const { interviewId } = req.params
        const report = await interviewReportModel.findOne({ _id: interviewId, user: req.user.id })
        if (!report) {
            return res.status(404).json({ message: "Interview report not found." })
        }

        if (report.mockInterview) {
            report.mockInterview.active = false
            const pending = report.mockInterview.exchanges?.filter(e => e.score === null)
            if (pending?.length) {
                report.mockInterview.exchanges = report.mockInterview.exchanges.filter(e => e.score !== null)
            }
            await report.save()
        }

        res.status(200).json({
            message: "Mock interview ended.",
            mockInterview: report.mockInterview
        })
    } catch (error) {
        console.error("Mock end error:", error)
        res.status(500).json({ message: "Failed to end mock interview." })
    }
}

async function coachChatController(req, res) {
    try {
        const { interviewId } = req.params
        const { message } = req.body

        if (!message?.trim()) {
            return res.status(400).json({ message: "Message is required." })
        }

        const report = await interviewReportModel.findOne({ _id: interviewId, user: req.user.id })
        if (!report) {
            return res.status(404).json({ message: "Interview report not found." })
        }

        const chatHistory = report.coachChat || []
        chatHistory.push({ role: "user", content: message, timestamp: new Date() })

        const response = await generateCoachResponse({
            report,
            message,
            chatHistory: chatHistory.slice(0, -1)
        })

        chatHistory.push({ role: "assistant", content: response, timestamp: new Date() })
        report.coachChat = chatHistory
        await report.save()

        res.status(200).json({
            message: "Coach response generated.",
            response,
            coachChat: report.coachChat
        })
    } catch (error) {
        console.error("Coach chat error:", error)
        res.status(500).json({ message: "Failed to get coach response." })
    }
}

module.exports = {
    generateInterViewReportController,
    getInterviewReportByIdController,
    getAllInterviewReportsController,
    getInsightsHistoryController,
    generateResumePdfController,
    updateProgressController,
    startMockInterviewController,
    submitMockAnswerController,
    endMockInterviewController,
    coachChatController
}
