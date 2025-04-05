"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReport = exports.saveAssessment = exports.getAssessments = exports.getQuestions = exports.saveQuestions = void 0;
const utils_1 = require("../utils");
const saveQuestions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const questionsInput = req.body;
    if (!questionsInput ||
        !questionsInput.questions ||
        questionsInput.questions.length === 0) {
        res.status(400).json({
            message: "No Questions Found",
        });
        return;
    }
    const { subject, chapter, questions: questionSet, } = questionsInput;
    try {
        // 1. Upsert Subject
        const subjectRecord = yield utils_1.prisma.subject.upsert({
            where: { name: subject },
            update: {},
            create: { name: subject },
        });
        // 2. Upsert or Create Chapter
        let chapterRecord = yield utils_1.prisma.chapter.findFirst({
            where: {
                name: chapter,
                subjectId: subjectRecord.id,
            },
        });
        if (!chapterRecord) {
            chapterRecord = yield utils_1.prisma.chapter.create({
                data: {
                    name: chapter,
                    subjectId: subjectRecord.id,
                },
            });
        }
        // 3. Create a new Assessment for this question set.
        // Make sure ADMIN_USER_ID is set in your environment variables.
        // 4. Process each question
        const createdQuestions = [];
        for (const q of questionSet) {
            // Create the question record.
            const newQuestion = yield utils_1.prisma.question.create({
                data: {
                    text: q.question,
                    option1: q.option1,
                    option2: q.option2,
                    option3: q.option3,
                    option4: q.option4,
                    correctOption: q.correctOption,
                    difficulty: q.difficulty,
                    chapterId: chapterRecord.id,
                },
            });
            // Process tags for this question.
            for (const tagName of q.tags) {
                const tagRecord = yield utils_1.prisma.tag.upsert({
                    where: { name: tagName },
                    update: {},
                    create: { name: tagName },
                });
                yield utils_1.prisma.questionsOnTags.create({
                    data: {
                        questionId: newQuestion.id,
                        tagId: tagRecord.id,
                    },
                });
            }
            createdQuestions.push(newQuestion);
        }
        res.status(201).json({
            message: "Questions saved successfully",
            questions: createdQuestions,
        });
        return;
    }
    catch (error) {
        console.error("Error saving questions:", error);
        res.status(500).json({ message: "Internal Server Error" });
        return;
    }
});
exports.saveQuestions = saveQuestions;
const getQuestions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { subject, chapter, difficulty } = req.query;
    try {
        if (!subject || !chapter || !difficulty) {
            res.status(400).json({
                message: "Missing subject, chapter, or difficulty in query parameters.",
            });
            return;
        }
        // Find the subject by its name.
        const subjectRecord = yield utils_1.prisma.subject.findUnique({
            where: { name: subject },
        });
        if (!subjectRecord) {
            res.status(404).json({ message: "Subject not found." });
            return;
        }
        // Find the chapter under that subject.
        const chapterRecord = yield utils_1.prisma.chapter.findFirst({
            where: {
                name: chapter,
                subjectId: subjectRecord.id,
            },
        });
        if (!chapterRecord) {
            res.status(404).json({ message: "Chapter not found." });
            return;
        }
        // Fetch questions in the chapter with the specified difficulty.
        // Since 'difficulty' is defined as an enum in your Prisma schema,
        // we cast the query param to the corresponding union type.
        const questions = yield utils_1.prisma.question.findMany({
            where: {
                chapterId: chapterRecord.id,
                difficulty: difficulty,
            },
            // Include the related tags by including the join table and then the tag itself.
            include: {
                tags: {
                    include: {
                        tag: true,
                    },
                },
            },
        });
        res.status(200).json({ questions });
    }
    catch (error) {
        console.error("Error fetching questions:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});
exports.getQuestions = getQuestions;
const getAssessments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email } = req.query;
    try {
        if (!email) {
            res.status(400).json({
                message: "Missing userId in query parameters.",
            });
            return;
        }
        // Find the user by their email.
        const user = yield utils_1.prisma.user.findUnique({
            where: { email: email },
        });
        if (!user) {
            res.status(404).json({ message: "User not found." });
            return;
        }
        const assessments = yield utils_1.prisma.assessment.findMany({
            where: {
                userId: user.id,
            },
        });
        res.status(200).json({ assessments });
    }
    catch (error) {
        console.error("Error fetching assessments:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});
exports.getAssessments = getAssessments;
const saveAssessment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Destructure the input from the request body.
        const { email, subject, answers } = req.body;
        if (!email || !subject || !answers || !Array.isArray(answers)) {
            res.status(400).json({
                message: "Missing required fields: email, subject, and answers (as an array)."
            });
            return;
        }
        // Validate that the user exists by email.
        const userRecord = yield utils_1.prisma.user.findUnique({
            where: { email }
        });
        if (!userRecord) {
            res.status(404).json({ message: "User not found." });
            return;
        }
        // Validate that the subject exists.
        const subjectRecord = yield utils_1.prisma.subject.findUnique({
            where: { name: subject },
        });
        if (!subjectRecord) {
            res.status(404).json({ message: "Subject not found." });
            return;
        }
        // Create the Assessment record.
        const assessment = yield utils_1.prisma.assessment.create({
            data: {
                userId: userRecord.id,
                subjectId: subjectRecord.id,
            }
        });
        // Process each answer and create a StudentAnswer record.
        for (const ans of answers) {
            const { questionId, selectedOption } = ans;
            // Retrieve the question to determine if the answer is correct.
            const questionRecord = yield utils_1.prisma.question.findUnique({
                where: { id: questionId },
            });
            if (!questionRecord) {
                // If the question doesn't exist, skip this answer.
                continue;
            }
            const isCorrect = questionRecord.correctOption === selectedOption;
            yield utils_1.prisma.studentAnswer.create({
                data: {
                    assessmentId: assessment.id,
                    questionId: questionId,
                    selectedOption: selectedOption,
                    isCorrect: isCorrect,
                }
            });
        }
        // Re-fetch all student answers for the assessment including question tags.
        const studentAnswersForReport = yield utils_1.prisma.studentAnswer.findMany({
            where: { assessmentId: assessment.id },
            include: {
                question: {
                    include: {
                        tags: {
                            include: {
                                tag: true,
                            }
                        }
                    }
                }
            }
        });
        const totalQuestions = studentAnswersForReport.length;
        const correctAnswers = studentAnswersForReport.filter(ans => ans.isCorrect).length;
        const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
        // Calculate weak topics by aggregating tags from incorrectly answered questions.
        const weakTagsMap = {};
        studentAnswersForReport
            .filter(ans => !ans.isCorrect)
            .forEach(ans => {
            ans.question.tags.forEach(qt => {
                const tagName = qt.tag.name;
                weakTagsMap[tagName] = (weakTagsMap[tagName] || 0) + 1;
            });
        });
        // Create the Report record.
        const report = yield utils_1.prisma.report.create({
            data: {
                assessmentId: assessment.id,
                totalQuestions,
                correctAnswers,
                accuracy,
                weakTags: weakTagsMap, // stored as JSON
            }
        });
        res.status(201).json({
            message: "Assessment and report saved successfully.",
            assessmentId: assessment.id,
            reportId: report.id,
        });
    }
    catch (error) {
        console.error("Error saving assessment:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});
exports.saveAssessment = saveAssessment;
const getReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { assessmentId } = req.query;
    if (!assessmentId) {
        res.status(400).json({ message: "assessmentId query parameter is required." });
        return;
    }
    const assessmentIdNum = Number(assessmentId);
    if (isNaN(assessmentIdNum)) {
        res.status(400).json({ message: "Invalid assessmentId provided." });
        return;
    }
    try {
        // Fetch summary report from Report table
        const summaryReport = yield utils_1.prisma.report.findUnique({
            where: { assessmentId: assessmentIdNum },
        });
        if (!summaryReport) {
            res.status(404).json({ message: "No report found for this assessment." });
            return;
        }
        // Fetch detailed answers including question details and options
        const detailedAnswers = yield utils_1.prisma.studentAnswer.findMany({
            where: { assessmentId: assessmentIdNum },
            include: {
                question: {
                    include: {
                        tags: {
                            include: { tag: true },
                        },
                    },
                },
            },
        });
        // Map detailed answers to a consumable format
        const answers = detailedAnswers.map(ans => ({
            questionId: ans.question.id,
            question: ans.question.text,
            options: {
                option1: ans.question.option1,
                option2: ans.question.option2,
                option3: ans.question.option3,
                option4: ans.question.option4,
            },
            correctOption: ans.question.correctOption,
            selectedOption: ans.selectedOption,
            isCorrect: ans.isCorrect,
            // Optionally include tags if needed:
            tags: ans.question.tags.map(qt => qt.tag.name)
        }));
        res.status(200).json({
            assessmentId: assessmentIdNum,
            summary: summaryReport,
            answers,
        });
    }
    catch (error) {
        console.error("Error fetching report:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});
exports.getReport = getReport;
