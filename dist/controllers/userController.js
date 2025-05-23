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
exports.Register = exports.Login = exports.getAllUsers = exports.saveUser = void 0;
const utils_1 = require("../utils");
const saveUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, firstName, lastName } = req.body;
    if (!email || !firstName || !lastName) {
        res.status(400).json({ error: 'Missing one or more of the required fields: email, firstName, lastName' });
        return;
    }
    // Validate the email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        res.status(400).json({ error: 'Invalid email format' });
        return;
    }
    // Validate the first and last name format
    const nameRegex = /^[a-zA-Z]+$/;
    if (!nameRegex.test(firstName) || !nameRegex.test(lastName)) {
        res.status(400).json({ error: 'Invalid first or last name format' });
        return;
    }
    const name = `${firstName} ${lastName}`;
    // Check if the user already exists
    const existingUser = yield utils_1.prisma.user.findUnique({
        where: {
            email,
        },
    });
    if (existingUser) {
        res.status(409).json({ error: 'User already exists' });
        return;
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
const getAllUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Fetch all users from the database.
        const users = yield utils_1.prisma.user.findMany();
        // Send the users as a JSON response.
        res.json(users);
    }
    catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Error fetching users" });
    }
});
exports.getAllUsers = getAllUsers;
const Login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        // Validate input
        if (!email || !password) {
            res.status(400).json({ message: 'Email and password are required.' });
            return;
        }
        // Look for the user by email
        const user = yield utils_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            res.status(404).json({ message: 'User not found.' });
            return;
        }
        // Directly compare password (plain text comparison)
        if (user.password !== password) {
            res.status(401).json({ message: 'Invalid credentials.' });
            return;
        }
        // Successful login: return user info (excluding password)
        const { id, email: userEmail, name, createdAt } = user;
        res.json({ id, email: userEmail, name, createdAt });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});
exports.Login = Login;
// Register function: creates a new user with a plain text password.
const Register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password, name } = req.body;
        // Validate input
        if (!email || !password) {
            res.status(400).json({ message: 'Email and password are required.' });
            return;
        }
        // Check if user with that email already exists
        const existingUser = yield utils_1.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(409).json({ message: 'User with this email already exists.' });
            return;
        }
        // Create the new user
        const newUser = yield utils_1.prisma.user.create({
            data: {
                email,
                password, // password stored as plain text (not recommended)
                name,
            },
        });
        // Return the created user data (omitting password)
        const { id, email: userEmail, name: userName, createdAt } = newUser;
        res.status(201).json({ id, email: userEmail, name: userName, createdAt });
    }
    catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});
exports.Register = Register;
