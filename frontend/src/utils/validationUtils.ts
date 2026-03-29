export const isValidEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
  if (!regex.test(email)) return false;

  const invalidTLDs = [".co", ".c", ".om", ".cm"];
  const lower = email.toLowerCase();
  if (invalidTLDs.some((tld) => lower.endsWith(tld))) return false;

  return true;
};
