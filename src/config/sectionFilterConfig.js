const SECTION_FILTER_STORAGE_KEY = 'mga-section-filter';

/** Section has a visible category-column label (filter button target). */
export function isPlanSectionFilterTarget(section) {
  return Boolean(section?.label) && !section.hideCategory;
}

/** section.id list in plan table order. */
export function getPlanSectionFilterIds(sections = []) {
  return sections.filter(isPlanSectionFilterTarget).map((s) => s.id);
}

/** Filter key for row visibility (rows without category follow a parent section). */
export function getSectionFilterKey(section) {
  if (!section) return null;
  if (isPlanSectionFilterTarget(section)) return section.id;
  if (section.id === 'sgaTaxable' || section.id === 'sgaTotal') return 'other';
  return section.id;
}

export function defaultSectionFilterState(sectionIds = []) {
  return Object.fromEntries(sectionIds.map((id) => [id, true]));
}

export function normalizeSectionFilterConfig(config, sectionIds = []) {
  const result = defaultSectionFilterState(sectionIds);
  if (!config || typeof config !== 'object') return result;
  for (const id of sectionIds) {
    if (typeof config[id] === 'boolean') result[id] = config[id];
  }
  return result;
}

export function loadSectionFilterConfig(sectionIds = []) {
  try {
    const raw = localStorage.getItem(SECTION_FILTER_STORAGE_KEY);
    return normalizeSectionFilterConfig(raw ? JSON.parse(raw) : null, sectionIds);
  } catch {
    return defaultSectionFilterState(sectionIds);
  }
}

export function saveSectionFilterConfig(config, sectionIds = []) {
  localStorage.setItem(
    SECTION_FILTER_STORAGE_KEY,
    JSON.stringify(normalizeSectionFilterConfig(config, sectionIds)),
  );
}

export function isAllSectionFiltersEnabled(config, sectionIds = []) {
  return sectionIds.every((id) => config[id] !== false);
}

/** True when only filterId is enabled (solo display). */
export function isSoloSectionFilter(config, sectionIds = [], filterId) {
  return sectionIds.every((id) => config[id] === (id === filterId));
}

export function sectionMatchesFilter(section, config, sectionIds = []) {
  if (!section) return true;
  if (isAllSectionFiltersEnabled(config, sectionIds)) return true;
  const key = getSectionFilterKey(section);
  return config[key] !== false;
}
