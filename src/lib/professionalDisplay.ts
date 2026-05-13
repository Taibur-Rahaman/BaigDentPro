import type { AppUser } from '@/types/appUser';

/** Tenant shell / dashboard: short professional greeting from stored title + name + degree. */
export function formatShellUserLabel(user: Pick<AppUser, 'name' | 'title' | 'degree'>): string {
  const name = (user.name ?? '').trim();
  const title = (user.title ?? '').trim();
  const deg = (user.degree ?? '').trim();
  let head = name;
  if (title) {
    const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const already = new RegExp(`^${escaped}\\s`, 'i').test(name);
    const nameHasDr = /^dr\.?\s/i.test(name);
    const titleIsDr = /^dr\.?$/i.test(title.replace(/\s+$/, ''));
    if (!already && !(nameHasDr && titleIsDr)) head = `${title} ${name}`.trim();
  }
  return deg ? `${head} (${deg})` : head;
}
