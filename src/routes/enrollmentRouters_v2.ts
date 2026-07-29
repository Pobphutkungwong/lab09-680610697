import { Router, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config(); // load value in env file

import type { User, UserPayload, CustomRequest } from "../libs/types.ts";
import {
  zStudentPostBody,
  zStudentPutBody,
  zStudentId,
  zCourseId,
  zEnrollmentBody,
} from "../libs/zodValidators.ts";

// import database
import {
  users,
  reset_users,
  enrollments,
  students,
  courses,
  DB,
} from "../db/db.ts";
import { success } from "zod";
import { authenticateToken } from "../middlewares/authenMiddleware.ts";
import { checkRole } from "../middlewares/checkRoleMiddleware.ts";
import { token } from "morgan";

const router = Router();

// GET /api/v2/users
router.get(
  "/",
  authenticateToken,
  checkRole,
  (req: CustomRequest, res: Response) => {
    try {
      const user = req.user;
      if (user?.role === "ADMIN") {
        return res.status(200).json({
          ok: true,
          enrollments: enrollments,
        });
      }
      if (user?.role === "STUDENT") {
        const stu_Enrollment = enrollments.filter(
          (e) => e.studentId === user.studentId,
        );
        return res.status(200).json({
          ok: true,
          enrollments: stu_Enrollment,
        });
      }
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  },
);

router.post(
  "/",
  authenticateToken,
  checkRole,
  (req: CustomRequest, res: Response) => {
    try {
      const user = req.user;
      const body = req.body;
      if (user?.role !== "STUDENT") {
        return res.status(403).json({
          ok: false,
          message: "Only Student can access this API route",
        });
      }
      //check
      const valid = zEnrollmentBody.safeParse(body);

      if (!valid.success) {
        return res.status(400).json({
          ok: false,
          message: valid.error.issues[0]?.message,
        });
      }
      //check ชื่อในระบบ
      const { studentId, courseId } = valid.data;
      const checkedStudentId = DB.students.find(
        (e) => e.studentId === studentId,
      );
      const checkedCourseId = DB.courses.find((e) => e.courseId === courseId);
      if (!checkedStudentId) {
        return res.status(404).json({
          ok: false,
          message: "StudentId not found",
        });
      }
      if (!checkedCourseId) {
        return res.status(404).json({
          ok: false,
          message: "CourseId not found",
        });
      }
      //ลงทะเบียนซ้ำ
      const En_already = DB.enrollments.find(
        (e) => e.studentId === studentId && e.courseId === courseId,
      );
      if (En_already)
        return res
          .status(409)
          .json({ ok: false, message: "Already enrolled in this course" });

      DB.enrollments.push({ studentId, courseId });

      //เคยลงวิชาไหม
      if (!checkedStudentId.courses) {
        checkedStudentId.courses = [];
      }
      checkedStudentId.courses.push(courseId);
      return res.status(200).json({
        ok: true,
        message: "Enrollment successful",
        data: { studentId, courseId },
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  },
);

// POST /api/v2/users/login
router.post("/login", (req: Request, res: Response) => {
  // 1. get username and password from body
  const { username, password } = req.body;
  const user = users.find(
    (u) => u.username === username && u.password === password,
  );
  //if user not found
  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Invalid username or password",
    });
  }
  // 2. check if user exists (search with username & password in DB)

  // 3. create JWT token (with user info object as payload) using JWT_SECRET_KEY
  const jwt_secret = process.env.JWT_SECRET || "this_is_my_secret"; //ปกติไม่ใส่ในsource codeใส่ใน.env
  const token = jwt.sign(
    {
      username: user.username,
      studentId: user.studentId,
      role: user.role,
    },
    jwt_secret,
    { expiresIn: "5d" },
  );

  //    (optional: save the token as part of User data)

  user.tokens = user.tokens ? [...user.tokens, token] : [token]; //user.token?[เกิดตอนloginรอบ2-3]:[loginรอบแรก] เหมือน if:else

  return res.status(200).json({
    success: true,
    message: "Login successful",
    token: token,
  });
  // 4. send HTTP response with JWT token

  return res.status(500).json({
    success: false,
    message: "POST /api/v2/users/login has not been implemented yet",
  });
});

// POST /api/v2/users/logout
router.post(
  "/logout",
  authenticateToken,
  (req: CustomRequest, res: Response) => {
    // มีผลเมื่อเก็บtokenบนserver
    // 1. check Request if "authorization" header exists
    //    and container "Bearer ...JWT-Token..."

    // 2. extract the "...JWT-Token..." if available

    // 3. verify token using JWT_SECRET_KEY and get payload (username, studentId and role)

    // 4. check if user exists (search with username)
    const payload_user = req.user;
    const payload_token = req.token;
    const user = users.find((u) => u.username === payload_user?.username);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // 5. proceed with logout process and return HTTP response
    user.tokens = user.tokens?.filter((t) => t !== payload_token); //tokenไม่ตรงลบทิ้ง
    return res.status(200).json({
      success: true,
      message: "Sign out successful",
    });
    //    (optional: remove the token from User data)

    return res.status(500).json({
      success: false,
      message: "POST /api/v2/users/logout has not been implemented yet",
    });
  },
);

// POST /api/v2/users/reset
router.post("/reset", (req: Request, res: Response) => {
  try {
    reset_users();
    return res.status(200).json({
      success: true,
      message: "User database has been reset",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Something is wrong, please try again",
      error: err,
    });
  }
});

router.delete("/", authenticateToken, (req: Request, res: Response) => {
  try {
    const payload = (req as CustomRequest).user;
    const { courseId } = req.body;
    const val = zCourseId.safeParse(courseId);

    if (!val.success && !payload) {
      return res.status(400).json({
        ok: false,
        message: "Validation failed",
      });
    }

    if (payload?.role === "ADMIN") {
      return res.status(403).json({
        ok: true,
        message: "Only Student can access this API route",
      });
    }

    const studentId = payload?.studentId;

    const findindex = enrollments.findIndex(
      (e) => e.studentId === studentId && e.courseId === courseId,
    );
    
    if (findindex == -1) {
      return res.status(404).json({
        ok: false,
        message: "Enrollment does not exist",
      });
    }

    enrollments.splice(findindex, 1);

    return res.status(200).json({
      ok: true,
      message: "You has dropped from this course. See you next semester.",
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error,
    });
  }
});

export default router;