#!/usr/bin/env node
/**
 * Pointer to the dev-only virtualization stress harness (no automated FPS capture).
 * Usage: run the SPA in dev, sign in as SUPER_ADMIN, open the printed URL(s).
 */
const base = '/dashboard/admin/users/stress';

console.log('Admin users grid — manual stress URLs (dev build):');
for (const n of [1000, 10000, 50000]) {
  console.log(`  ${base}?n=${n}`);
}
console.log('');
console.log('Tip: Chrome DevTools → Performance + React Profiler while scrolling.');
console.log('Note: 50k mocks allocate a large in-memory array — use for local profiling only.');
