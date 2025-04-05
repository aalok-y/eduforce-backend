"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const assessmentController_1 = require("../controllers/assessmentController");
const router = (0, express_1.Router)();
router.post("/questions", assessmentController_1.saveQuestions);
router.get("/questions", assessmentController_1.getQuestions);
exports.default = router;
