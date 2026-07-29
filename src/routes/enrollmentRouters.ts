import { Router, type Request, type Response } from "express";
import { z } from "zod";
import {
  type CustomRequest,
  type User,
  type Enrollment,
} from "../libs/types.js";
import { zCourseId } from "../libs/zodValidators.js";
import { authenticateToken } from "../middlewares/authenMiddleware.js";
import { checkRoleStudent } from "../middlewares/checkStudent.js";
import { users, students, courses, enrollments } from "../db/db.js";

const router = Router();

router.get("/", authenticateToken, (req: CustomRequest, res: Response) => {
  try {
    const payload = req.user;
    const user = users.find((u) => u.username === payload?.username);
    if (!user) {
      return res.status(401).json({
        ok: false,
        message: "Invalid username or password",
      });
    }

    if (user.role === "ADMIN") {
      return res.status(200).json({
        ok: true,
        enrollments: enrollments.map((e) => ({
          studentId: e.studentId,
          courseNo: e.courseId,
        })),
      });
    }

    const own = enrollments.filter((e) => e.studentId === user.studentId);

    return res.status(200).json({
      ok: true,
      enrollments: own.map((e) => ({
        studentId: e.studentId,
        courseNo: e.courseId,
      })),
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: "Something is wrong, please try again",
      error: err,
    });
  }
});

const zEnrollmentReqBody = z.object({
  courseNo: zCourseId,
});

router.post(
  "/",
  authenticateToken,
  checkRoleStudent,
  (req: CustomRequest, res: Response) => {
    try {
      const payload = req.user;
      const user = users.find((u: User) => u.username === payload?.username);

      if (!user) {
        return res.status(401).json({
          ok: false,
          message: "Invalid username or password",
        });
      }

      const result = zEnrollmentReqBody.safeParse(req.body); // ค่าที่ออกมาจะมี success กับ data
      if (!result.success) {
        return res.status(400).json({
          ok: false,
          message: "Validation failed",
          error: result.error.issues[0]?.message,
        });
      }

      const { courseNo } = result.data; //เลยมา dot data ตรงนี้เพื่อเอาข้อมูลที่ผ่านแล้วววว
      const studentId = user.studentId as string;

      const foundCourse = courses.find((c) => c.courseId === courseNo);
      if (!foundCourse) {
        return res.status(404).json({
          ok: false,
          message: "Course not found",
        });
      }

      const foundStudent = students.find((s) => s.studentId === studentId);
      if (!foundStudent) {
        return res.status(400).json({
          ok: false,
          message: "Your studentId is invalid",
        });
      }

      const alreadyEnrolled = enrollments.some(
        //.some คือเช้คว่ามีสามชิกตรงตามเงื่อนไขไหม รีเทินเป็นบูลีน
        (e) => e.studentId === studentId && e.courseId === courseNo,
      );
      if (alreadyEnrolled) {
        return res.status(409).json({
          ok: false,
          message: "You have already enrolled in this course",
        });
      }

      const newEnrollment: Enrollment = { studentId, courseId: courseNo };
      enrollments.push(newEnrollment);

      if (foundStudent) {
        if (!foundStudent.courses) {
          foundStudent.courses = [];
        }
        foundStudent.courses.push(courseNo);
      }

      return res.status(201).json({
        ok: true,
        message: "Enrolled successfully",
        data: foundStudent,
      });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  },
);

router.delete(
  "/",
  authenticateToken,
  checkRoleStudent,
  (req: CustomRequest, res: Response) => {
    try {
      const payload = req.user;
      const user = users.find((u: User) => u.username === payload?.username);

      if (!user) {
        return res.status(401).json({
          ok: false,
          message: "Invalid username or password",
        });
      }

      const result = zEnrollmentReqBody.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          ok: false,
          message: "Validation failed",
          error: result.error.issues[0]?.message,
        });
      }

      const { courseNo } = result.data;
      const studentId = user.studentId as string;

      const enrollmentIndex = enrollments.findIndex(
        (e) => e.studentId === studentId && e.courseId === courseNo,
      );

      if (enrollmentIndex === -1) {
        return res.status(404).json({
          ok: false,
          message: "Enrollment not found",
        });
      }

      enrollments.splice(enrollmentIndex, 1);

      const student = students.find((s) => s.studentId === studentId);
      if (student?.courses) {
        student.courses = student.courses.filter((c) => c !== courseNo);
      }

      return res.status(200).json({
        ok: true,
        message: "You has dropped from this course. See you next semester.",
      });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  },
);

export default router;