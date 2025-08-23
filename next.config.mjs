import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

/** @type {import('next').NextConfig} */

// 读取配置文件获取仓库名
function getRepositoryName() {
  // 自动查找配置文件：先检查父目录，再检查本地目录
  let configPath = null;

  const parentConfigPath = path.resolve(process.cwd(), '../yaal.config.yaml');
  const localConfigPath = path.resolve(process.cwd(), 'yaal.config.yaml');

  if (fs.existsSync(parentConfigPath)) {
    configPath = parentConfigPath;
  } else if (fs.existsSync(localConfigPath)) {
    configPath = localConfigPath;
  } else {
    throw new Error(
      'yaal.config.yaml not found in parent or local directory. Please create this file with your GitHub repository URL.'
    );
  }

  const configContent = fs.readFileSync(configPath, 'utf8');
  const config = yaml.load(configContent) || {};

  if (!config.github) {
    throw new Error(
      'GitHub URL not found in yaal.config.yaml. Please add "github: https://github.com/owner/repo"'
    );
  }

  const url = config.github;
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);

  if (!match) {
    throw new Error(
      `Invalid GitHub URL format: ${url}. Expected: https://github.com/owner/repo`
    );
  }

  return `/${match[2].replace(/\.git$/, '')}`;
}

const isGitHubPages = process.env.NODE_ENV === 'production';
const repositoryName = getRepositoryName();

const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // 对于GitHub Pages，使用仓库名作为basePath
  basePath: isGitHubPages ? repositoryName : '',
  assetPrefix: isGitHubPages ? repositoryName : '',
  // 确保静态导出正确工作
  distDir: 'out',
};

export default nextConfig;
