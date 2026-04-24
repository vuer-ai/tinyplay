import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerDtype,
  getDtype,
  listDtypes,
  hasDtype,
  __resetDtypeRegistry,
} from '../src/dtypes/registry';
import { BUILTIN_DTYPES } from '../src/dtypes/builtin';

beforeEach(() => {
  __resetDtypeRegistry();
});

describe('dtype registry', () => {
  it('registerDtype + getDtype round-trips', () => {
    registerDtype({ id: 'foo', name: 'Foo', defaults: { shape: [3] } });
    const spec = getDtype('foo');
    expect(spec?.id).toBe('foo');
    expect(spec?.name).toBe('Foo');
    expect(spec?.defaults).toEqual({ shape: [3] });
  });

  it('getDtype returns undefined for unknown ids', () => {
    expect(getDtype('nope')).toBeUndefined();
  });

  it('hasDtype returns truthy only after registration', () => {
    expect(hasDtype('x')).toBe(false);
    registerDtype({ id: 'x', name: 'X' });
    expect(hasDtype('x')).toBe(true);
  });

  it('listDtypes returns registered specs', () => {
    registerDtype({ id: 'a', name: 'A' });
    registerDtype({ id: 'b', name: 'B' });
    const ids = listDtypes().map((d) => d.id).sort();
    expect(ids).toEqual(['a', 'b']);
  });

  it('registerDtype overwrites on duplicate id', () => {
    registerDtype({ id: 'imu', name: 'IMU', defaults: { shape: [6] } });
    registerDtype({ id: 'imu', name: 'IMU-v2', defaults: { shape: [9] } });
    expect(getDtype('imu')?.name).toBe('IMU-v2');
    expect(getDtype('imu')?.defaults).toEqual({ shape: [9] });
  });

  it('registerDtype throws on empty id', () => {
    expect(() => registerDtype({ id: '', name: 'bad' })).toThrow(
      /spec.id is required/,
    );
  });
});

describe('BUILTIN_DTYPES', () => {
  it('covers the 13 shipped dtype ids', () => {
    const ids = BUILTIN_DTYPES.map((d) => d.id).sort();
    expect(ids).toEqual(
      [
        'action_label',
        'audio',
        'detection_2d',
        'image',
        'imu_6dof',
        'joint_angles',
        'marker_event',
        'pose_6dof',
        'ribbon_state',
        'scalar',
        'subtitle',
        'vector',
        'video',
      ].sort(),
    );
  });

  it('joint_angles has default range and unit', () => {
    const spec = BUILTIN_DTYPES.find((d) => d.id === 'joint_angles')!;
    expect(spec.defaults).toEqual({ range: [-Math.PI, Math.PI], unit: 'rad' });
  });
});
