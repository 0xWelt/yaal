import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 解析README.md并提取软件信息
function parseReadme(readmePath) {
  const readmeContent = fs.readFileSync(readmePath, 'utf-8');

  const lines = readmeContent.split('\n');
  const tools = [];
  const categoryDescriptions = {};
  const subcategoryDescriptions = {};

  let currentCategory = '';
  let currentSubcategory = '';

  // 提取标题和描述
  const titleMatch = readmeContent.match(/^#\s+(.+)$/m);
  if (!titleMatch) {
    console.error('❌ ERROR: README.md must start with # Title');
    console.error('   Example: # My Awesome List');
    process.exit(1);
  }
  const title = titleMatch[1].trim();

  let description = '';
  const readmeLines = readmeContent.split(/\r?\n/);

  // 找标题后的第一个非空非标题行
  let foundTitle = false;
  for (let i = 0; i < readmeLines.length; i++) {
    const line = readmeLines[i].trim();
    if (!foundTitle && line.startsWith('# ')) {
      foundTitle = true;
      continue;
    }
    if (foundTitle && line && !line.startsWith('#') && !line.startsWith('[')) {
      description = line.replace(/^>/, '').trim();
      break;
    }
  }

  if (!description) {
    console.error(
      '❌ ERROR: README.md must have a description after the title'
    );
    console.error('   Example: # My Awesome List');
    console.error('   ');
    console.error('   A curated list of awesome resources');
    process.exit(1);
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 检测主分类 (## 开头)
    if (
      line.startsWith('## ') &&
      !line.includes('Table of Contents') &&
      !line.includes('Star History') &&
      !line.includes('Contributors') &&
      !line.includes('License')
    ) {
      currentCategory = line.replace('## ', '').trim();
      currentSubcategory = '';

      // 查找主分类的注释信息
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === '') {
        j++;
      }
      if (j < lines.length && lines[j].trim().startsWith('>')) {
        categoryDescriptions[currentCategory] = lines[j]
          .trim()
          .replace(/^>\s*/, '');
      }
      continue;
    }

    // 检测子分类 (### 开头)
    if (line.startsWith('### ') && !line.startsWith('### [')) {
      currentSubcategory = line.replace('### ', '').trim();

      // 查找子分类的注释信息
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === '') {
        j++;
      }
      if (j < lines.length && lines[j].trim().startsWith('>')) {
        subcategoryDescriptions[`${currentCategory}|${currentSubcategory}`] =
          lines[j].trim().replace(/^>\s*/, '');
      }
      continue;
    }

    // 检测软件条目 (#### [软件名](链接) 或 ### [软件名](链接) 格式)
    const toolMatch = line.match(/^(####|###) \[([^\]]+)\]\(([^)]+)\)/);
    if (toolMatch) {
      const name = toolMatch[2];
      const url = toolMatch[3];

      // 查找描述（多行，直到遇到下一个标题）
      let description = '';
      let j = i + 1;
      let foundContent = false;

      while (j < lines.length) {
        const nextLine = lines[j].trim();

        // 如果遇到下一个标题，停止收集
        if (
          nextLine.startsWith('####') ||
          nextLine.startsWith('###') ||
          nextLine.startsWith('##')
        ) {
          break;
        }

        // 跳过空行，但继续收集后续内容
        if (nextLine === '') {
          if (foundContent) {
            // 如果已经有内容，遇到空行可以停止
            break;
          }
          j++;
          continue;
        }

        // 收集描述内容
        if (description) {
          description += ' ' + nextLine;
        } else {
          description = nextLine;
        }
        foundContent = true;
        j++;
      }

      // 清理描述文本
      description = description.replace(/^>/, '').trim();

      // 根据标题级别决定子分类
      // 如果是三级标题(###)的工具，直接属于一级分类
      // 如果是四级标题(####)的工具，属于当前子分类
      const level = toolMatch[1];
      const effectiveSubcategory =
        level === '###'
          ? '__NO_SUBCATEGORY__'
          : currentSubcategory || '__NO_SUBCATEGORY__';

      // 确保tags只包含一级分类
      const tags = [currentCategory];

      tools.push({
        name,
        url,
        description,
        category: currentCategory,
        subcategory: effectiveSubcategory,
        tags: tags,
      });
    }
  }

  return {
    title,
    description,
    tools,
    categoryDescriptions,
    subcategoryDescriptions,
  };
}

// 生成分类数据
function generateCategories(
  tools,
  categoryDescriptions,
  subcategoryDescriptions
) {
  const categories = {};

  tools.forEach((tool) => {
    if (!categories[tool.category]) {
      categories[tool.category] = {
        name: tool.category,
        description: categoryDescriptions[tool.category] || '',
        subcategories: {},
      };
    }

    // 如果没有子分类，使用主分类作为子分类
    const effectiveSubcategory = tool.subcategory || tool.category;
    const subcategoryKey = `${tool.category}|${effectiveSubcategory}`;

    if (!categories[tool.category].subcategories[effectiveSubcategory]) {
      categories[tool.category].subcategories[effectiveSubcategory] = {
        name:
          effectiveSubcategory === '__NO_SUBCATEGORY__'
            ? tool.category
            : effectiveSubcategory,
        description: subcategoryDescriptions[subcategoryKey] || '',
        tools: [],
      };
    }

    categories[tool.category].subcategories[effectiveSubcategory].tools.push(
      tool
    );
  });

  return categories;
}

// 主函数
function main() {
  // 显示帮助信息
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
Usage: node parse-readme.js [options]

Automatic file detection:
  - Checks parent directory first: ../README.md
  - Falls back to local directory: ./README.md

Options:
  --readme=<path>    Path to README file (optional, overrides automatic detection)
  --help, -h         Show this help message

Examples:
  node parse-readme.js                    # Automatic detection
  node parse-readme.js --readme=./docs/README.md
`);
    return;
  }

  // 解析命令行参数
  const args = process.argv.slice(2);
  let readmePath = null;

  // 解析命名参数（保留向后兼容）
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--readme=')) {
      readmePath = path.resolve(arg.split('=')[1]);
    }
  }

  // 自动查找README文件：先检查父目录，再检查本地目录
  if (!readmePath) {
    const parentReadmePath = path.resolve(process.cwd(), '../README.md');
    const localReadmePath = path.resolve(process.cwd(), 'README.md');

    if (fs.existsSync(parentReadmePath)) {
      readmePath = parentReadmePath;
      console.log(`📁 Using parent directory README: ${readmePath}`);
    } else if (fs.existsSync(localReadmePath)) {
      readmePath = localReadmePath;
      console.log(`📁 Using local directory README: ${readmePath}`);
    } else {
      console.error(
        `❌ README.md not found in parent or local directory. Please create this file.`
      );
      process.exit(1);
    }
  } else {
    console.log(`Parsing README.md from: ${readmePath}`);
  }

  // 检查文件是否存在
  if (!fs.existsSync(readmePath)) {
    console.error(`❌ ERROR: README.md not found at: ${readmePath}`);
    process.exit(1);
  }

  const {
    title,
    description,
    tools,
    categoryDescriptions,
    subcategoryDescriptions,
  } = parseReadme(readmePath);
  const categories = generateCategories(
    tools,
    categoryDescriptions,
    subcategoryDescriptions
  );

  // 创建数据目录 - 只保留public/data，移除重复的data目录
  const publicDataDir = path.join(__dirname, '..', 'public', 'data');

  if (!fs.existsSync(publicDataDir)) {
    fs.mkdirSync(publicDataDir, { recursive: true });
  }

  // 写入工具数据
  const toolsJson = JSON.stringify(tools, null, 2);
  fs.writeFileSync(path.join(publicDataDir, 'tools.json'), toolsJson);

  // 写入项目信息
  const projectInfo = {
    title,
    description,
    itemCount: tools.length,
    categoryCount: Object.keys(categories).length,
  };
  const projectInfoJson = JSON.stringify(projectInfo, null, 2);
  fs.writeFileSync(path.join(publicDataDir, 'project.json'), projectInfoJson);

  // 写入分类数据
  const categoriesJson = JSON.stringify(categories, null, 2);
  fs.writeFileSync(path.join(publicDataDir, 'categories.json'), categoriesJson);

  // 移除旧的data目录
  const oldDataDir = path.join(__dirname, '..', 'data');
  if (fs.existsSync(oldDataDir)) {
    fs.rmSync(oldDataDir, { recursive: true, force: true });
  }

  console.log(`Parsing complete! Found ${tools.length} items`);
  console.log(`Categories: ${Object.keys(categories).length}`);
  console.log(`Title: ${title}`);
  console.log(`Description: ${description}`);

  // 输出统计信息
  Object.keys(categories).forEach((category) => {
    const subcategoryCount = Object.keys(
      categories[category].subcategories
    ).length;
    const itemCount = Object.values(categories[category].subcategories).reduce(
      (sum, sub) => sum + sub.tools.length,
      0
    );
    console.log(
      `- ${category}: ${subcategoryCount} subcategories, ${itemCount} items`
    );
  });
}

main();
