import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { userMessageFromUnknown } from '@/lib/apiErrors';
import api from '@/api';
import { fetchAdminUsers, updateAdminUser } from '@/services/adminPanelService';
import type { AdminUserRow } from '@/types/adminPanel';
import {
  DEFAULT_ADMIN_USER_DIRECTORY_SORT,
  parseAdminUserDirectorySort,
  type AdminUserDirectorySortKey,
} from '@/types/adminUsersDirectory';
import { useAuth } from '@/hooks/useAuth';
import {
  normalizeUserLifecycle,
  normalizeUserLifecycleList,
} from '@/lib/normalizeUserLifecycle';

function expandLifecyclePatchForOptimistic(row: AdminUserRow, patch: Record<string, unknown>): Record<string, unknown> {
  if (typeof patch.accountStatus !== 'string') return patch;
  const st = String(patch.accountStatus).toUpperCase();
  const base = { ...patch };
  if (st === 'ACTIVE') {
    base.isApproved = true;
    base.isActive = true;
  } else if (st === 'PENDING') {
    base.isApproved = false;
    base.isActive = false;
  } else if (st === 'SUSPENDED') {
    base.isActive = false;
  }
  return base;
}

function mergeAdminUserRow(row: AdminUserRow, patch: Record<string, unknown>): AdminUserRow {
  const effective = expandLifecyclePatchForOptimistic(row, patch);
  let next: AdminUserRow = { ...row };
  if (typeof effective.isActive === 'boolean') next = { ...next, isActive: effective.isActive };
  if (typeof effective.isApproved === 'boolean') next = { ...next, isApproved: effective.isApproved };
  if (typeof effective.accountStatus === 'string') next = { ...next, accountStatus: effective.accountStatus };
  if (typeof effective.role === 'string') next = { ...next, role: effective.role };
  if (typeof effective.clinicId === 'string') next = { ...next, clinicId: effective.clinicId };
  if (typeof effective.name === 'string') next = { ...next, name: effective.name };
  return normalizeUserLifecycle(next);
}

