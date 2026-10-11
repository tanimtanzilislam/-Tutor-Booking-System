import test from "node:test";
import assert from "node:assert/strict";
import { isValidRegistrationPassword } from "../src/passwordRules.js";

test("accepts passwords meeting the six-character uppercase and lowercase rules", () => {
  assert.equal(isValidRegistrationPassword("Abc123"), true);
});

test("rejects passwords shorter than six characters", () => {
  assert.equal(isValidRegistrationPassword("Abc12"), false);
});

test("rejects passwords without an uppercase letter", () => {
  assert.equal(isValidRegistrationPassword("abcdef1"), false);
});

test("rejects passwords without a lowercase letter", () => {
  assert.equal(isValidRegistrationPassword("ABCDEF1"), false);
});

test("rejects missing or non-string passwords", () => {
  assert.equal(isValidRegistrationPassword(""), false);
  assert.equal(isValidRegistrationPassword(undefined), false);
});
