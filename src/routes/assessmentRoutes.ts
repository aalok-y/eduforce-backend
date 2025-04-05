import { Router } from "express";
import { saveQuestions, getQuestions,getReport,getAssessments,saveAssessment} from "../controllers/assessmentController";

const router = Router();

router.post("/questions", saveQuestions);
router.get("/questions", getQuestions);

router.get("/assessments", getAssessments);
router.post("/assessments", saveAssessment);

router.get("/report", getReport);

export default router;