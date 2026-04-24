import { describe, it, expect } from 'vitest';
import { flattenTree, initialCollapsed, hiddenInheritance } from '../src/timeline/tree';
import type { TrackRow } from '../src/timeline/types/config';
import type { GroupConfig } from '../src/dtypes/types';

function t(id: string, path: string): TrackRow {
  return { id, path, dtype: 'vector', data: [] };
}

describe('flattenTree (path-based)', () => {
  it('flat paths render as root tracks', () => {
    const rows = flattenTree([t('a', 'events'), t('b', 'alarms')]);
    expect(rows.map((r) => [r.kind, r.id, r.depth])).toEqual([
      ['track', 'a', 0],
      ['track', 'b', 0],
    ]);
  });

  it('nested paths synthesize group rows', () => {
    const rows = flattenTree([t('wc', 'cams/wrist'), t('sc', 'cams/scene')]);
    expect(rows.map((r) => [r.kind, r.id, r.depth])).toEqual([
      ['group', 'cams', 0],
      ['track', 'wc', 1],
      ['track', 'sc', 1],
    ]);
  });

  it('deep paths synthesize intermediate groups', () => {
    const rows = flattenTree([t('qpos', 'robot/arm/qpos')]);
    expect(rows.map((r) => [r.kind, r.id, r.depth])).toEqual([
      ['group', 'robot', 0],
      ['group', 'robot/arm', 1],
      ['track', 'qpos', 2],
    ]);
  });

  it('group order follows first-mentioned track', () => {
    const rows = flattenTree([
      t('a', 'b/x'),
      t('b', 'a/y'),
    ]);
    // 'b' prefix appears first (via 'b/x'), so it renders before 'a'.
    expect(rows.filter((r) => r.kind === 'group').map((r) => r.id)).toEqual([
      'b',
      'a',
    ]);
  });

  it('applies group overrides', () => {
    const groups: Record<string, GroupConfig> = {
      cams: { name: 'Cameras', color: 'green', icon: 'video' },
    };
    const rows = flattenTree([t('wc', 'cams/wrist_cam')], { groups });
    const group = rows.find((r) => r.kind === 'group')!;
    expect(group.kind).toBe('group');
    if (group.kind === 'group') {
      expect(group.name).toBe('Cameras');
      expect(group.config.color).toBe('green');
      expect(group.config.icon).toBe('video');
    }
  });

  it('group name defaults to path leaf', () => {
    const rows = flattenTree([t('qpos', 'robot/arm/qpos')]);
    const g = rows.find((r) => r.id === 'robot/arm')!;
    expect(g.kind).toBe('group');
    if (g.kind === 'group') expect(g.name).toBe('arm');
  });

  it('isLast + ancestorIsLast reflect the tree structure', () => {
    const rows = flattenTree([
      t('a', 'g/a'),
      t('b', 'g/b'),
    ]);
    expect(rows[1].isLast).toBe(false); // 'a' is not last of 'g'
    expect(rows[2].isLast).toBe(true); // 'b' is last of 'g'
    expect(rows[0].isLast).toBe(true); // 'g' is the only root
    expect(rows[1].ancestorIsLast).toEqual([true]);
  });

  it('collapsed prefixes skip their children', () => {
    const rows = flattenTree(
      [t('wc', 'cams/wrist'), t('sc', 'cams/scene')],
      { collapsed: new Set(['cams']) },
    );
    expect(rows.map((r) => r.id)).toEqual(['cams']);
  });

  it('filter keeps matching track plus ancestors and descendants', () => {
    const rows = flattenTree(
      [t('qpos', 'robot/arm/qpos'), t('wc', 'cams/wrist')],
      { filter: 'qpos' },
    );
    expect(rows.map((r) => r.id)).toEqual(['robot', 'robot/arm', 'qpos']);
  });

  it('filter matches group name override', () => {
    const rows = flattenTree(
      [t('wc', 'cams/wrist'), t('a', 'robot/arm')],
      { filter: 'Cameras', groups: { cams: { name: 'Cameras' } } },
    );
    expect(rows.map((r) => r.id)).toEqual(['cams', 'wc']);
  });

  it('invalid regex yields empty result set (no throw)', () => {
    const rows = flattenTree([t('a', 'x/y')], {
      filter: '[',
      regex: true,
    });
    expect(rows).toEqual([]);
  });
});

describe('initialCollapsed', () => {
  it('pulls prefixes with expanded: false', () => {
    const s = initialCollapsed({
      cams: { expanded: false },
      robot: { expanded: true },
      narr: {},
    });
    expect([...s].sort()).toEqual(['cams']);
  });

  it('returns empty set when groups is undefined', () => {
    expect([...initialCollapsed()].length).toBe(0);
  });
});

describe('hiddenInheritance', () => {
  it('track inherits when an ancestor prefix is hidden', () => {
    const tracks = [t('wc', 'cams/wrist_cam')];
    const inherit = hiddenInheritance(tracks, new Set(['cams']));
    expect(inherit.get('wc')).toBe(true);
    expect(inherit.get('cams')).toBe(false);
  });

  it('deeper tracks inherit through multiple levels', () => {
    const tracks = [t('qpos', 'robot/arm/qpos')];
    const inherit = hiddenInheritance(tracks, new Set(['robot']));
    expect(inherit.get('qpos')).toBe(true);
    expect(inherit.get('robot/arm')).toBe(true);
  });

  it('sibling tracks are unaffected', () => {
    const tracks = [t('a', 'g/a'), t('b', 'h/b')];
    const inherit = hiddenInheritance(tracks, new Set(['g']));
    expect(inherit.get('a')).toBe(true);
    expect(inherit.get('b')).toBe(false);
  });
});
