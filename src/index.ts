import express, { type Request, type Response } from "express";

// import middlewares
import morgan from "morgan";
import invalidJsonMiddleware from "./middlewares/invalidJsonMiddleware.js";
import notFoundMiddleware from "./middlewares/notFoundMiddleware.js";

// import routes
import studentRouter_v2 from "./routes/studentsRoutes_v2.js";
import studentRouter_v3 from "./routes/studentsRoutes_v3.js";
import courseRouter_v2 from "./routes/coursesRouters_v2.js";
import userRouter_v2 from "./routes/userRouters.js";
import enrollment from "./routes/enrollmentRouters.js";
import { success } from "zod";



const app = express();
const port = 3000;

// body parser middleware
app.use(express.json());

// logger middleware
app.use(morgan("dev"));
// app.use(morgan("combined"));

// JSON parser middleware
app.use(invalidJsonMiddleware);

// Endpoints
app.get("/", (req: Request, res: Response) => {
  res.send("Lecture09 API services");
});


app.use("/api/v2/students", studentRouter_v2);
app.use("/api/v3/students", studentRouter_v3);
app.use("/api/v2/courses", courseRouter_v2);
app.use("/api/v2/users", userRouter_v2);
app.use("/api/v2/enrollments", enrollment);

app.get("/api/me", (req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    message: "Student Information",
    data: {
      studentId: "680610697",
      firstName: "Pobphut",
      lastName: "kungwong",
      program: "CPE",
      section:"001",
    },
  });
})

// endpoint check middleware
app.use(notFoundMiddleware);

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});

// Export app for vercel deployment
export default app;
