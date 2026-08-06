export const PASSWORD_REQUIREMENTS = [
  { label: "10 or more characters", test: (value: string) => value.length >= 10 },
  { label: "One uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { label: "One lowercase letter", test: (value: string) => /[a-z]/.test(value) },
  { label: "One number", test: (value: string) => /[0-9]/.test(value) },
  {
    label: "One special character",
    test: (value: string) => /[^A-Za-z0-9\s]/.test(value),
  },
  {
    label: "No spaces at the beginning or end",
    test: (value: string) => !/^\s|\s$/.test(value),
  },
] as const;

export function isStrongPassword(value: string): boolean {
  return (
    value.length <= 200 &&
    PASSWORD_REQUIREMENTS.every((requirement) => requirement.test(value))
  );
}

export function passwordPolicyMessage(value: string): string | null {
  const missing = PASSWORD_REQUIREMENTS.find((requirement) => !requirement.test(value));
  if (missing) return `Password needs: ${missing.label.toLowerCase()}.`;
  if (value.length > 200) return "Password must be 200 characters or fewer.";
  return null;
}
