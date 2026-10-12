import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import requireAuth from "../src/middleware/requireAuth.js";

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
  const token = jwt.sign({ sub: "student-123" }, process.env.JWT_SECRET);
  const req = { get: () => `Bearer ${token}` };
  const res = responseRecorder();
  let continued = false;

  requireAuth(req, res, () => { continued = true; });

  assert.equal(req.userId, "student-123");
  assert.equal(continued, true);
  assert.equal(res.statusCode, 200);
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
