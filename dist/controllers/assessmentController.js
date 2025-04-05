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
exports.getQuestions = exports.saveQuestions = void 0;
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
