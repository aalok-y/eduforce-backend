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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_2 = require("@clerk/express");
require("dotenv/config");
const assessmentRoutes_1 = __importDefault(require("./routes/assessmentRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
app.use(express_1.default.json());
app.use((0, cors_1.default)());
app.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.status(200).json({
        message: "I'm alive👍",
        users: yield express_2.clerkClient.users.getUserList()
    });
}));
function requireAuthForApi(req, res, next) {
    (0, express_2.clerkMiddleware)()(req, res, (err) => {
        if (err) {
            // If authentication fails, send a 401 instead of redirecting
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        next();
    });
}
app.get('/protected', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.headers['x-userid'];
    try {
        // Verify that the user exists in Clerk's database
        const user = yield express_2.clerkClient.users.getUser(userId);
        console.log("user: ", user);
        if (!user) {
            res.status(401).json({ error: 'Unauthorized: User not found in Clerk.' });
            return;
        }
        res.status(200).json({
            message: "valid user",
            userInfo: user
        });
    }
    catch (error) {
        console.error("Error fetching user from Clerk:", error);
        res.status(500).send('Internal Server Error.');
    }
}));
app.use('/api', assessmentRoutes_1.default);
app.use('/api', userRoutes_1.default);
app.listen(port, () => {
    console.info("Server Started at :", port);
});
