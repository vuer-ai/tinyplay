import type { LaneComponent } from '../types/lanes';

/**
 * Group-node right-side "lane". Renders nothing — the tree column carries
 * the header label + chevron. The lane area keeps a faint striped
 * background via a CSS class applied by LaneColumn so the row reads as
 * structural rather than content.
 */
export const GroupLane: LaneComponent<Record<string, unknown>> = () => null;
GroupLane.__viewName = 'Group';
