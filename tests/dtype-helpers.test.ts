import { describe, it, expect, beforeEach } from 'vitest';
import {
  resolveDtypeDefaults,
  resolveDtypeSpec,
} from '../src/react/players/dtype-helpers';
import {
  registerDtype,
  __resetDtypeRegistry,
} from '../src/dtypes/registry';
import { BUILTIN_DTYPES } from '../src/dtypes/builtin';

beforeEach(() => {
  __resetDtypeRegistry();
  for (const spec of BUILTIN_DTYPES) registerDtype(spec);
});

describe('resolveDtypeSpec', () => {
  it('returns undefined when ref is absent', () => {
    expect(resolveDtypeSpec(undefined)).toBeUndefined();
  });

  it('resolves a string id via the registry', () => {
    const spec = resolveDtypeSpec('joint_angles');
    expect(spec?.id).toBe('joint_angles');
  });

  it('passes through a DtypeSpec object', () => {
    const explicit = { id: 'custom', name: 'Custom' };
    expect(resolveDtypeSpec(explicit)).toBe(explicit);
  });

  it('returns undefined for unknown id', () => {
    expect(resolveDtypeSpec('nope')).toBeUndefined();
  });
});

describe('resolveDtypeDefaults', () => {
  it('returns explicit unchanged when no ref provided', () => {
    expect(resolveDtypeDefaults(undefined, { foo: 1 })).toEqual({ foo: 1 });
  });

  it('merges dtype defaults under explicit props', () => {
    const merged = resolveDtypeDefaults('joint_angles', {});
    expect(merged.range).toEqual([-Math.PI, Math.PI]);
    expect(merged.unit).toBe('rad');
  });

  it('explicit props win over dtype defaults', () => {
    const merged = resolveDtypeDefaults('joint_angles', {
      range: [0, 2 * Math.PI],
    });
    expect(merged.range).toEqual([0, 2 * Math.PI]);
    expect(merged.unit).toBe('rad'); // still inherited
  });

  it('unknown id returns explicit unchanged', () => {
    const merged = resolveDtypeDefaults('nope', { foo: 1 });
    expect(merged).toEqual({ foo: 1 });
  });

  it('dtype with no defaults leaves explicit unchanged', () => {
    registerDtype({ id: 'bare', name: 'Bare' }); // no defaults
    expect(resolveDtypeDefaults('bare', { foo: 1 })).toEqual({ foo: 1 });
  });
});
