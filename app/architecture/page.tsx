'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ArchitectureDiagram, {
  type ArchitectureData,
} from '@/components/ArchitectureDiagram';
import Header from '@/components/Header';
import { config } from '@/lib/config';

interface CategoryOverview {
  name: string;
  description: string;
  count: number;
}

// Cover page: presents the full ecosystem architecture with a hero diagram
// and a clickable category overview. Every element links back to the
// taxonomy (home page) filtered to that category.
export default function ArchitecturePage() {
  const [architecture, setArchitecture] = useState<ArchitectureData | null>(
    null
  );
  const [overview, setOverview] = useState<CategoryOverview[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [archRes, categoriesRes] = await Promise.all([
          fetch(config.runtime.getDataPath('architecture.json')),
          fetch(config.runtime.getDataPath('categories.json')),
        ]);
        if (!archRes.ok || !categoriesRes.ok) {
          setError('Architecture data is not available for this project.');
          return;
        }
        const archData = (await archRes.json()) as ArchitectureData;
        const categoriesData = (await categoriesRes.json()) as Record<
          string,
          {
            name: string;
            description: string;
            subcategories: Record<string, { tools: any[] }>;
            tools?: any[];
          }
        >;
        setArchitecture(archData);
        setOverview(
          Object.values(categoriesData).map((cat) => {
            const subTools = Object.values(cat.subcategories).reduce(
              (sum, sub) => sum + (sub.tools?.length || 0),
              0
            );
            return {
              name: cat.name,
              description: cat.description,
              count: subTools + (cat.tools?.length || 0),
            };
          })
        );
      } catch (e) {
        console.error('Failed to load architecture:', e);
        setError('Failed to load architecture data.');
      }
    }
    void load();
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 transition-colors duration-200 dark:bg-gray-900">
      <Header
        title="Architecture"
        description="The vibe coding ecosystem at a glance — click any element to explore its tools."
      />

      <main className="container mx-auto flex-1 px-4 py-10">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="dark:text-primary-400 dark:hover:text-primary-300 inline-flex items-center gap-1 text-sm font-medium text-primary-600 transition-colors duration-200 hover:text-primary-700"
          >
            <span aria-hidden>←</span> Back to tools
          </Link>
        </div>

        {error ? (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            {error}
          </div>
        ) : architecture ? (
          <>
            <ArchitectureDiagram
              data={architecture}
              categories={overview}
              variant="hero"
            />

            <h2 className="mt-12 mb-5 text-center text-xl font-semibold text-gray-900 transition-colors duration-200 dark:text-white">
              Explore Categories
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {overview.map((cat) => (
                <Link
                  key={cat.name}
                  href={`/?category=${encodeURIComponent(cat.name)}`}
                  className="hover:border-primary-300 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-primary-500"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900 transition-colors duration-200 dark:text-white">
                      {cat.name}
                    </span>
                    <span className="dark:bg-primary-900/40 dark:text-primary-300 rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700">
                      {cat.count}
                    </span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-sm text-gray-600 transition-colors duration-200 dark:text-gray-400">
                    {cat.description}
                  </p>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="flex justify-center py-20">
            <div className="dark:border-primary-400 size-10 animate-spin rounded-full border-b-2 border-primary-600"></div>
          </div>
        )}
      </main>
    </div>
  );
}
