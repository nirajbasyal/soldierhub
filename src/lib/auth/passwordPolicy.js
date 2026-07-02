export const MIN_SIGNUP_PASSWORD_LENGTH = 10;

export function getSignupPasswordPolicy(value = "") {
  if (!value) return { state: "empty", message: "" };

  if (value.length < MIN_SIGNUP_PASSWORD_LENGTH) {
    return {
      state: "error",
      message: `Password must be at least ${MIN_SIGNUP_PASSWORD_LENGTH} characters.`,
    };
  }

  if (/^(.)\1+$/.test(value)) {
    return {
      state: "error",
      message: "Password is too easy to guess.",
    };
  }

  if (/password|soldierhub|qwerty|123456|abcdef/i.test(value)) {
    return {
      state: "error",
      message: "Password is too common.",
    };
  }

  return {
    state: "success",
    message: "Good password — 10+ characters.",
  };
}
