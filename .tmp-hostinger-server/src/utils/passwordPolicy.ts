const MIN_LEN = 8;
const MAX_LEN = 128;

/** Basic policy: length + not only whitespace (reduces credential stuffing success). */
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
}
