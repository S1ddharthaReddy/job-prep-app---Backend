const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    question: { type: String, required: true },
    intention: { type: String, required: true },
    answer: { type: String, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    answerStructure: { type: String, default: '' },
    evaluationCriteria: { type: [String], default: [] }
}, { _id: false });

const skillGapSchema = new mongoose.Schema({
    skill: { type: String, required: true },
    severity: { type: String, enum: ['low', 'medium', 'high'], required: true },
    currentLevel: { type: Number, min: 0, max: 100, default: 0 },
    requiredLevel: { type: Number, min: 0, max: 100, default: 100 },
    category: { type: String, default: 'general' }
}, { _id: false });

const preparationPlanSchema = new mongoose.Schema({
    day: { type: Number, required: true },
    focus: { type: String, required: true },
    tasks: [{ type: String, required: true }]
}, { _id: false });

const recommendationSchema = new mongoose.Schema({
    priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
    area: { type: String, required: true },
    suggestion: { type: String, required: true }
}, { _id: false });

const resumeImprovementSchema = new mongoose.Schema({
    section: { type: String, required: true },
    issue: { type: String, required: true },
    original: { type: String, required: true },
    improved: { type: String, required: true },
    impact: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' }
}, { _id: false });

const projectRelevanceSchema = new mongoose.Schema({
    project: { type: String, required: true },
    relevance: { type: Number, min: 0, max: 100, default: 0 },
    feedback: { type: String, default: '' }
}, { _id: false });

const roadmapMilestoneSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, default: '' },
    targetDay: { type: Number, default: 0 }
}, { _id: false });

const roadmapProjectSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, default: '' },
    technologies: [{ type: String }]
}, { _id: false });

const roadmapCertSchema = new mongoose.Schema({
    name: { type: String, required: true },
    provider: { type: String, default: '' },
    priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' }
}, { _id: false });

const roadmapTechSchema = new mongoose.Schema({
    name: { type: String, required: true },
    priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
    reason: { type: String, default: '' }
}, { _id: false });

const roadmapPhaseSchema = new mongoose.Schema({
    week: { type: Number, required: true },
    focus: { type: String, required: true },
    tasks: [{ type: String }]
}, { _id: false });

const structuredRoadmapSchema = new mongoose.Schema({
    milestones: [roadmapMilestoneSchema],
    recommendedProjects: [roadmapProjectSchema],
    certifications: [roadmapCertSchema],
    technologies: [roadmapTechSchema],
    phases: [roadmapPhaseSchema]
}, { _id: false });

const mockExchangeSchema = new mongoose.Schema({
    question: { type: String, required: true },
    questionType: { type: String, default: 'technical' },
    difficulty: { type: String, default: 'medium' },
    userAnswer: { type: String, default: '' },
    score: { type: Number, min: 0, max: 100 },
    feedback: { type: String, default: '' },
    strengths: [{ type: String }],
    improvements: [{ type: String }]
}, { _id: false });

const chatMessageSchema = new mongoose.Schema({
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
}, { _id: false });

const interviewReportSchema = new mongoose.Schema({
    jobDescription: { type: String, required: true },
    resume: { type: String },
    selfDescription: { type: String },
    title: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },

    matchScore: { type: Number, min: 0, max: 100 },
    interviewReadinessScore: { type: Number, min: 0, max: 100 },

    atsBreakdown: {
        formatting: { type: Number, min: 0, max: 100, default: 0 },
        keywordOptimization: { type: Number, min: 0, max: 100, default: 0 },
        sectionCompleteness: { type: Number, min: 0, max: 100, default: 0 },
        readability: { type: Number, min: 0, max: 100, default: 0 },
        overallAts: { type: Number, min: 0, max: 100, default: 0 }
    },
    skillMatchPercentage: { type: Number, min: 0, max: 100, default: 0 },
    experienceMatchPercentage: { type: Number, min: 0, max: 100, default: 0 },
    keywordCoverage: { type: Number, min: 0, max: 100, default: 0 },
    missingSkills: [{ type: String }],
    missingKeywords: [{ type: String }],
    projectRelevance: [projectRelevanceSchema],
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    recommendations: [recommendationSchema],
    resumeImprovements: [resumeImprovementSchema],

    readinessBreakdown: {
        atsScore: { type: Number, min: 0, max: 100, default: 0 },
        technicalReadiness: { type: Number, min: 0, max: 100, default: 0 },
        behavioralReadiness: { type: Number, min: 0, max: 100, default: 0 },
        projectStrength: { type: Number, min: 0, max: 100, default: 0 },
        skillCoverage: { type: Number, min: 0, max: 100, default: 0 }
    },

    technicalQuestions: [questionSchema],
    behavioralQuestions: [questionSchema],
    situationalQuestions: [questionSchema],
    codingQuestions: [questionSchema],
    systemDesignQuestions: [questionSchema],
    skillGaps: [skillGapSchema],
    preparationPlan: [preparationPlanSchema],
    roadmap30: structuredRoadmapSchema,
    roadmap60: structuredRoadmapSchema,
    roadmap90: structuredRoadmapSchema,

    progressTracking: {
        completedMilestones: [{ type: String }],
        completedTasks: [{ type: String }]
    },

    mockInterview: {
        active: { type: Boolean, default: false },
        exchanges: [mockExchangeSchema],
        totalScore: { type: Number, min: 0, max: 100, default: 0 }
    },

    coachChat: [chatMessageSchema]
}, { timestamps: true });

const interviewReportModel = mongoose.model('InterviewReport', interviewReportSchema);

module.exports = interviewReportModel;
