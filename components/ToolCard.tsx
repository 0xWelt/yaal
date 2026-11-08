import React, { useState } from 'react';
import GitHubCorner from './GitHubCorner';
import EntryIcon from './EntryIcon';
import { colorManager } from '@/lib/colorManager';
import { toolGroups } from '@/lib/groupFilters';

interface Tool {
  name: string;
  url: string;
  description: string;
  category: string;
  subcategory: string;
  groups?: string[];
  image?: string;
  icon?: string;
}

interface ToolCardProps {
  tool: Tool;
  groups?: string[];
  onSelectGroup?: (_category: string, _path: string[]) => void;
}

export default function ToolCard({
  tool,
  groups,
  onSelectGroup,
}: ToolCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const [loadedImage, setLoadedImage] = useState<string | null>(null);
  const showImage = Boolean(tool.image) && failedImage !== tool.image;

  const getSubcategoryColor = (category: string, subcategory: string) => {
    if (subcategory === '__NO_SUBCATEGORY__') {
      return '';
    }

    // 使用全局颜色管理器获取颜色
    return colorManager.getSubcategoryColor(category, subcategory);
  };

  const visibleGroups = groups && groups.length > 0 ? groups : toolGroups(tool);

  const getDomainFromUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return domain;
    } catch {
      return 'Unknown';
    }
  };

  const toggleExpanded = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      className={`card relative flex h-full flex-col ${showImage ? 'overflow-hidden' : ''}`}
    >
      {/* GitHub Corner */}
      <GitHubCorner url={tool.url} />

      {showImage && (
        <img
          src={tool.image}
          alt=""
          loading="lazy"
          onLoad={() => setLoadedImage(tool.image ?? null)}
          onError={() => setFailedImage(tool.image ?? null)}
          className={`aspect-video w-full object-cover ${
            loadedImage === tool.image ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      <div className="flex-1 p-6">
        {/* 标题和链接 */}
        <div className="mb-4">
          <a
            href={tool.url}
            target="_blank"
            rel="noopener noreferrer"
            className="dark:hover:text-primary-400 flex items-start gap-2 text-xl font-bold text-gray-900 transition-colors duration-200 hover:text-primary-600 dark:text-white"
          >
            <EntryIcon name={tool.name} url={tool.url} icon={tool.icon} />
            <span className="line-clamp-2 min-w-0">{tool.name}</span>
          </a>
          <div className="mt-1 text-sm text-gray-500 transition-colors duration-200 dark:text-gray-400">
            {getDomainFromUrl(tool.url)}
          </div>
        </div>

        {/* 描述 */}
        <div className="mb-4">
          <div onClick={toggleExpanded} className="cursor-pointer">
            <div
              className={`text-sm leading-relaxed text-gray-600 transition-all duration-300 dark:text-gray-300 ${
                isExpanded ? 'max-h-none' : 'line-clamp-2'
              }`}
            >
              {tool.description}
              {!isExpanded && tool.description.length > 80 && (
                <span className="dark:text-primary-400 ml-1 font-medium text-primary-600">
                  ...
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 分类标签 */}
        <div className="flex flex-wrap gap-1.5">
          {visibleGroups.map((group, index) =>
            index === 0 ? (
              <button
                key={`${group}-${index}`}
                onClick={() => onSelectGroup?.(visibleGroups[0], [])}
                className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 transition-all duration-200 hover:scale-105 hover:shadow-sm dark:border-blue-400/30 dark:bg-blue-400/20 dark:text-blue-100"
              >
                {group}
              </button>
            ) : (
              <button
                key={`${group}-${index}`}
                onClick={() =>
                  onSelectGroup?.(
                    visibleGroups[0],
                    visibleGroups.slice(1, index + 1)
                  )
                }
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold transition-all duration-200 hover:scale-105 hover:shadow-sm ${getSubcategoryColor(tool.category, group)}`}
              >
                {group}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
