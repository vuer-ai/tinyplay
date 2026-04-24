import { getDtype } from '../../dtypes/registry';
import type { DtypeId, DtypeSpec } from '../../dtypes/types';

/**
 * A dtype reference — either the id of a registered dtype, or a full
 * `DtypeSpec`. Views accept this in their `dtype` prop.
 */
export type DtypeRef = DtypeId | DtypeSpec;

/**
 * Resolve a `DtypeRef` to its registered `DtypeSpec` (or `undefined` if
 * the id is unknown / the input is absent).
 */
export function resolveDtypeSpec(
  ref: DtypeRef | undefined,
): DtypeSpec | undefined {
  if (!ref) return undefined;
  return typeof ref === 'string' ? getDtype(ref) : ref;
}

/**
 * Merge a dtype's `defaults` map under a set of explicit props.
 *
 *   { ...spec.defaults, ...explicitProps }
 *
 * Explicit props always win. Views or custom components that want to
 * inherit dtype-level defaults (ranges, units, channel groupings) call
 * this once against their own props:
 *
 * ```ts
 * const merged = resolveDtypeDefaults(props.dtype, {
 *   range: props.range,
 *   unit: props.unit,
 * })
 * ```
 *
 * Undefined explicit values are still considered "set" — the spread
 * semantics of `{...defaults, ...explicit}` do NOT skip undefined keys,
 * so if a prop is explicitly `undefined` the default is shadowed. Strip
 * undefined keys from `explicit` before calling if that matters.
 */
export function resolveDtypeDefaults(
  ref: DtypeRef | undefined,
  explicit: Record<string, unknown>,
): Record<string, unknown> {
  const spec = resolveDtypeSpec(ref);
  if (!spec?.defaults) return explicit;
  return { ...spec.defaults, ...explicit };
}
