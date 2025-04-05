import { Router } from "express";
import { saveQuestions, getQuestions} from "../controllers/assessmentController";

const router = Router();

router.post("/questions", saveQuestions);
router.get("/questions", getQuestions);
export default router;