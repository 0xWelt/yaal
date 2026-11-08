import { buildFilterRows } from '@/lib/groupFilters';

interface GroupNode {
  name: string;
  description?: string;
  children?: Record<string, GroupNode>;
  subcategories?: Record<string, GroupNode>;
  tools?: unknown[];
}

interface TopNavPanelProps {
  categories: Record<string, GroupNode>;
  selectedCategories: string[];
  selectedNested: string[][];
  tags: string[];
  selectedTags: string[];
  onCategoryToggle: (_category: string) => void;
  onNestedToggle: (_depth: number, _name: string) => void;
  onNestedClear: (_depth: number) => void;
  onTagToggle: (_tag: string) => void;
  onClearSelection: () => void;
}

function ChipTooltip({
  text,
  widthClass,
}: {
  text?: string;
  widthClass: string;
}) {
  if (!text) return null;
  return (
    <div className="pointer-events-none absolute top-full left-1/2 z-[100] mt-2 hidden w-max max-w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 group-hover:block">
      <div
        className={`${widthClass} max-w-[min(20rem,calc(100vw-2rem))] rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-center text-sm leading-relaxed whitespace-normal text-white shadow-xl`}
      >
        {text}
        <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-t border-l border-gray-700 bg-gray-900"></div>
      </div>
    </div>
  );
}

export default function TopNavPanel({
  categories,
  selectedCategories,
  selectedNested,
  tags,
  selectedTags,
  onCategoryToggle,
  onNestedToggle,
  onNestedClear,
  onTagToggle,
  onClearSelection,
}: TopNavPanelProps) {
  const categoryKeys = Object.keys(categories);
  // The first row is single-select. A repeated category in state still shows
  // only the first name that exists in this row.
  const selectedCategory =
    selectedCategories.find((category) => categories[category]) || '';
  const hasSelection =
    Boolean(selectedCategory) ||
    selectedNested.some((names) => names.length > 0) ||
    selectedTags.length > 0;
  const rows = buildFilterRows({
    category: selectedCategory ? categories[selectedCategory] : null,
    selectedNested: selectedCategory ? selectedNested : [],
    tags,
    selectedTags,
  });

  return (
    <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm transition-colors duration-200 dark:bg-gray-900/95">
      <div className="container mx-auto px-4 py-3">
        {/* First row is one category. Nested rows below it are multi-select. */}
        <div className="flex items-start gap-4">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <button
              onClick={onClearSelection}
              className={`rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  : 'bg-primary-600 text-white shadow-sm'
              }`}
            >
              All
            </button>

            {categoryKeys.map((category) => (
              <div key={category} className="group relative hover:z-20">
                <button
                  onClick={() => onCategoryToggle(category)}
                  aria-pressed={category === selectedCategory}
                  className={`rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all ${
                    category === selectedCategory
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {category}
                </button>
                <ChipTooltip
                  text={categories[category]?.description}
                  widthClass="w-80"
                />
              </div>
            ))}
          </div>

          {hasSelection && (
            <button
              onClick={onClearSelection}
              className="dark:text-primary-400 dark:hover:text-primary-300 shrink-0 self-start pt-2 text-sm text-primary-600 hover:text-primary-700"
            >
              Clear All
            </button>
          )}
        </div>

        {rows.map((row) =>
          row.kind === 'groups' ? (
            <div
              key={`groups-${row.depth}`}
              className="mt-2 flex flex-wrap items-center gap-2 pt-2"
            >
              <button
                onClick={() => onNestedClear(row.depth)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                  row.selected.length === 0
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                All
              </button>
              {row.options.map((option) => (
                <div key={option.name} className="group relative hover:z-20">
                  <button
                    onClick={() => onNestedToggle(row.depth, option.name)}
                    aria-pressed={row.selected.includes(option.name)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                      row.selected.includes(option.name)
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {option.name}
                  </button>
                  <ChipTooltip text={option.description} widthClass="w-72" />
                </div>
              ))}
            </div>
          ) : (
            <div
              key="tags"
              className="mt-2 flex flex-wrap items-center gap-2 pt-2"
            >
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Tags
              </span>
              {row.tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => onTagToggle(tag)}
                  aria-pressed={row.selected.includes(tag)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                    row.selected.includes(tag)
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
