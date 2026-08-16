'use client';

import { useState, useEffect } from 'react';
import ToolCard from '@/components/ToolCard';
import SearchBar from '@/components/SearchBar';
import TopNavPanel from '@/components/TopNavPanel';
import Header from '@/components/Header';
import ArchitectureDiagram from '@/components/ArchitectureDiagram';
import { config } from '@/lib/config';
import { initializeColorManager } from '@/lib/colorManager';

interface Tool {
  name: string;
  url: string;
  description: string;
  category: string;
  subcategory: string;
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

interface Architecture {
  mermaid: string;
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
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [architecture, setArchitecture] = useState<Architecture | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 加载数据 - 使用统一配置
    const loadData = async () => {
      try {
        // 使用统一的路径配置
        const toolsPath = config.runtime.getDataPath('tools.json');
        const categoriesPath = config.runtime.getDataPath('categories.json');
        const projectPath = config.runtime.getDataPath('project.json');
        const architecturePath =
          config.runtime.getDataPath('architecture.json');

        console.log('Loading data from paths:', {
          toolsPath,
          categoriesPath,
          projectPath,
          architecturePath,
        });

        const [
          toolsResponse,
          categoriesResponse,
          projectResponse,
          archResponse,
        ] = await Promise.all([
          fetch(toolsPath),
          fetch(categoriesPath),
          fetch(projectPath),
          fetch(architecturePath),
        ]);

        if (!toolsResponse.ok || !categoriesResponse.ok) {
          throw new Error(
            `Failed to load data files: ${toolsResponse.status} ${categoriesResponse.status}`
          );
        }

        const toolsData = await toolsResponse.json();
        const categoriesData = await categoriesResponse.json();
        const projectData = await projectResponse.json();
        // architecture.json is optional (only present when the README has an
        // Architecture section); a 404 just means no diagram to show.
        const architectureData = archResponse.ok
          ? ((await archResponse.json()) as Architecture)
          : null;

        console.log('Loaded tools:', toolsData.length);
        console.log('Loaded categories:', Object.keys(categoriesData).length);
        console.log('Project info:', projectData);

        // 初始化颜色管理器
        initializeColorManager(toolsData);

        setTools(toolsData);
        setCategories(categoriesData);
        setProjectInfo(projectData);
        setArchitecture(architectureData);
        setFilteredTools(toolsData);
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
      filtered = filtered.filter(
        (tool) =>
          tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tool.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tool.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tool.subcategory.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 按分类过滤
    if (selectedCategory) {
      filtered = filtered.filter((tool) => tool.category === selectedCategory);
    }

    // 按子分类过滤
    if (selectedSubcategory) {
      filtered = filtered.filter(
        (tool) => tool.subcategory === selectedSubcategory
      );
    } else if (selectedCategory) {
      // 如果选择了分类但没有选择子分类，包含该分类下所有工具
      filtered = filtered.filter((tool) => tool.category === selectedCategory);
    }

    setFilteredTools(filtered);
  }, [tools, searchTerm, selectedCategory, selectedSubcategory]);

  const handleTopNavCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setSelectedSubcategory('');
  };

  const handleTopNavSubcategorySelect = (subcategory: string) => {
    setSelectedSubcategory(subcategory);
  };

  const handleClearTopNavSelection = () => {
    setSelectedCategory('');
    setSelectedSubcategory('');
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
        selectedCategory={selectedCategory}
        selectedSubcategory={selectedSubcategory}
        onCategorySelect={handleTopNavCategorySelect}
        onSubcategorySelect={handleTopNavSubcategorySelect}
        onClearSelection={handleClearTopNavSelection}
      />

      <main className="container mx-auto flex-1 px-4 py-8">
        {/* 架构区域：README 架构图 + 分类总览 */}
        {architecture && Object.keys(categories).length > 0 && (
          <section className="mb-10">
            <ArchitectureDiagram mermaid={architecture.mermaid} />

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.values(categories).map((cat) => {
                const subTools = Object.values(cat.subcategories).reduce(
                  (sum, sub) => sum + (sub.tools?.length || 0),
                  0
                );
                const count = subTools + (cat.tools?.length || 0);
                return (
                  <button
                    key={cat.name}
                    onClick={() => handleTopNavCategorySelect(cat.name)}
                    className="hover:border-primary-300 rounded-lg border border-gray-200 bg-white p-4 text-left shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-primary-500"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900 transition-colors duration-200 dark:text-white">
                        {cat.name}
                      </span>
                      <span className="dark:bg-primary-900/40 dark:text-primary-300 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
                        {count}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600 transition-colors duration-200 dark:text-gray-400">
                      {cat.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* 搜索区域 */}
        <div className="mb-8">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search tools, descriptions, or tags..."
          />

          {(searchTerm || selectedCategory || selectedSubcategory) && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing {filteredTools.length} of {tools.length} items
                {searchTerm && ` for "${searchTerm}"`}
                {selectedCategory && ` in ${selectedCategory}`}
                {selectedSubcategory && ` > ${selectedSubcategory}`}
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
                onCategoryChange={handleTopNavCategorySelect}
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
        </p>
      </footer>
    </div>
  );
}
