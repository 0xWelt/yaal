// Browse rows follow the directory tree after transparent wrappers are opened.
// The first row is one category. Rows under it are multi-select. Tags are
// whatever the caller collected for that selection; an empty list adds no row.

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
 * @property {string[]} selected
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
 * @property {string[]} [tags]
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
 * A top-level directory is a transparent wrapper when it has no entries of its
 * own and mixes leaf sections with sections that have another directory level.
 * Awesome-Agent-Ecosystem's `contents/products/` is that shape: General Chat
 * holds entries directly, while Coding Agents and Personal Agents have
 * subclasses. Those children become the first browse row, beside Agent
 * Services, LLMs, and Standards. A uniform tree — every child a leaf, or every
 * path another level deeper — stays intact.
 * @param {GroupNode | undefined | null} node
 * @returns {boolean}
 */
export function isTransparentWrapper(node) {
  if (!node) return false;
  if (Array.isArray(node.tools) && node.tools.length > 0) return false;
  const children = Object.values(childRecord(node)).filter(Boolean);
  if (children.length === 0) return false;
  const hasLeafSection = children.some(
    (child) => Array.isArray(child.tools) && child.tools.length > 0
  );
  const hasNestedSection = children.some(
    (child) => Object.keys(childRecord(child)).length > 0
  );
  return hasLeafSection && hasNestedSection;
}

/**
 * First browse row. Wrapper children replace the wrapper and keep its place.
 * @param {Record<string, GroupNode> | undefined | null} categories
 * @returns {Record<string, GroupNode>}
 */
