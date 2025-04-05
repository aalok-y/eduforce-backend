import express,{Request,Response,NextFunction} from "express";
import cors from "cors";
import { clerkMiddleware, clerkClient,requireAuth } from '@clerk/express'
import 'dotenv/config'
import assessmentRoutes from "./routes/assessmentRoutes";
import userRoutes from "./routes/userRoutes";

const app = express();


const port = process.env.PORT || 5000;

app.use(express.json());


app.use(cors());

app.get('/',async(req:Request,res: Response)=>{
    res.status(200).json({
        message: "I'm alive👍",
        users: await clerkClient.users.getUserList()
    })
})

function requireAuthForApi(req: Request, res: Response, next: NextFunction) {
  clerkMiddleware()(req, res, (err?: any) => {
    if (err) {
      // If authentication fails, send a 401 instead of redirecting
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next();
  });
}

app.get('/protected', async (req: Request, res: Response): Promise<void> => {
  const userId = req.headers['x-userid'] as string;

  try {
    // Verify that the user exists in Clerk's database
    const user = await clerkClient.users.getUser(userId);
    console.log("user: ",user)
    if (!user) {
      res.status(401).json({ error: 'Unauthorized: User not found in Clerk.' });
      return;
    }
    
    res.status(200).json({
      message: "valid user",
      userInfo: user
    })
  } catch (error) {
    console.error("Error fetching user from Clerk:", error);
    res.status(500).send('Internal Server Error.');
  }
});

app.use('/api',assessmentRoutes);
app.use('/api',userRoutes);

app.listen(port,()=>{
    console.info("Server Started at :",port);
    
})

