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
exports.saveUser = void 0;
const utils_1 = require("../utils");
const saveUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, firstName, lastName } = req.body;
    const name = `${firstName} ${lastName}`;
    // Check if the user already exists
    const existingUser = yield utils_1.prisma.user.findUnique({
        where: {
            email,
        },
    });
    if (existingUser) {
        return res.status(409).json({ error: 'User already exists' });
    }
    try {
        const user = yield utils_1.prisma.user.create({
            data: {
                email,
                name
            }
        });
        res.status(201).json(user);
    }
    catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.saveUser = saveUser;
