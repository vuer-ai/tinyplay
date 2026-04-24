import type { DtypeId, DtypeSpec } from './types';

/**
 * Module-scoped dtype registry. Parallel to `registerDecoder` in
 * `core/decoders/index.ts` — simple, global, non-magical.
 *
 * Built-in specs register at module load (see `./builtin.ts`). Apps with
 * custom dtypes call `registerDtype` once at bootstrap before rendering any
 * `<TimelineContainer>`.
 */
const DTYPES = new Map<DtypeId, DtypeSpec>();

export function registerDtype(spec: DtypeSpec): void {
  if (!spec.id) {
    throw new Error('[vuer-m3u dtypes] registerDtype: spec.id is required.');
  }
  DTYPES.set(spec.id, spec);
}

export function getDtype(id: DtypeId): DtypeSpec | undefined {
  return DTYPES.get(id);
}

export function listDtypes(): readonly DtypeSpec[] {
  return [...DTYPES.values()];
}

export function hasDtype(id: DtypeId): boolean {
  return DTYPES.has(id);
}

/**
 * Test-only: wipe the registry. Not exported from the public package
 * entry. Used in `tests/dtypes-registry.test.ts`.
 *
 * @internal
 */
export function __resetDtypeRegistry(): void {
  DTYPES.clear();
}
