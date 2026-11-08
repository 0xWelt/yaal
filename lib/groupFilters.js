// Directory filter rows follow the real tree. Each selected group reveals the
// next level only when that node has children. Tags are always the last row.

/**
 * @typedef {Object} GroupNode
 * @property {string} name
 * @property {string} [description]
 * @property {Record<string, GroupNode>} [children]
 * @property {Record<string, GroupNode>} [subcategories]
 * @property {unknown[]} [tools]
 */

/**
 * @typedef {Object} GroupOption
 * @property {string} name
 * @property {string} description
 */

/**
 * @typedef {Object} GroupFilterRow
 * @property {'groups'} kind
 * @property {number} depth
 * @property {GroupOption[]} options
 * @property {string} selected
 */

/**
 * @typedef {Object} TagFilterRow
 * @property {'tags'} kind
 * @property {string[]} tags
 * @property {string[]} selected
 */

/**
 * @typedef {GroupFilterRow | TagFilterRow} FilterRow
 */

/**
 * @typedef {Object} GroupedTool
 * @property {string} category
 * @property {string} [subcategory]
 * @property {string[]} [groups]
 */

/**
 * Immediate child groups. `children` is the recursive tree; `subcategories`
 * remains readable for data generated before arbitrary depth.
 * @param {GroupNode | undefined | null} node
 * @returns {Record<string, GroupNode>}
 */
export function childRecord(node) {
  if (!node) return {};
  if (node.children) return node.children;
  return node.subcategories || {};
}

/**
 * @param {GroupNode | undefined | null} node
 * @returns {GroupOption[]}
 */
export function listChildren(node) {
  return Object.entries(childRecord(node))
    .filter(([name]) => name && name !== '__NO_SUBCATEGORY__')
    .map(([name, child]) => ({
      name,
      description: child?.description || '',
    }));
}

/**
 * Grouping path for a tool. Falls back to category + subcategory when `groups`
 * is missing so existing two-level lists keep filtering.
 * @param {GroupedTool} tool
 * @returns {string[]}
 */
export function toolGroups(tool) {
  if (Array.isArray(tool.groups) && tool.groups.length > 0) {
    return tool.groups;
  }
  if (tool.subcategory && tool.subcategory !== '__NO_SUBCATEGORY__') {
    return [tool.category, tool.subcategory];
  }
  return [tool.category];
}

/**
 * A selected path matches a tool when it is a prefix of that tool's groups
 * below the category. "All" (an empty path) matches every tool in the category.
 * @param {GroupedTool} tool
 * @param {string[]} selectedCategories
 * @param {string[]} selectedPath
 * @returns {boolean}
 */
export function toolMatchesSelection(tool, selectedCategories, selectedPath) {
  if (
    selectedCategories.length > 0 &&
    !selectedCategories.includes(tool.category)
  ) {
    return false;
  }
  if (selectedCategories.length !== 1 || selectedPath.length === 0) {
    return true;
  }
  const rest = toolGroups(tool).slice(1);
  return selectedPath.every((name, index) => rest[index] === name);
}

/**
 * Rows under the top-level category bar: one row per visible directory level,
 * then tags. A node with no children does not add a row.
 * @param {{
 *   category?: GroupNode | null,
 *   selectedPath?: string[],
 *   tags?: string[],
 *   selectedTags?: string[],
 * }} input
 * @returns {FilterRow[]}
 */
export function buildFilterRows(input) {
  /** @type {FilterRow[]} */
  const rows = [];
  const selectedPath = input.selectedPath || [];
  let node = input.category || null;

  for (let depth = 0; node; depth++) {
    const options = listChildren(node);
    if (options.length === 0) break;
    const selected = selectedPath[depth] || '';
    rows.push({ kind: 'groups', depth, options, selected });
    if (!selected) break;
    const next = childRecord(node)[selected];
    if (!next) break;
    node = next;
  }

  const tags = input.tags || [];
  if (tags.length > 0) {
    rows.push({
      kind: 'tags',
      tags,
      selected: input.selectedTags || [],
    });
  }
  return rows;
}

/**
 * Restore the drill-down path from a shared URL.
 * `subcategory` is the first child (existing links). Further levels are `group`.
 * @param {URLSearchParams} params
 * @param {boolean} singleCategory
 * @returns {string[]}
 */
export function pathFromSearchParams(params, singleCategory) {
  if (!singleCategory) return [];
  const subcategory = params.get('subcategory') || '';
  if (!subcategory) return [];
  return [subcategory, ...params.getAll('group').filter(Boolean)];
}

/**
 * @param {URLSearchParams} params
 * @param {string[]} selectedPath
 */
export function appendPathParams(params, selectedPath) {
  if (!selectedPath[0]) return;
  params.set('subcategory', selectedPath[0]);
  for (const group of selectedPath.slice(1)) {
    if (group) params.append('group', group);
  }
}

/**
 * Count entries stored on a category node and every nested group.
 * Accepts both the recursive `children` tree and older `subcategories` maps.
 * @param {any} node
 * @returns {number}
 */
export function countGroupedTools(node) {
  if (!node) return 0;
  const nested = Object.values(childRecord(node)).reduce(
    (sum, child) => sum + countGroupedTools(child),
    0
  );
  const direct = Array.isArray(node.tools) ? node.tools.length : 0;
  return direct + nested;
}
