'use client';

import Link from 'next/link';

interface ArchNode {
  id: string;
  name: string;
}

interface ArchGroup {
  id: string;
  title: string;
  items: string[];
}

interface ArchEdge {
  from: string;
  to: string;
  label: string;
}

export interface ArchitectureData {
  title: string;
  groups: ArchGroup[];
  nodes: ArchNode[];
  edges: ArchEdge[];
}

interface ArchitectureDiagramProps {
  data: ArchitectureData;
  categories?: { name: string }[];
  variant?: 'compact' | 'hero';
}

function matchCategory(label: string, categories?: { name: string }[]) {
  if (!categories) return null;
  return categories.find((c) => label.includes(c.name))?.name || null;
}

export default function ArchitectureDiagram({
  data,
  categories,
  variant = 'compact',
}: ArchitectureDiagramProps) {
  const groupById = new Map(data.groups.map((g) => [g.id, g]));
  const nodeById = new Map(data.nodes.map((n) => [n.id, n]));
  const incoming = (id: string) => data.edges.filter((e) => e.to === id);
  const outgoing = (id: string) => data.edges.filter((e) => e.from === id);
  const resolveLabel = (id: string) =>
    groupById.get(id)?.title || nodeById.get(id)?.name || id;

  const main =
    data.groups.reduce(
      (best, g) =>
        outgoing(g.id).length > outgoing(best.id).length ? g : best,
      data.groups[0]
    ) || null;

  if (!main) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
        Architecture data unavailable.
      </div>
    );
  }

  const up = incoming(main.id).map((e) => e.from);
  const down = outgoing(main.id).map((e) => ({ id: e.to, label: e.label }));
  const side = data.edges.filter(
    (e) =>
      e.from !== main.id &&
      e.to !== main.id &&
      !up.includes(e.from) &&
      !up.includes(e.to)
  );
  const hero = variant === 'hero';

  const groupCardCls = hero
    ? 'w-full max-w-3xl rounded-2xl border border-indigo-300 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-8 shadow-md transition-colors duration-200 dark:border-indigo-500/50 dark:from-indigo-950/50 dark:via-gray-900 dark:to-violet-950/40'
    : 'w-full max-w-2xl rounded-2xl border border-indigo-300 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-5 shadow-md transition-colors duration-200 dark:border-indigo-500/50 dark:from-indigo-950/50 dark:via-gray-900 dark:to-violet-950/40';
  const boxCls = hero
    ? 'rounded-xl border px-8 py-4 font-medium shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md'
    : 'rounded-xl border px-5 py-3 font-medium shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md';

  const renderLabel = (id: string, color: 'indigo' | 'violet') => {
    const label = resolveLabel(id);
    const cat = matchCategory(label, categories);
    const cls =
      boxCls +
      (color === 'indigo'
        ? ' border-indigo-200 bg-gradient-to-br from-indigo-50 to-white text-indigo-900 dark:border-indigo-500/40 dark:from-indigo-950/60 dark:to-gray-900 dark:text-indigo-100'
        : ' border-violet-200 bg-gradient-to-br from-violet-50 to-white text-violet-900 dark:border-violet-500/40 dark:from-violet-950/50 dark:to-gray-900 dark:text-violet-100');
    const el = <div className={cls}>{label}</div>;
    return cat ? (
      <Link href={`/?category=${encodeURIComponent(cat)}`}>{el}</Link>
    ) : (
      el
    );
  };

  return (
    <div
      className={
        hero
          ? 'rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-8 shadow-sm transition-colors duration-200 sm:p-12 dark:border-gray-700 dark:from-gray-800 dark:to-gray-900'
          : 'rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-6 shadow-sm transition-colors duration-200 dark:border-gray-700 dark:from-gray-800 dark:to-gray-900'
      }
    >
      <h2
        className={
          hero
            ? 'mb-8 text-center text-2xl font-semibold text-gray-900 transition-colors duration-200 dark:text-white'
            : 'mb-6 text-center text-lg font-semibold text-gray-900 transition-colors duration-200 dark:text-white'
        }
      >
        {data.title}
      </h2>

      <div className="flex flex-col items-center gap-4">
        <div className="flex flex-wrap justify-center gap-3">
          {up.map((id) => (
            <span key={id}>{renderLabel(id, 'indigo')}</span>
          ))}
        </div>

        <Arrow />

        <div className={groupCardCls}>
          <div
            className={
              hero
                ? 'mb-4 text-center text-xl font-semibold text-indigo-900 transition-colors duration-200 dark:text-indigo-100'
                : 'mb-4 text-center text-base font-semibold text-indigo-900 transition-colors duration-200 dark:text-indigo-100'
            }
          >
            {main.title}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {main.items.map((item) => {
              const cat = matchCategory(item, categories);
              const chip = (
                <span className="rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-medium text-indigo-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 dark:border-indigo-500/40 dark:bg-gray-800 dark:text-indigo-200">
                  {item}
                </span>
              );
              return (
                <span key={item}>
                  {cat ? (
                    <Link href={`/?category=${encodeURIComponent(cat)}`}>
                      {chip}
                    </Link>
                  ) : (
                    chip
                  )}
                </span>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {down.map((d) => (
            <div
              key={d.id}
              className="flex flex-col items-center gap-1 text-xs text-gray-500 transition-colors duration-200 dark:text-gray-400"
            >
              <span className="rounded-full bg-gray-100 px-2 py-0.5 dark:bg-gray-800">
                {d.label || '->'}
              </span>
              <Arrow down />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {down.map((d) => (
            <span key={d.id}>{renderLabel(d.id, 'violet')}</span>
          ))}
        </div>

        {side.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-center text-xs text-gray-500 transition-colors duration-200 dark:text-gray-400">
            {side.map((e) => {
              const fromCat = matchCategory(resolveLabel(e.from), categories);
              const toCat = matchCategory(resolveLabel(e.to), categories);
              const fromEl = fromCat ? (
                <Link href={`/?category=${encodeURIComponent(fromCat)}`}>
                  {resolveLabel(e.from)}
                </Link>
              ) : (
                <span>{resolveLabel(e.from)}</span>
              );
              const toEl = toCat ? (
                <Link href={`/?category=${encodeURIComponent(toCat)}`}>
                  {resolveLabel(e.to)}
                </Link>
              ) : (
                <span>{resolveLabel(e.to)}</span>
              );
              return (
                <span key={e.from + e.to} className="flex items-center gap-1">
                  {fromEl}
                  <span className="text-gray-400 dark:text-gray-500">
                    {e.label ? '-- ' + e.label + ' ->' : '->'}
                  </span>
                  {toEl}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Arrow({ down = true }: { down?: boolean }) {
  return (
    <div
      className={
        down
          ? 'flex flex-col items-center justify-center text-indigo-400 transition-colors duration-200 dark:text-indigo-500'
          : 'flex items-center justify-center text-indigo-400 transition-colors duration-200 dark:text-indigo-500'
      }
      aria-hidden
    >
      <div className="h-4 w-px bg-current" />
      <svg className="size-3" viewBox="0 0 12 12" fill="currentColor">
        <path d="M6 12L0 6h4V0h4v6h4L6 12z" />
      </svg>
    </div>
  );
}
