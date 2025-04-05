import { Request, Response } from 'express';
import {prisma} from '../utils'

export const saveUser = async (req:Request, res:Response) => {
    const { email, firstName, lastName } = req.body;
    if(!email || !firstName || !lastName) {
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
    const existingUser = await prisma.user.findUnique({
        where: {
            email,
        },
    });
    if (existingUser) {
        res.status(409).json({ error: 'User already exists' });
        return;
    }
  
    try {
        const user = await prisma.user.create({
            data: {
                email,
                name
            }
        });
        res.status(201).json(user);
    } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

