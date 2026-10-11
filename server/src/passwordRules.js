export function isValidRegistrationPassword(password) {
  return typeof password === "string" &&
    password.length >= 6 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password);
}
