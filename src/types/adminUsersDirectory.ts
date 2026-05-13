/** Mirrors server `ADMIN_USERS_LIST_SORT_KEYS` — keep aligned when adding sorts. */
export const ADMIN_USER_DIRECTORY_SORT_KEYS = [
  'createdAt_desc',
  'createdAt_asc',
  'email_asc',
  'email_desc',
  'name_asc',
  'name_desc',
] as const;

export type AdminUserDirectorySortKey = (typeof ADMIN_USER_DIRECTORY_SORT_KEYS)[number];

export const DEFAULT_ADMIN_USER_DIRECTORY_SORT: AdminUserDirectorySortKey = 'createdAt_desc';

export function parseAdminUserDirectorySort(raw: string | null): AdminUserDirectorySortKey {
  if (raw && (ADMIN_USER_DIRECTORY_SORT_KEYS as readonly string[]).includes(raw)) {
    return raw as AdminUserDirectorySortKey;
  }
  return DEFAULT_ADMIN_USER_DIRECTORY_SORT;
}
