import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import matter from 'gray-matter';

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
    console.error('   Example: > A curated list of awesome tools');
    process.exit(1);
  }

  // 解析工具信息
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 匹配分类标题
    const categoryMatch = line.match(/^##\s+(.+)$/);
    if (categoryMatch) {
      currentCategory = categoryMatch[1].trim();
      // 查找分类描述（可能在标题后的1-3行内）
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const descLine = lines[j].trim();
        if (descLine && descLine.startsWith('>')) {
          categoryDescriptions[currentCategory] = descLine
            .replace(/^>\s*/, '')
            .trim();
          break;
        }
        // 如果遇到新的标题，停止查找
        if (descLine.startsWith('#')) {
          break;
        }
      }
      continue;
    }

    // 匹配子分类标题或直接使用###作为工具
    const subcategoryMatch = line.match(/^###\s+(.+)$/);
    if (subcategoryMatch) {
      const subcategoryContent = subcategoryMatch[1].trim();

      // 检查是否是直接工具格式：### [Name](URL)
      const directToolMatch = subcategoryContent.match(
        /^\[([^\]]+)\]\(([^)]+)\)$/
      );
      if (directToolMatch && currentCategory) {
        // 这是直接工具，不是子分类
        const name = directToolMatch[1].trim();
        const url = directToolMatch[2].trim();

        // 查找描述
        let description = '';
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j].trim();
          if (
            nextLine &&
            !nextLine.startsWith('#') &&
            !nextLine.startsWith('-')
          ) {
            description = nextLine.replace(/^>\s*/, '').trim();
            break;
          }
          if (nextLine.startsWith('#') || nextLine.startsWith('-')) break;
        }

        if (!description) {
          description = 'No description available';
        }

        // 提取域名作为来源
        const domainMatch = url.match(/^https?:\/\/([^/]+)/);
        const source = domainMatch ? domainMatch[1] : 'Unknown';

        tools.push({
          name,
          url,
          description,
          category: currentCategory,
          subcategory: '__NO_SUBCATEGORY__', // 使用特殊标记表示没有真正的子分类
          source,
        });

        // 不更新currentSubcategory，因为这不是真正的子分类
        continue;
      }

      // 这是正常的子分类
      currentSubcategory = subcategoryContent;
      // 查找子分类描述（可能在标题后的1-3行内）
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const descLine = lines[j].trim();
        if (descLine && descLine.startsWith('>')) {
          subcategoryDescriptions[`${currentCategory}::${currentSubcategory}`] =
            descLine.replace(/^>\s*/, '').trim();
          break;
        }
        // 如果遇到新的标题，停止查找
        if (descLine.startsWith('#')) {
          break;
        }
      }
      continue;
    }

    // 匹配工具条目 - 支持两种格式：
    // 1. - [名称](链接) - 描述
    // 2. #### [名称](链接)
    const toolMatch = line.match(/^-\s+\[([^\]]+)\]\(([^)]+)\)\s*-\s*(.+)$/);
    const titleToolMatch = line.match(/^####\s+\[([^\]]+)\]\(([^)]+)\)$/);

    if (toolMatch && currentCategory) {
      const name = toolMatch[1].trim();
      const url = toolMatch[2].trim();
      const description = toolMatch[3].trim();

      // 提取域名作为来源
      const domainMatch = url.match(/^https?:\/\/([^/]+)/);
      const source = domainMatch ? domainMatch[1] : 'Unknown';

      tools.push({
        name,
        url,
        description,
        category: currentCategory,
        subcategory: currentSubcategory || '__NO_SUBCATEGORY__', // 如果没有子分类，使用特殊标记
        source,
      });
    } else if (titleToolMatch && currentCategory) {
      const name = titleToolMatch[1].trim();
      const url = titleToolMatch[2].trim();

      // 对于 #### 格式，描述在后续行中（跳过空行）
      let description = '';
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim();
        if (
          nextLine &&
          !nextLine.startsWith('#') &&
          !nextLine.startsWith('-')
        ) {
          description = nextLine.replace(/^["']|["']$/g, '').trim(); // 移除引号
          break;
        }
        // 如果遇到新的标题或列表项，停止查找
        if (nextLine.startsWith('#') || nextLine.startsWith('-')) {
          break;
        }
      }

      if (!description) {
        description = 'No description available';
      }

      // 提取域名作为来源
      const domainMatch = url.match(/^https?:\/\/([^/]+)/);
      const source = domainMatch ? domainMatch[1] : 'Unknown';

      tools.push({
        name,
        url,
        description,
        category: currentCategory,
        subcategory: currentSubcategory || '__NO_SUBCATEGORY__', // 如果没有子分类，使用特殊标记
        source,
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

// 生成分类结构
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

    // 使用工具的子分类，如果是特殊标记则直接放在分类下
    const effectiveSubcategory = tool.subcategory || tool.category;

    if (effectiveSubcategory === '__NO_SUBCATEGORY__') {
      // 对于没有子分类的情况，直接放在分类下，不创建子分类
      if (!categories[tool.category].tools) {
        categories[tool.category].tools = [];
      }
      categories[tool.category].tools.push(tool);
    } else {
      // 正常的子分类处理
      const subcategoryKey = `${tool.category}::${effectiveSubcategory}`;

      if (!categories[tool.category].subcategories[effectiveSubcategory]) {
        categories[tool.category].subcategories[effectiveSubcategory] = {
          name: effectiveSubcategory,
          description: subcategoryDescriptions[subcategoryKey] || '',
          tools: [],
        };
      }

      categories[tool.category].subcategories[effectiveSubcategory].tools.push(
        tool
      );
    }
  });

  return categories;
}

// ============ Directory mode (contents/) ============
// When a `contents/` directory exists next to README.md, parse it instead of
// the monolithic README. Layout:
//   contents/<category>/_meta.md          - category metadata (title, description)
//   contents/<category>/<subcategory>/_meta.md - subcategory metadata
//   contents/<category>/<subcategory>/<tool>.md - tool entry with YAML frontmatter
// Tool file frontmatter: name, link, command (optional), category/subcategory (optional).

// Read metadata from a _meta.md file (YAML frontmatter + optional body description).
function readMeta(filePath, fallbackName) {
  if (!fs.existsSync(filePath)) {
    return { title: fallbackName, description: '' };
  }
  const { data, content } = matter(fs.readFileSync(filePath, 'utf8'));
  return {
    title: data.title || fallbackName,
    description: (data.description || content || '').trim(),
  };
}

// Extract the domain from a URL as the tool source.
function extractSourceFromUrl(url) {
  if (!url) return 'Unknown';
  try {
    const domainMatch = url.match(/^https?:\/\/([^/]+)/);
    return domainMatch ? domainMatch[1] : 'Unknown';
  } catch {
    return 'Unknown';
  }
}

// Parse a single tool markdown file into the standard tool object.
function parseToolFile(filePath, category, subcategory) {
  const { data, content } = matter(fs.readFileSync(filePath, 'utf8'));
  const url = data.link || data.url || '';
  const name = data.name || path.basename(filePath, '.md');
  return {
    name,
    url,
    description: (content || '').trim() || data.description || '',
    category: data.category || category,
    subcategory: data.subcategory || subcategory || '__NO_SUBCATEGORY__',
    source: extractSourceFromUrl(url),
    // Optional cross-category dimensions: a tool may be, e.g., a platform CLI
    // that also ships agent skills (tags: [agent-skills]) or an MCP server.
    ...(Array.isArray(data.tags) ? { tags: data.tags } : {}),
  };
}

// Scan a contents/ directory tree and build categories + tools.
function parseContentsDirectory(contentsDir) {
  const categories = {};
  const tools = [];

  const categoryDirs = fs
    .readdirSync(contentsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const catEntry of categoryDirs) {
    const catDir = path.join(contentsDir, catEntry.name);
    const catMeta = readMeta(path.join(catDir, '_meta.md'), catEntry.name);
    const categoryName = catMeta.title;
    const category = {
      name: categoryName,
      description: catMeta.description,
      subcategories: {},
    };

    // Subcategory directories
    const subDirs = fs
      .readdirSync(catDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const subEntry of subDirs) {
      const subDir = path.join(catDir, subEntry.name);
      const subMeta = readMeta(path.join(subDir, '_meta.md'), subEntry.name);
      const subcategoryName = subMeta.title;
      const subTools = [];

      const toolFiles = fs
        .readdirSync(subDir)
        .filter((f) => f.endsWith('.md') && f !== '_meta.md')
        .sort();

      for (const f of toolFiles) {
        const tool = parseToolFile(
          path.join(subDir, f),
          categoryName,
          subcategoryName
        );
        subTools.push(tool);
        tools.push(tool);
      }

      category.subcategories[subcategoryName] = {
        name: subcategoryName,
        description: subMeta.description,
        tools: subTools,
      };
    }

    // Tool files directly under the category (no subcategory)
    const directTools = fs
      .readdirSync(catDir)
      .filter((f) => f.endsWith('.md') && f !== '_meta.md')
      .sort();
    if (directTools.length) {
      category.tools = directTools.map((f) => {
        const tool = parseToolFile(
          path.join(catDir, f),
          categoryName,
          '__NO_SUBCATEGORY__'
        );
        tools.push(tool);
        return tool;
      });
    }

    categories[categoryName] = category;
  }

  return { categories, tools };
}

// Extract the # title and first descriptive line from a README (directory mode).
function extractTitleDescription(readmePath) {
  const content = fs.readFileSync(readmePath, 'utf8');
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : '';

  let description = '';
  const lines = content.split(/\r?\n/);
  let foundTitle = false;
  for (const line of lines) {
    const t = line.trim();
    if (!foundTitle && t.startsWith('# ')) {
      foundTitle = true;
      continue;
    }
    if (
      foundTitle &&
      t &&
      !t.startsWith('#') &&
      !t.startsWith('[') &&
      !t.startsWith('![') &&
      !t.startsWith('<')
    ) {
      description = t;
      break;
    }
  }
  return { title, description };
}

// 主函数
function main() {
  // 显示帮助信息
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
Usage: node parse-readme.js

Automatic file detection:
  - Checks parent directory first: ../README.md
  - Falls back to local directory: ./README.md

Examples:
  node parse-readme.js                    # Automatic detection
`);
    return;
  }

  try {
    let readmePath;

    // 检查是否有命令行参数指定README文件
    if (process.argv[2] && !process.argv[2].startsWith('-')) {
      readmePath = path.resolve(process.cwd(), process.argv[2]);
      if (!fs.existsSync(readmePath)) {
        console.error(`❌ README file not found: ${readmePath}`);
        process.exit(1);
      }
      console.log(`📁 Using specified README: ${readmePath}`);
    } else {
      // 自动查找README文件：先检查父目录，再检查本地目录
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
    }

    console.log(`Parsing README.md from: ${readmePath}`);

    // 检查文件是否存在
    if (!fs.existsSync(readmePath)) {
      console.error(`❌ ERROR: README.md not found at: ${readmePath}`);
      process.exit(1);
    }

    // Detect directory mode: a contents/ directory next to README.md.
    const contentsDir = path.join(path.dirname(readmePath), 'contents');
    let title, description, categories, tools;

    if (fs.existsSync(contentsDir)) {
      console.log(`📁 Directory mode detected: ${contentsDir}`);
      ({ title, description } = extractTitleDescription(readmePath));
      ({ categories, tools } = parseContentsDirectory(contentsDir));
    } else {
      // Legacy monolithic README mode.
      const parsed = parseReadme(readmePath);
      title = parsed.title;
      description = parsed.description;
      tools = parsed.tools;
      categories = generateCategories(
        parsed.tools,
        parsed.categoryDescriptions,
        parsed.subcategoryDescriptions
      );
    }

    // 创建数据目录 - 只保留public/data，移除重复的data目录
    const publicDataDir = path.join(__dirname, '..', 'public', 'data');

    // 确保数据目录存在
    if (!fs.existsSync(publicDataDir)) {
      fs.mkdirSync(publicDataDir, { recursive: true });
    }

    // 写入工具数据
    fs.writeFileSync(
      path.join(publicDataDir, 'tools.json'),
      JSON.stringify(tools, null, 2)
    );

    // 写入分类数据
    fs.writeFileSync(
      path.join(publicDataDir, 'categories.json'),
      JSON.stringify(categories, null, 2)
    );

    // 写入项目信息
    const projectData = {
      title,
      description,
      totalTools: tools.length,
      categories: Object.keys(categories).length,
    };
    fs.writeFileSync(
      path.join(publicDataDir, 'project.json'),
      JSON.stringify(projectData, null, 2)
    );

    console.log(`Parsing complete! Found ${tools.length} items`);
    console.log(`Categories: ${Object.keys(categories).length}`);
    console.log(`Title: ${title}`);
    console.log(`Description: ${description}`);

    Object.keys(categories).forEach((category) => {
      const subcategories = Object.keys(categories[category].subcategories);
      const totalTools =
        subcategories.reduce(
          (sum, sub) =>
            sum + categories[category].subcategories[sub].tools.length,
          0
        ) + (categories[category].tools || []).length;
      console.log(
        `- ${category}: ${subcategories.length} subcategories, ${totalTools} items`
      );
    });
  } catch (error) {
    console.error('❌ Error parsing README:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (
  import.meta.url === `file://${process.argv[1]}` ||
  import.meta.url.endsWith('parse-readme.js')
) {
  main();
}
