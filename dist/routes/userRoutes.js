"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController_1 = require("../controllers/userController");
const router = (0, express_1.default)();
router.post("/users", userController_1.saveUser);
router.get("/users", userController_1.getAllUsers);
router.post("/login", userController_1.Login);
router.post("/register", userController_1.Register);
exports.default = router;
