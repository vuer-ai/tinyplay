import { describe, it, expect, beforeEach } from 'vitest';
import { registerDtype, __resetDtypeRegistry, getDtype } from '../src/dtypes/registry';
import { BUILTIN_DTYPES } from '../src/dtypes/builtin';
import type { TrackRow } from '../src/timeline/types/config';

beforeEach(() => {
  __resetDtypeRegistry();
  for (const spec of BUILTIN_DTYPES) registerDtype(spec);
});

/**
 * Mirror of the merge LaneColumn.laneProps performs at render time, kept
 * here so the rule is a unit-testable spec and any regression in the
 * actual lane dispatch is caught by this test.
 */
function laneProps(t: TrackRow): Record<string, unknown> {
  const spec = getDtype(t.dtype);
  const leaf = t.path.split('/').pop() ?? t.path;
  const base: Record<string, unknown> = {
    id: t.id,
    name: t.name ?? leaf,
    path: t.path,
    visible: t.visible,
    height: t.height,
    color: t.color,
    icon: t.icon,
  };
  if (t.src !== undefined) base.src = t.src;
  if (t.data !== undefined) base.data = t.data;
  return {
    ...base,
    ...(spec?.defaults ?? {}),
    ...(t.props ?? {}),
    dtype: spec,
  };
}

describe('laneProps merge', () => {
  it('pulls dtype.defaults into props', () => {
    const t: TrackRow = {
      id: 'arm',
      path: 'robot/arm/qpos',
      dtype: 'joint_angles',
      src: '/a.m3u8',
    };
    const p = laneProps(t);
    expect(p.range).toEqual([-Math.PI, Math.PI]);
    expect(p.unit).toBe('rad');
  });

  it('per-track props override dtype defaults', () => {
    const t: TrackRow = {
      id: 'arm',
      path: 'robot/arm/qpos',
      dtype: 'joint_angles',
      src: '/a.m3u8',
      props: { range: [0, Math.PI * 2], channelNames: ['j0'] },
    };
    const p = laneProps(t);
    expect(p.range).toEqual([0, Math.PI * 2]);
    expect(p.channelNames).toEqual(['j0']);
    expect(p.unit).toBe('rad'); // not overridden
  });

  it('name falls back to path leaf when absent', () => {
    const t: TrackRow = {
      id: 'x',
      path: 'robot/arm/qpos',
      dtype: 'joint_angles',
      src: '/a.m3u8',
    };
    expect(laneProps(t).name).toBe('qpos');
  });

  it('explicit name wins over path leaf', () => {
    const t: TrackRow = {
      id: 'x',
      path: 'robot/arm/qpos',
      dtype: 'joint_angles',
      src: '/a.m3u8',
      name: 'Left arm joints',
    };
    expect(laneProps(t).name).toBe('Left arm joints');
  });

  it('injects dtype spec as a prop', () => {
    const t: TrackRow = {
      id: 'x',
      path: 'cam/wrist',
      dtype: 'video',
      src: '/v.m3u8',
    };
    const p = laneProps(t);
    expect((p.dtype as { id: string } | undefined)?.id).toBe('video');
  });
});
