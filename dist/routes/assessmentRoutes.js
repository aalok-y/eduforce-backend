"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const assessmentController_1 = require("../controllers/assessmentController");
const router = (0, express_1.Router)();
router.post("/questions", assessmentController_1.saveQuestions);
router.get("/questions", assessmentController_1.getQuestions);
router.get("/assessments", assessmentController_1.getAssessments);
router.post("/assessments", assessmentController_1.saveAssessment);
router.get("/report", assessmentController_1.getReport);
exports.default = router;
