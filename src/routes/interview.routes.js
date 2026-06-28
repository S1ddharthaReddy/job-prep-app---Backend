const express = require("express")
const authMiddleware = require("../middlewares/auth.middleware")
const interviewController = require("../controllers/interview.controller")
const upload = require("../middlewares/file.middleware")

const interviewRouter = express.Router()

interviewRouter.post("/", authMiddleware.authUser, upload.single("resume"), interviewController.generateInterViewReportController)
interviewRouter.get("/report/:interviewId", authMiddleware.authUser, interviewController.getInterviewReportByIdController)
interviewRouter.get("/insights/history", authMiddleware.authUser, interviewController.getInsightsHistoryController)
interviewRouter.get("/", authMiddleware.authUser, interviewController.getAllInterviewReportsController)
interviewRouter.post("/resume/pdf/:interviewReportId", authMiddleware.authUser, interviewController.generateResumePdfController)
interviewRouter.patch("/:interviewId/progress", authMiddleware.authUser, interviewController.updateProgressController)
interviewRouter.post("/:interviewId/mock/start", authMiddleware.authUser, interviewController.startMockInterviewController)
interviewRouter.post("/:interviewId/mock/answer", authMiddleware.authUser, interviewController.submitMockAnswerController)
interviewRouter.post("/:interviewId/mock/end", authMiddleware.authUser, interviewController.endMockInterviewController)
interviewRouter.post("/:interviewId/coach/chat", authMiddleware.authUser, interviewController.coachChatController)

module.exports = interviewRouter