export function browseCategories(categories) {
  /** @type {Record<string, GroupNode>} */
  const result = {};
  for (const [name, node] of Object.entries(categories || {})) {
    if (!node) continue;
    if (isTransparentWrapper(node)) {
      for (const [childName, child] of Object.entries(childRecord(node))) {
        if (!childName || childName === '__NO_SUBCATEGORY__' || !child) {
          continue;
        }
        if (!result[childName]) result[childName] = child;
      }
      continue;
    }
    if (!result[name]) result[name] = node;
  }
  return result;
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
 * Drop a leading transparent wrapper so the first segment is a browse category.
 * @param {GroupedTool} tool
 * @param {Record<string, GroupNode>   | null} [categories]
 * @returns {string[]}
 */
export function toolBrowseGroups(tool, categories) {
  const groups = toolGroups(tool);
  if (!categories || groups.length < 2) return groups;
  const head = categories[groups[0]];
  if (head && isTransparentWrapper(head)) return groups.slice(1);
  return groups;
}

/**
 * `string[]` is a single path (one name per depth). `string[][]` is a
 * multi-select at each depth. Empty levels do not filter.
 * @param {string[] | string[][] | undefined | null} value
 * @returns {string[][]}
 */
export function nestedLevels(value) {
  if (!Array.isArray(value) || value.length === 0) return [];
  if (value.some((entry) => Array.isArray(entry))) {
    return value.map((entry) =>
      Array.isArray(entry)
        ? entry.filter((name) => typeof name === 'string' && name)
        : []
    );
  }
  return value
    .filter((name) => typeof name === 'string' && name)
    .map((name) => [name]);
}

/**
 * A tool matches the one browse category, then every nested level that has a
 * selection. Names at one level are OR. Levels are AND. Extra categories in
 * the list are ignored: the first name is the selection.
 * @param {GroupedTool} tool
 * @param {string[]} selectedCategories
 * @param {string[] | string[][]} selectedPath
 * @param {Record<string, GroupNode>   | null} [categories]
 * @returns {boolean}
 */
export function toolMatchesSelection(
  tool,
  selectedCategories,
  selectedPath,
  categories
) {
  const groups = toolBrowseGroups(tool, categories);
  const category = (selectedCategories || []).find((name) => name) || '';
  if (!category) return true;
  if (groups[0] !== category) return false;
  const rest = groups.slice(1);
  for (const [depth, names] of nestedLevels(selectedPath).entries()) {
    if (!names || names.length === 0) continue;
    if (!names.includes(rest[depth])) return false;
  }
  return true;
}

/**
 * Unique tags on these entries, in lexicographic order. Not a fixed vocabulary.
 * @param {GroupedTool[] | undefined | null} tools
 * @returns {string[]}
 */
export function collectTags(tools) {
  /** @type {Set<string>} */
  const tags = new Set();
  for (const tool of tools || []) {
    for (const tag of tool?.tags || []) {
      if (typeof tag === 'string' && tag) tags.add(tag);
    }
  }
  return Array.from(tags).sort();
}

/**
 * Tags for the current browse selection. No category, or a selection whose
 * entries have no tags, yields an empty list so the tag row stays hidden.
 * @param {GroupedTool[] | undefined | null} tools
 * @param {Record<string, GroupNode> | undefined | null} categories
 * @param {string} category
 * @param {string[] | string[][]} nested
 * @returns {string[]}
 */
export function tagsForSelection(tools, categories, category, nested) {
  if (!category) return [];
  return collectTags(
    (tools || []).filter((tool) =>
      toolMatchesSelection(tool, [category], nested, categories)
    )
  );
}

/**
 * Rows under the top-level category: one multi-select row per visible
 * directory level, then tags. A level with no children does not add a row.
 * Deeper rows appear only after at least one name is selected above them.
 * @param {{
 *   category?: GroupNode | null,
 *   selectedPath?: string[],
 *   selectedNested?: string[][],
 *   tags?: string[],
 *   selectedTags?: string[],
 * }} input
 * @returns {FilterRow[]}
 */
export function buildFilterRows(input) {
  /** @type {FilterRow[]} */
  const rows = [];
  const levels = input.selectedNested
    ? nestedLevels(input.selectedNested)
    : nestedLevels(input.selectedPath || []);
  /** @type {GroupNode[]} */
  let nodes = input.category ? [input.category] : [];

  for (let depth = 0; nodes.length > 0; depth++) {
    /** @type {GroupOption[]} */
    const options = [];
    /** @type {Map<string, GroupNode>} */
    const childByName = new Map();
    for (const node of nodes) {
      for (const [name, child] of Object.entries(childRecord(node))) {
        if (!name || name === '__NO_SUBCATEGORY__' || !child) continue;
        if (childByName.has(name)) continue;
        childByName.set(name, child);
        options.push({
          name,
          description: child.description || '',
        });
      }
    }
    if (options.length === 0) break;
    const selected = options
      .map((option) => option.name)
      .filter((name) => (levels[depth] || []).includes(name));
    rows.push({ kind: 'groups', depth, options, selected });
    if (selected.length === 0) break;
    nodes = selected.map((name) => childByName.get(name)).filter(Boolean);
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
 * @param {string[]} names
 * @returns {string[]}
 */
function dedupe(names) {
  /** @type {string[]} */
  const seen = [];
  for (const name of names) {
    if (name && !seen.includes(name)) seen.push(name);
  }
  return seen;
}

/**
 * @param {string[][]} selected
 * @param {number} depth
 * @param {string} name
 */
function pushLevel(selected, depth, name) {
  while (selected.length <= depth) selected.push([]);
  if (name && !selected[depth].includes(name)) selected[depth].push(name);
}

/**
 * Nested multi-select from a shared URL.
 * One `subcategory` plus `group` values is the historical single path.
 * Repeated `subcategory` values are the first nested level.
 * Deeper multi-select groups are encoded as `depth:name`.
 * @param {URLSearchParams} params
 * @returns {string[][]}
 */
export function nestedFromSearchParams(params) {
  const subcategories = params.getAll('subcategory').filter(Boolean);
  const groups = params.getAll('group').filter(Boolean);
  if (subcategories.length === 0) return [];
  const leveled =
    subcategories.length > 1 || groups.some((group) => /^\d+:/.test(group));
  if (!leveled) {
    return [[subcategories[0]], ...groups.map((name) => [name])];
  }
  /** @type {string[][]} */
  const selected = [dedupe(subcategories)];
  for (const group of groups) {
    const match = /^(\d+):([\s\S]+)$/.exec(group);
    if (!match) {
      pushLevel(selected, 1, group);
      continue;
    }
    const depth = Number(match[1]);
    if (!Number.isInteger(depth) || depth < 1 || !match[2]) continue;
    pushLevel(selected, depth, match[2]);
  }
  return selected;
}

/**
 * Restore the drill-down path from a shared URL.
 * `subcategory` is the first child (existing links). Further levels are `group`.
 * Multiple names at one level collapse to the first name for this legacy helper.
 * @param {URLSearchParams} params
 * @param {boolean} singleCategory
 * @returns {string[]}
 */
export function pathFromSearchParams(params, singleCategory) {
  if (!singleCategory) return [];
  return nestedFromSearchParams(params).map((names) => names[0]);
}

/**
 * @param {URLSearchParams} params
 * @param {string[] | string[][]} selectedNested
 */
export function appendNestedParams(params, selectedNested) {
  const trimmed = nestedLevels(selectedNested);
  while (trimmed.length > 0 && trimmed[trimmed.length - 1].length === 0) {
    trimmed.pop();
  }
  if (trimmed.length === 0 || trimmed[0].length === 0) return;
  const singleChain = trimmed.every((names) => names.length === 1);
  if (singleChain) {
    params.set('subcategory', trimmed[0][0]);
    for (const names of trimmed.slice(1)) params.append('group', names[0]);
    return;
  }
  for (const name of trimmed[0]) params.append('subcategory', name);
  for (let depth = 1; depth < trimmed.length; depth++) {
    for (const name of trimmed[depth]) {
      params.append('group', `${depth}:${name}`);
    }
  }
}

/**
 * @param {URLSearchParams} params
 * @param {string[]} selectedPath
 */
export function appendPathParams(params, selectedPath) {
  appendNestedParams(params, selectedPath);
}

/**
 * Walk `levels` and keep only names that exist under `node`.
 * @param {GroupNode} node
 * @param {string[][]} levels
 * @returns {string[][]}
 */
function matchedNested(node, levels) {
  /** @type {string[][]} */
  const matched = [];
  /** @type {GroupNode[]} */
  let current = [node];
  for (const names of levels) {
    /** @type {Map<string, GroupNode>} */
    const childByName = new Map();
    for (const currentNode of current) {
      for (const [name, child] of Object.entries(childRecord(currentNode))) {
        if (!name || name === '__NO_SUBCATEGORY__' || !child) continue;
        if (!childByName.has(name)) childByName.set(name, child);
      }
    }
    const valid = dedupe(names || []).filter((name) => childByName.has(name));
    if (valid.length === 0) break;
    matched.push(valid);
    current = valid.map((name) => childByName.get(name)).filter(Boolean);
  }
  return matched;
}

/**
 * One top-level category from a URL that may repeat `category` or still name
 * a transparent wrapper. The longest path that exists in the tree wins. A tie
 * keeps the earliest valid category.
 * @param {Record<string, GroupNode> | undefined | null} categories
 * @param {URLSearchParams} params
 * @returns {{ category: string, nested: string[][], tags: string[] }}
 */
export function resolveBrowseQuery(categories, params) {
  const browse = browseCategories(categories || {});
  const levels = nestedFromSearchParams(params);
  /** @type {{ category: string, nested: string[][], specificity: number, index: number }[]} */
  const candidates = [];
  params.getAll('category').forEach((cat, index) => {
    if (!cat) return;
    if (browse[cat]) {
      const nested = matchedNested(browse[cat], levels);
      candidates.push({
        category: cat,
        nested,
        specificity: nested.length,
        index,
      });
      return;
    }
    const wrapper = categories?.[cat];
    if (!wrapper || !isTransparentWrapper(wrapper)) return;
    const children = childRecord(wrapper);
    const childName = (levels[0] || []).find(
      (name) => children[name] && browse[name]
    );
    if (!childName) return;
    const nested = matchedNested(children[childName], levels.slice(1));
    candidates.push({
      category: childName,
      nested,
      specificity: 1 + nested.length,
      index,
    });
  });
  candidates.sort((a, b) => b.specificity - a.specificity || a.index - b.index);
  const best = candidates[0];
  return {
    category: best?.category || '',
    nested: best?.nested || [],
    tags: params.getAll('tag').filter(Boolean),
  };
}

/**
 * Toggle one nested name and drop deeper levels, which belonged to the
 * previous parent set.
 * @param {string[] | string[][] | undefined | null} selectedNested
 * @param {number} depth
 * @param {string} name
 * @returns {string[][]}
 */
export function toggleNested(selectedNested, depth, name) {
  const current = nestedLevels(selectedNested);
  if (!name || depth < 0) return current;
  const next = current.slice(0, depth).map((names) => names.slice());
  const atDepth = current[depth] || [];
  const updated = atDepth.includes(name)
    ? atDepth.filter((item) => item !== name)
    : [...atDepth, name];
  if (updated.length > 0) next[depth] = updated;
  return next;
}

/**
 * Clear one nested level and everything under it. Depth 0 clears the path.
 * @param {string[] | string[][] | undefined | null} selectedNested
 * @param {number} depth
 * @returns {string[][]}
 */
export function clearNested(selectedNested, depth) {
  if (depth <= 0) return [];
  return nestedLevels(selectedNested)
    .slice(0, depth)
    .map((names) => names.slice());
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
