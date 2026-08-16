'use client';

import { useState, useEffect } from 'react';
import ToolCard from '@/components/ToolCard';
import SearchBar from '@/components/SearchBar';
import TopNavPanel from '@/components/TopNavPanel';
import Header from '@/components/Header';
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
  const [loading, setLoading] = useState(true);

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

        // 从架构页跳转过来时（?category=xxx），自动选中对应分类
        const params = new URLSearchParams(window.location.search);
        const categoryParam = params.get('category');
        if (categoryParam) {
          setSelectedCategory(categoryParam);
        }
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
