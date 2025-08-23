import { githubConfig } from './githubConfig';

// Unified environment detection and path configuration
const isGitHubPages = process.env.NODE_ENV === 'production';

export const config = {
  // Environment detection
  environment: {
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
    isGitHubPages,
  },

  // Base paths
  basePath: isGitHubPages ? `/${githubConfig.repo}` : '',

  // Data paths (build-time)
  dataPath: {
    tools: `${isGitHubPages ? `/${githubConfig.repo}` : ''}/data/tools.json`,
    categories: `${isGitHubPages ? `/${githubConfig.repo}` : ''}/data/categories.json`,
  },

  // Helper function to get full path (build-time)
  getFullPath: (path: string) =>
    `${isGitHubPages ? `/${githubConfig.repo}` : ''}${path}`,

  // Runtime path utilities for client-side
  runtime: {
    // Get base path for client-side routing
    getBasePath: () => {
      if (typeof window !== 'undefined') {
        const repoName = githubConfig.repo;
        return window.location.pathname.startsWith(`/${repoName}`)
          ? `/${repoName}`
          : '';
      }
      return '';
    },

    // Get data path for client-side fetch
    getDataPath: (filename: string) => {
      const base = config.runtime.getBasePath();
      return `${base}/data/${filename}`;
    },

    // Get full path for any resource
    getResourcePath: (path: string) => {
      const base = config.runtime.getBasePath();
      return `${base}${path}`;
    },
  },
};
