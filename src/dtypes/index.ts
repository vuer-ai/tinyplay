/**
 * Public entry for the dtype registry.
 *
 * Importing `@vuer-ai/vuer-m3u` (or this module directly) registers the 13
 * built-in dtypes. Apps with custom dtypes call `registerDtype` at
 * bootstrap, before first `<TimelineContainer>` render.
 */

import { BUILTIN_DTYPES } from './builtin';
import { registerDtype } from './registry';

for (const spec of BUILTIN_DTYPES) {
  registerDtype(spec);
}

export {
  registerDtype,
  getDtype,
  listDtypes,
  hasDtype,
} from './registry';

export type {
  DtypeId,
  DtypeSpec,
  GroupConfig,
  TimelineViewEntry,
  TimelineViews,
} from './types';

export { BUILTIN_DTYPES } from './builtin';
