import { Request, Response } from 'express';
import {prisma} from '../utils'

export const saveUser = async (req:Request, res:Response) => {
    const { email, firstName, lastName } = req.body;

    const name = `${firstName} ${lastName}`;
    // Check if the user already exists
    const existingUser = await prisma.user.findUnique({
        where: {
            email,
        },
    });
    if (existingUser) {
        return res.status(409).json({ error: 'User already exists' });
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

