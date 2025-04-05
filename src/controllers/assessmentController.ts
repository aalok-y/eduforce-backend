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