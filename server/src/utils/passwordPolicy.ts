const MIN_LEN = 8;
const MAX_LEN = 128;

/** Basic policy: length + simple complexity (reduces guessable passwords). */
export function assertPasswordAcceptable(password: unknown, label = 'Password'): void {
  if (typeof password !== 'string') {
    throw new Error(`${label} is required`);
  }
  const t = password.trim();
  if (t.length < MIN_LEN) {
    throw new Error(`${label} must be at least ${MIN_LEN} characters`);
  }
  if (t.length > MAX_LEN) {
    throw new Error(`${label} is too long`);
  }
  if (!/[A-Za-z]/.test(t) || !/\d/.test(t)) {
    throw new Error(`${label} must include at least one letter and one number`);
  }
}
