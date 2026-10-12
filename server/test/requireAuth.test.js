import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import requireAuth, { requireRole } from "../src/middleware/requireAuth.js";
import User from "../src/models/User.js";

process.env.JWT_SECRET = "test-only-jwt-secret";

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

test("rejects requests without a bearer token", () => {
  const req = { get: () => undefined };
  const res = responseRecorder();
  let continued = false;

  requireAuth(req, res, () => { continued = true; });

  assert.equal(res.statusCode, 401);
  assert.equal(continued, false);
});

test("verifies the JWT and assigns the authenticated user to the request", () => {
  const token = jwt.sign({ sub: "student-123", role: "student" }, process.env.JWT_SECRET);
  const req = { get: () => `Bearer ${token}` };
  const res = responseRecorder();
  let continued = false;

  requireAuth(req, res, () => { continued = true; });

  assert.equal(req.userId, "student-123");
  assert.equal(req.userRole, "student");
  assert.equal(continued, true);
  assert.equal(res.statusCode, 200);
});

test("role authorization restricts tutor and student actions to the matching role", async () => {
  const originalFindById = User.findById;
  User.findById = () => ({ select: async () => ({ role: "tutor", name: "Tutor Name" }) });
  const tutorReq = { userId: "tutor-123" };
  const tutorRes = responseRecorder();
  let continued = false;
  try {
    await requireRole("tutor")(tutorReq, tutorRes, () => { continued = true; });
    assert.equal(continued, true);
    assert.equal(tutorReq.userRole, "tutor");
    assert.equal(tutorReq.userName, "Tutor Name");
    assert.equal(tutorRes.statusCode, 200);

    User.findById = () => ({ select: async () => ({ role: "student" }) });
    const studentRes = responseRecorder();
    await requireRole("tutor")({ userId: "student-123" }, studentRes, () => {
      assert.fail("Students must not be authorized to manage tutor listings.");
    });
    assert.equal(studentRes.statusCode, 403);
    assert.equal(studentRes.body.message, "You do not have permission to perform this action.");

    User.findById = () => ({ select: async () => ({ role: "student" }) });
    const authorizedStudentReq = { userId: "student-456" };
    const authorizedStudentRes = responseRecorder();
    let studentContinued = false;
    await requireRole("student")(authorizedStudentReq, authorizedStudentRes, () => {
      studentContinued = true;
    });
    assert.equal(studentContinued, true);
    assert.equal(authorizedStudentReq.userRole, "student");

    User.findById = () => ({ select: async () => ({ role: "tutor" }) });
    const tutorRoleDeniedRes = responseRecorder();
    await requireRole("student")({ userId: "tutor-456" }, tutorRoleDeniedRes, () => {
      assert.fail("Tutors must not be authorized to manage student bookings.");
    });
    assert.equal(tutorRoleDeniedRes.statusCode, 403);
  } finally {
    User.findById = originalFindById;
  }
});

test("rejects malformed and validly signed tokens without a subject", () => {
  const malformedReq = { get: () => "Bearer not-a-jwt" };
  const malformedRes = responseRecorder();
  requireAuth(malformedReq, malformedRes, () => assert.fail("Malformed token must not continue."));
  assert.equal(malformedRes.statusCode, 401);

  const noSubjectToken = jwt.sign({ role: "student" }, process.env.JWT_SECRET);
  const noSubjectRes = responseRecorder();
  requireAuth({ get: () => `Bearer ${noSubjectToken}` }, noSubjectRes, () => assert.fail("JWT without a subject must not continue."));
  assert.equal(noSubjectRes.statusCode, 401);
});