function useDebouncedValue<T>(value: T, ms: number): T {
  const [out, setOut] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setOut(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return out;
}

/**
 * Enterprise user directory: URL-synced `?page=&q=&limit=&sort=` + debounced search,
 * server pagination with SUPER_ADMIN page sizes up to 500 (API cap).
 */
export function useAdminUsersDashboardView(options?: { defaultLimit?: number }) {
  const defaultLimit = options?.defaultLimit ?? 100;
  const { user } = useAuth();
  const maxLimit = user?.role === 'SUPER_ADMIN' ? 500 : 100;

  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
  const qFromUrl = searchParams.get('q') ?? '';
  const limitFromUrl = searchParams.get('limit');
  const sortFromUrl = searchParams.get('sort');

  const parsedLimit = limitFromUrl ? Number.parseInt(limitFromUrl, 10) : NaN;
  const pageSize = Math.min(
    maxLimit,
    Math.max(10, Number.isFinite(parsedLimit) ? parsedLimit : defaultLimit),
  );

  const sortApplied = parseAdminUserDirectorySort(sortFromUrl);

  const [qDraft, setQDraft] = useState(qFromUrl);

  useEffect(() => {
    setQDraft(qFromUrl);
  }, [qFromUrl]);

  const debouncedQ = useDebouncedValue(qDraft, 320);

  useEffect(() => {
    const next = debouncedQ.trim();
    const cur = qFromUrl.trim();
    if (next === cur) return;
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        if (next) n.set('q', next);
        else n.delete('q');
        n.set('page', '1');
        return n;
      },
      { replace: true },
    );
  }, [debouncedQ, qFromUrl, setSearchParams]);

  const searchApplied = useMemo(() => qFromUrl.trim(), [qFromUrl]);

  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetchAdminUsers({
        page,
        limit: pageSize,
        sort: sortApplied,
        ...(searchApplied ? { search: searchApplied } : {}),
      });
      setRows(normalizeUserLifecycleList(res.users));
      setTotal(res.total);
    } catch (e) {
      setRows([]);
      setTotal(0);
      setError(userMessageFromUnknown(e));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchApplied, sortApplied]);

  useEffect(() => {
    void load();
  }, [load]);

  const setPage = useCallback(
    (nextPage: number) => {
      const p = Math.max(1, nextPage);
      setSearchParams(
        (prev) => {
          const n = new URLSearchParams(prev);
          n.set('page', String(p));
          return n;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setLimit = useCallback(
    (nextLimit: number) => {
      const clamped = Math.min(maxLimit, Math.max(10, nextLimit));
      setSearchParams(
        (prev) => {
          const n = new URLSearchParams(prev);
          n.set('limit', String(clamped));
          n.set('page', '1');
          return n;
        },
        { replace: true },
      );
    },
    [maxLimit, setSearchParams],
  );

  const setSort = useCallback(
    (nextSort: AdminUserDirectorySortKey) => {
      setSearchParams(
        (prev) => {
          const n = new URLSearchParams(prev);
          if (nextSort === DEFAULT_ADMIN_USER_DIRECTORY_SORT) n.delete('sort');
          else n.set('sort', nextSort);
          n.set('page', '1');
          return n;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const updateUserRole = useCallback(
    async (userId: string, nextRole: string) => {
      setUpdatingId(userId);
      setError(null);
      const rolledBack = { snapshot: null as AdminUserRow[] | null };
      setRows((curr) => {
        rolledBack.snapshot = curr;
        return curr.map((row) => (row.id === userId ? mergeAdminUserRow(row, { role: nextRole }) : row));
      });
      try {
        await updateAdminUser(userId, { role: nextRole });
        await load();
        if (import.meta.env.DEV) {
          console.info('[AdminUsers] role updated', userId, nextRole);
        }
        return true;
      } catch (e) {
        if (rolledBack.snapshot) setRows(rolledBack.snapshot);
        setError(userMessageFromUnknown(e));
        if (import.meta.env.DEV) {
          console.warn('[AdminUsers] role update failed', userId, e);
        }
        return false;
      } finally {
        setUpdatingId(null);
      }
    },
    [load],
  );

  const patchUser = useCallback(
    async (userId: string, patch: Record<string, unknown>) => {
      setUpdatingId(userId);
      setError(null);
      const rolledBack = { snapshot: null as AdminUserRow[] | null };
      setRows((curr) => {
        rolledBack.snapshot = curr;
        return curr.map((row) => (row.id === userId ? mergeAdminUserRow(row, patch) : row));
      });
      try {
        await updateAdminUser(userId, patch);
        await load();
        if (import.meta.env.DEV) {
          console.info('[AdminUsers] user patched', userId, Object.keys(patch));
        }
        return true;
      } catch (e) {
        if (rolledBack.snapshot) setRows(rolledBack.snapshot);
        setError(userMessageFromUnknown(e));
        if (import.meta.env.DEV) {
          console.warn('[AdminUsers] patch failed', userId, e);
        }
        return false;
      } finally {
        setUpdatingId(null);
      }
    },
    [load],
  );

  const revokeUserSessions = useCallback(
    async (userId: string) => {
      setUpdatingId(userId);
      setError(null);
      try {
        await api.admin.revokeUserSessions(userId);
        await load();
        return true;
      } catch (e) {
        setError(userMessageFromUnknown(e));
        return false;
      } finally {
        setUpdatingId(null);
      }
    },
    [load],
  );

  /** Sequential bulk write then one reload — use smaller selections for very large batches. */
  const bulkApply = useCallback(
    async (ids: readonly string[], patch: Record<string, unknown>) => {
      if (ids.length === 0) return true;
      setUpdatingId('__bulk__');
      setError(null);
      try {
        for (const id of ids) {
          await updateAdminUser(id, patch);
        }
        await load();
        return true;
      } catch (e) {
        setError(userMessageFromUnknown(e));
        return false;
      } finally {
        setUpdatingId(null);
      }
    },
    [load],
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    rows,
    loading,
    error,
    page,
    setPage,
    total,
    totalPages,
    limit: pageSize,
    setLimit,
    maxLimit,
    sort: sortApplied,
    setSort,
    defaultSort: DEFAULT_ADMIN_USER_DIRECTORY_SORT,
    qDraft,
    setQDraft,
    searchApplied,
    updatingId,
    reload: load,
    updateUserRole,
    patchUser,
    revokeUserSessions,
    bulkApply,
    clearError: () => setError(null),
  };
}
