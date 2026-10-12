import test from "node:test";
import assert from "node:assert/strict";
import { validateProfilePayload } from "../src/profileValidation.js";

const validProfile = {
  name: "  Ada Tutor  ",
  email: " ADA@example.com ",
  profileImage: " https://example.com/ada.png "
};

test("normalizes profile name, email, and photo URL", () => {
  assert.deepEqual(validateProfilePayload(validProfile), {
    value: {
      name: "Ada Tutor",
      email: "ada@example.com",
      profileImage: "https://example.com/ada.png"
    }
  });
});

test("allows profile photo to be cleared", () => {
  assert.equal(validateProfilePayload({ ...validProfile, profileImage: " " }).value.profileImage, "");
});

test("rejects missing or oversized names and invalid emails", () => {
  assert.ok(validateProfilePayload({ ...validProfile, name: " " }).error);
  assert.ok(validateProfilePayload({ ...validProfile, name: "A".repeat(81) }).error);
  assert.ok(validateProfilePayload({ ...validProfile, email: "not-an-email" }).error);
});

test("rejects non-HTTP profile photo URLs", () => {
  assert.ok(validateProfilePayload({ ...validProfile, profileImage: "javascript:alert(1)" }).error);
});

test("does not accept account role as an editable profile field", () => {
  const result = validateProfilePayload({ ...validProfile, role: "tutor" });

  assert.deepEqual(Object.keys(result.value), ["name", "email", "profileImage"]);
});
