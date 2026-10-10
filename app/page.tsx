'use client';

import { useState, useEffect, useMemo } from 'react';
import ToolCard from '@/components/ToolCard';
import SearchBar from '@/components/SearchBar';
import TopNavPanel from '@/components/TopNavPanel';
import Header from '@/components/Header';
import { config } from '@/lib/config';
import { initializeColorManager } from '@/lib/colorManager';
import { githubConfig } from '@/lib/githubConfig';

const lastUpdated = new Date(githubConfig.buildTime).toISOString().slice(0, 10);

interface Tool {
  name: string;
  url: string;
  description: string;
  category: string;
  subcategory: string;
  tags?: string[];
}

interface CategoryData {
  name: string;
  description: string;
  subcategories: Record<
    string,
    {
      name: string;
      description: string;
      tools: any[];
    }
  >;
  tools?: any[];
}

interface ProjectInfo {
  title: string;
  description: string;
  itemCount: number;
  categoryCount: number;
}

export default function Home() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [categories, setCategories] = useState<Record<string, CategoryData>>(
    {}
  );
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>({
    title: '',
    description: '',
    itemCount: 0,
    categoryCount: 0,
  });
  const [filteredTools, setFilteredTools] = useState<Tool[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Subcategory filtering only makes sense with exactly one category selected.
  const singleCategory =
    selectedCategories.length === 1 ? selectedCategories[0] : '';

  const allTags = useMemo(
    () => Array.from(new Set(tools.flatMap((tool) => tool.tags ?? []))).sort(),
    [tools]
  );

  useEffect(() => {
    // 加载数据 - 使用统一配置
    const loadData = async () => {
      try {
        // 使用统一的路径配置
        const toolsPath = config.runtime.getDataPath('tools.json');
        const categoriesPath = config.runtime.getDataPath('categories.json');
        const projectPath = config.runtime.getDataPath('project.json');

        console.log('Loading data from paths:', {
          toolsPath,
          categoriesPath,
          projectPath,
        });

        const [toolsResponse, categoriesResponse, projectResponse] =
          await Promise.all([
            fetch(toolsPath),
            fetch(categoriesPath),
            fetch(projectPath),
          ]);

        if (!toolsResponse.ok || !categoriesResponse.ok) {
          throw new Error(
            `Failed to load data files: ${toolsResponse.status} ${categoriesResponse.status}`
          );
        }

        const toolsData = await toolsResponse.json();
        const categoriesData = await categoriesResponse.json();
        const projectData = await projectResponse.json();

        console.log('Loaded tools:', toolsData.length);
        console.log('Loaded categories:', Object.keys(categoriesData).length);
        console.log('Project info:', projectData);

        // 初始化颜色管理器
        initializeColorManager(toolsData);

        setTools(toolsData);
        setCategories(categoriesData);
        setProjectInfo(projectData);
        setFilteredTools(toolsData);

        // Restore filters from the URL (?category=a&category=b&subcategory=x&tag=t).
        // The architecture page links here with a single ?category=xxx.
        const params = new URLSearchParams(window.location.search);
        const categoryParams = params
          .getAll('category')
          .filter((c) => c in categoriesData);
        setSelectedCategories(categoryParams);
        if (categoryParams.length === 1) {
          setSelectedSubcategory(params.get('subcategory') ?? '');
        }
        setSelectedTags(params.getAll('tag'));
      } catch (error) {
        console.error('Error loading data:', error);
        // 显示错误信息给用户
        setTools([]);
        setCategories({});
        setProjectInfo({
          title: 'Parse Error',
          description:
            'Failed to load project data. Please check README.md format.',
          itemCount: 0,
          categoryCount: 0,
        });
        setFilteredTools([]);
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  useEffect(() => {
    // 过滤工具
    let filtered = tools;

    // 按搜索词过滤
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (tool) =>
          tool.name.toLowerCase().includes(term) ||
          tool.description.toLowerCase().includes(term) ||
          tool.category.toLowerCase().includes(term) ||
          tool.subcategory.toLowerCase().includes(term) ||
          (tool.tags ?? []).some((tag) => tag.toLowerCase().includes(term))
      );
    }

    // Categories: OR within the selection
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((tool) =>
        selectedCategories.includes(tool.category)
      );
    }

    // Subcategory (only with a single category selected)
    if (singleCategory && selectedSubcategory) {
      filtered = filtered.filter(
        (tool) => tool.subcategory === selectedSubcategory
      );
    }

    // Tags: OR within the selection, AND with the category filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter((tool) =>
        (tool.tags ?? []).some((tag) => selectedTags.includes(tag))
      );
    }

    setFilteredTools(filtered);
  }, [
    tools,
    searchTerm,
    selectedCategories,
    singleCategory,
    selectedSubcategory,
    selectedTags,
  ]);

  // Keep the URL in sync so filtered views can be shared / reloaded.
  useEffect(() => {
    if (loading) return;
    const params = new URLSearchParams();
    selectedCategories.forEach((c) => params.append('category', c));
    if (singleCategory && selectedSubcategory) {
      params.set('subcategory', selectedSubcategory);
    }
    selectedTags.forEach((t) => params.append('tag', t));
    const query = params.toString();
    const url = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
    window.history.replaceState(null, '', url);
  }, [
    loading,
    selectedCategories,
    singleCategory,
    selectedSubcategory,
    selectedTags,
  ]);

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories((prev) => toggle(prev, category));
    setSelectedSubcategory('');
  };

  // Clicking a category badge on a card focuses that single category.
  const handleCategoryFocus = (category: string) => {
    setSelectedCategories([category]);
    setSelectedSubcategory('');
  };

  const handleTopNavSubcategorySelect = (subcategory: string) => {
    setSelectedSubcategory(subcategory);
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) => toggle(prev, tag));
  };

  const handleClearTopNavSelection = () => {
    setSelectedCategories([]);
    setSelectedSubcategory('');
    setSelectedTags([]);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 transition-colors duration-200 dark:bg-gray-900">
        <div className="text-center">
          <div className="dark:border-primary-400 mx-auto size-12 animate-spin rounded-full border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600 transition-colors duration-200 dark:text-gray-300">
            Loading project data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 transition-colors duration-200 dark:bg-gray-900">
      <Header title={projectInfo.title} description={projectInfo.description} />

      <TopNavPanel
        categories={categories}
        selectedCategories={selectedCategories}
        selectedSubcategory={selectedSubcategory}
        tags={allTags}
        selectedTags={selectedTags}
        onCategoryToggle={handleCategoryToggle}
        onSubcategorySelect={handleTopNavSubcategorySelect}
        onTagToggle={handleTagToggle}
        onClearSelection={handleClearTopNavSelection}
      />

      <main className="container mx-auto flex-1 px-4 py-8">
        {/* 搜索区域 */}
        <div className="mb-8">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search tools, descriptions, or tags..."
          />

          {(searchTerm ||
            selectedCategories.length > 0 ||
            selectedTags.length > 0) && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing {filteredTools.length} of {tools.length} items
                {searchTerm && ` for "${searchTerm}"`}
                {selectedCategories.length > 0 &&
                  ` in ${selectedCategories.join(', ')}`}
                {singleCategory &&
                  selectedSubcategory &&
                  ` > ${selectedSubcategory}`}
                {selectedTags.length > 0 &&
                  ` tagged ${selectedTags.join(', ')}`}
              </p>
            </div>
          )}
        </div>

        {/* 工具卡片网格 */}
        {filteredTools.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredTools.map((tool, index) => (
              <ToolCard
                key={`${tool.name}-${index}`}
                tool={tool}
                onCategoryChange={handleCategoryFocus}
                onSubcategoryChange={handleTopNavSubcategorySelect}
              />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className="mb-4 text-6xl text-gray-400 transition-colors duration-200 dark:text-gray-500">
              🔍
            </div>
            <h3 className="mb-2 text-xl font-semibold text-gray-700 transition-colors duration-200 dark:text-gray-200">
              No items found
            </h3>
            <p className="text-gray-500 transition-colors duration-200 dark:text-gray-400">
              Try adjusting your search terms or filters
            </p>
          </div>
        )}
      </main>

      {/* 页脚 */}
      <footer className="container mx-auto px-4 py-8 text-center">
        <p className="text-sm text-gray-600 transition-colors duration-200 dark:text-gray-400">
          Powered by{' '}
          <a
            href="https://github.com/0xWelt/yaal"
            target="_blank"
            rel="noopener noreferrer"
            className="dark:text-primary-400 dark:hover:text-primary-300 font-medium text-primary-600 underline transition-colors duration-200 hover:text-primary-700"
          >
            0xWelt/yaal
          </a>
          {' · '}
          <a
            href={githubConfig.submitUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="dark:text-primary-400 dark:hover:text-primary-300 font-medium text-primary-600 underline transition-colors duration-200 hover:text-primary-700"
          >
            Submit a tool
          </a>
          {' · '}
          <time dateTime={githubConfig.buildTime}>
            Last updated {lastUpdated}
          </time>
        </p>
      </footer>
    </div>
  );
}
