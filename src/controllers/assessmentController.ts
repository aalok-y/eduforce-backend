import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils";

type Question = {
  question: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correctOption: number;
  tags: string[];
  difficulty: "easy" | "medium" | "hard";
};
interface QuestionSet {
  subject: string;
  chapter: string;
  questions: Question[];
}

export const saveQuestions = async (req: Request, res: Response) => {
  const questionsInput = req.body;

  if (
    !questionsInput ||
    !questionsInput.questions ||
    questionsInput.questions.length === 0
  ) {
    res.status(400).json({
        message: "No Questions Found",
      });
    return;
  }

  const {
    subject,
    chapter,
    questions: questionSet,
  } = questionsInput as QuestionSet;

  try {
    // 1. Upsert Subject
    const subjectRecord = await prisma.subject.upsert({
      where: { name: subject },
      update: {},
      create: { name: subject },
    });

    // 2. Upsert or Create Chapter
    let chapterRecord = await prisma.chapter.findFirst({
      where: {
        name: chapter,
        subjectId: subjectRecord.id,
      },
    });

    if (!chapterRecord) {
      chapterRecord = await prisma.chapter.create({
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
      const newQuestion = await prisma.question.create({
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
        const tagRecord = await prisma.tag.upsert({
          where: { name: tagName },
          update: {},
          create: { name: tagName },
        });

        await prisma.questionsOnTags.create({
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
  } catch (error) {
    console.error("Error saving questions:", error);
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
};


export const getQuestions = async (req: Request, res: Response) => {
  const { subject, chapter, difficulty } = req.query;

  try {
    if (!subject || !chapter || !difficulty) {
      res.status(400).json({
        message: "Missing subject, chapter, or difficulty in query parameters.",
      });
      return; 
    }

    // Find the subject by its name.
    const subjectRecord = await prisma.subject.findUnique({
      where: { name: subject as string },
    });

    if (!subjectRecord) {
      res.status(404).json({ message: "Subject not found." });
      return ;
    }

    // Find the chapter under that subject.
    const chapterRecord = await prisma.chapter.findFirst({
      where: {
        name: chapter as string,
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
    const questions = await prisma.question.findMany({
      where: {
        chapterId: chapterRecord.id,
        difficulty: difficulty as "easy" | "medium" | "hard",
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
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};



export const getAssessments = async (req: Request, res: Response) => {
  const { email } = req.query;
  try {
    if (!email) {
      res.status(400).json({
        message: "Missing userId in query parameters.",
      });
      return;
    }
    // Find the user by their email.
    const user = await prisma.user.findUnique({
      where: { email: email as string },
    });
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    const assessments = await prisma.assessment.findMany({
      where: {
        userId: user.id,
      },
    });

    res.status(200).json({ assessments });
  } catch (error) {
    console.error("Error fetching assessments:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}


export const saveAssessment = async (req: Request, res: Response) => {
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
    const userRecord = await prisma.user.findUnique({
      where: { email }
    });
    if (!userRecord) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    // Validate that the subject exists.
    const subjectRecord = await prisma.subject.findUnique({
      where: { name: subject },
    });
    if (!subjectRecord) {
      res.status(404).json({ message: "Subject not found." });
      return;
    }

    // Create the Assessment record.
    const assessment = await prisma.assessment.create({
      data: {
        userId: userRecord.id,
        subjectId: subjectRecord.id,
      }
    });

    // Process each answer and create a StudentAnswer record.
    for (const ans of answers) {
      const { questionId, selectedOption } = ans;

      // Retrieve the question to determine if the answer is correct.
      const questionRecord = await prisma.question.findUnique({
        where: { id: questionId },
      });
      if (!questionRecord) {
        // If the question doesn't exist, skip this answer.
        continue;
      }

      const isCorrect = questionRecord.correctOption === selectedOption;

      await prisma.studentAnswer.create({
        data: {
          assessmentId: assessment.id,
          questionId: questionId,
          selectedOption: selectedOption,
          isCorrect: isCorrect,
        }
      });
    }

    // Re-fetch all student answers for the assessment including question tags.
    const studentAnswersForReport = await prisma.studentAnswer.findMany({
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
    const weakTagsMap: Record<string, number> = {};
    studentAnswersForReport
      .filter(ans => !ans.isCorrect)
      .forEach(ans => {
        ans.question.tags.forEach(qt => {
          const tagName = qt.tag.name;
          weakTagsMap[tagName] = (weakTagsMap[tagName] || 0) + 1;
        });
      });

    // Create the Report record.
    const report = await prisma.report.create({
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
  } catch (error) {
    console.error("Error saving assessment:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getReport = async (req: Request, res: Response) => {
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
    const summaryReport = await prisma.report.findUnique({
      where: { assessmentId: assessmentIdNum },
    });

    if (!summaryReport) {
      res.status(404).json({ message: "No report found for this assessment." });
      return;
    }

    // Fetch detailed answers including question details and options
    const detailedAnswers = await prisma.studentAnswer.findMany({
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
  } catch (error) {
    console.error("Error fetching report:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};