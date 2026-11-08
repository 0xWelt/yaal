import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname } from 'path';
import matter from 'gray-matter';
import { attachEntryIcons } from '../lib/entryIcon.js';

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
            // Preview directives are metadata, not the description.
            if (imageDirectiveToken(nextLine)) continue;
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
          ...imageProps(readmeImage(lines, i + 1)),
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
        ...imageProps(readmeImage(lines, i + 1)),
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
          // Preview directives are metadata, not the description.
          if (imageDirectiveToken(nextLine)) continue;
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
        ...imageProps(readmeImage(lines, i + 1)),
      });
    }
  }

  for (const tool of tools) finalizeTool(tool);

  return {
    title,
    description,
    tools,
    categoryDescriptions,
    subcategoryDescriptions,
  };
}

// Every entry carries the full directory path in `groups`. `category` is the
// first segment and `subcategory` stays the second segment (or the historical
// sentinel) so existing two-level lists keep the same fields.
function finalizeTool(tool) {
  if (!Array.isArray(tool.groups) || tool.groups.length === 0) {
    tool.groups =
      tool.subcategory && tool.subcategory !== '__NO_SUBCATEGORY__'
        ? [tool.category, tool.subcategory]
        : [tool.category];
  }
  tool.category = tool.groups[0];
  tool.subcategory = tool.groups[1] || '__NO_SUBCATEGORY__';
  return tool;
}

// Insert tools into a tree keyed by group title. Depth is whatever each
// entry's `groups` array contains — nothing here assumes two or three levels.
function buildTree(tools, descByPath) {
  const categories = {};

  for (const tool of tools) {
    finalizeTool(tool);
    const groups = tool.groups;
    const categoryName = groups[0];
    if (!categories[categoryName]) {
      categories[categoryName] = {
        name: categoryName,
        description: descByPath.get(categoryName) || '',
        children: {},
      };
    }

    let node = categories[categoryName];
    for (let i = 1; i < groups.length; i++) {
      const name = groups[i];
      if (!node.children[name]) {
        node.children[name] = {
          name,
          description: descByPath.get(groups.slice(0, i + 1).join('\0')) || '',
          children: {},
        };
      }
      node = node.children[name];
    }

    if (!node.tools) node.tools = [];
    node.tools.push(tool);
  }

  return categories;
}

function countEntries(node) {
  const direct = Array.isArray(node.tools) ? node.tools.length : 0;
  const children = node.children || node.subcategories || {};
  return (
    direct +
    Object.values(children).reduce((sum, child) => sum + countEntries(child), 0)
  );
}

// 生成分类结构
function generateCategories(
  tools,
  categoryDescriptions,
  subcategoryDescriptions
) {
  const descByPath = new Map();
  for (const [category, description] of Object.entries(
    categoryDescriptions || {}
  )) {
    descByPath.set(category, description || '');
  }
  for (const [key, description] of Object.entries(
    subcategoryDescriptions || {}
  )) {
    const splitAt = key.indexOf('::');
    if (splitAt === -1) continue;
    const category = key.slice(0, splitAt);
    const subcategory = key.slice(splitAt + 2);
    if (!category || !subcategory) continue;
    descByPath.set([category, subcategory].join('\0'), description || '');
  }
  return buildTree(tools, descByPath);
}

// ============ Directory mode (contents/) ============
// When a `contents/` directory exists next to README.md, parse it instead of
// the monolithic README. Every entry markdown except `_meta.md` is indexed at
// any depth. A category may be one grouping level (`contents/<section>/<file>`),
// two (`contents/<section>/<group>/<file>`), or deeper. `_meta.md` supplies the
// title and description for that directory. Frontmatter `category` / `subcategory`
// override the first two segments; deeper segments always come from the path.
// `image` is an optional absolute https preview and is omitted when invalid.

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

// Optional official preview (typically an og:image). Only absolute https URLs
// are kept. Missing, relative, or non-https values are omitted — never invented.
function officialPreviewImage(value) {
  if (typeof value !== 'string') return undefined;
  const url = value.trim().replace(/^["']|["']$/g, '');
  if (!/^https:\/\/\S+$/.test(url)) return undefined;
  try {
    if (new URL(url).protocol !== 'https:') return undefined;
    return url;
  } catch {
    return undefined;
  }
}

function imageProps(value) {
  const image = officialPreviewImage(value);
  return image ? { image } : {};
}

// README mode only. A preview is an explicit directive inside the tool entry,
// never a nearby badge or screenshot:
//   image: https://example.com/preview.png
//   <!-- image: https://example.com/preview.png -->
// Scanning stops at the next heading or list item so other entries are untouched.
function imageDirectiveToken(line) {
  const comment = line.match(/^<!--\s*image:\s*(\S+)\s*-->$/i);
  if (comment) return comment[1];
  const plain = line.match(/^image:\s*(\S+)\s*$/i);
  if (plain) return plain[1];
  return undefined;
}

function readmeImage(lines, startIndex) {
  for (let j = startIndex; j < lines.length; j++) {
    const nextLine = lines[j].trim();
    if (!nextLine) continue;
    if (nextLine.startsWith('#') || nextLine.startsWith('-')) break;
    const token = imageDirectiveToken(nextLine);
    if (!token) continue;
    const image = officialPreviewImage(token);
    if (image) return image;
  }
  return undefined;
}

// Frontmatter may replace the category and the first child group. Segments
// below that stay on the directory path, so depth is never truncated.
function resolveGroups(dirTitles, data) {
  const groups = Array.isArray(dirTitles) ? [...dirTitles] : [];
  if (typeof data.category === 'string' && data.category.trim()) {
    const category = data.category.trim();
    if (groups.length === 0) groups.push(category);
    else groups[0] = category;
  }
  if (typeof data.subcategory === 'string' && data.subcategory.trim()) {
    const subcategory = data.subcategory.trim();
    if (groups.length < 2) groups.push(subcategory);
    else groups[1] = subcategory;
  }
  if (groups.length === 0) groups.push('Uncategorized');
  return groups;
}

function readEntryFile(filePath, dirTitles) {
  const { data, content } = matter(fs.readFileSync(filePath, 'utf8'));
  const url = data.link || data.url || '';
  const name = data.name || path.basename(filePath, '.md');
  return finalizeTool({
    name,
    url,
    description: (content || '').trim() || data.description || '',
    groups: resolveGroups(dirTitles, data),
    source: extractSourceFromUrl(url),
    ...imageProps(data.image),
    // Optional cross-category dimensions: a tool may be, e.g., a platform CLI
    // that also ships agent skills (tags: [agent-skills]) or an MCP server.
    ...(Array.isArray(data.tags) ? { tags: data.tags } : {}),
  });
}

function listEntryFiles(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith('.md') &&
        entry.name !== '_meta.md'
    )
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b.name));
}

function listChildDirs(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Index entry files at this directory, then recurse. `_meta.md` is metadata
// for the directory itself and is never an entry. Empty directories add nothing.
function walkContents(dir, titles, tools, descByPath) {
  for (const name of listEntryFiles(dir)) {
    tools.push(readEntryFile(path.join(dir, name), titles));
  }
  for (const entry of listChildDirs(dir)) {
    const childDir = path.join(dir, entry.name);
    const meta = readMeta(path.join(childDir, '_meta.md'), entry.name);
    const nextTitles = [...titles, meta.title];
    descByPath.set(nextTitles.join('\0'), meta.description || '');
    walkContents(childDir, nextTitles, tools, descByPath);
  }
}

// Scan a contents/ directory tree and build categories + tools.
function parseContentsDirectory(contentsDir) {
  const tools = [];
  const descByPath = new Map();

  for (const entry of listChildDirs(contentsDir)) {
    const categoryDir = path.join(contentsDir, entry.name);
    const meta = readMeta(path.join(categoryDir, '_meta.md'), entry.name);
    descByPath.set(meta.title, meta.description || '');
    walkContents(categoryDir, [meta.title], tools, descByPath);
  }

  // Entry files sitting directly in contents/ still count.
  for (const name of listEntryFiles(contentsDir)) {
    tools.push(readEntryFile(path.join(contentsDir, name), []));
  }

  return { categories: buildTree(tools, descByPath), tools };
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

// Extract the Architecture section from a README (directory mode). The section is
// authored as a Mermaid flowchart; we parse it into structured JSON (groups,
// nodes, edges) so the frontend can render it with custom components instead of
// the mermaid runtime (better dark mode, responsive, modern styling).
function parseMermaidFlowchart(source) {
  const lines = source.split('\n');
  const groups = [];
  const nodes = [];
  const edges = [];
  let currentGroup = null;
  const groupStack = [];

  const groupRe = /^\s*subgraph\s+([\w-]+)\["([^"]*)"\]/;
  const nodeRe = /^\s*([\w-]+)\["([^"]*)"\]/;
  const edgeRe = /^\s*([\w-]+)\s*(-->|-.->)\s*(?:\|([^|]*)\|)?\s*([\w-]+)/;
  const endRe = /^\s*end\s*$/;
  const directionRe = /^\s*direction\s+/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('flowchart')) continue;
    if (directionRe.test(line)) continue;

    const g = line.match(groupRe);
    if (g) {
      currentGroup = { id: g[1], title: g[2], items: [] };
      groups.push(currentGroup);
      groupStack.push(currentGroup);
      continue;
    }

    if (endRe.test(line)) {
      groupStack.pop();
      currentGroup = groupStack[groupStack.length - 1] || null;
      continue;
    }

    const n = line.match(nodeRe);
    if (n && groupStack.length) {
      groupStack[groupStack.length - 1].items.push(n[2]);
      continue;
    }
    if (n) {
      nodes.push({ id: n[1], name: n[2] });
      continue;
    }

    const ed = line.match(edgeRe);
    if (ed) {
      edges.push({ from: ed[1], to: ed[4], label: ed[3] ? ed[3].trim() : '' });
      continue;
    }
  }

  if (!groups.length && !nodes.length && !edges.length) return null;
  return { groups, nodes, edges };
}

function extractArchitecture(readmePath) {
  if (!fs.existsSync(readmePath)) return null;
  const content = fs.readFileSync(readmePath, 'utf8');
  const archMatch = content.match(
    /##\s+Architecture\s*\n([\s\S]*?)(?=\n##\s|$)/
  );
  if (!archMatch) return null;
  const mermaidMatch = archMatch[1].match(/```mermaid\n([\s\S]*?)```/);
  if (!mermaidMatch) return null;
  const parsed = parseMermaidFlowchart(mermaidMatch[1]);
  if (!parsed) return null;
  return { title: 'Architecture', ...parsed };
}

// 主函数
async function main() {
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

    // Icons are best-effort. A failed lookup must not drop the entry.
    await attachEntryIcons(tools);
    const iconCount = tools.filter((tool) => tool.icon).length;

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

    // 写入架构信息（可选：README 有 Architecture 章节时）
    const architecture = extractArchitecture(readmePath);
    const architecturePath = path.join(publicDataDir, 'architecture.json');
    if (architecture) {
      fs.writeFileSync(architecturePath, JSON.stringify(architecture, null, 2));
      console.log('📐 Architecture diagram extracted');
    } else if (fs.existsSync(architecturePath)) {
      // 不再有 Architecture 章节时移除旧文件
      fs.rmSync(architecturePath);
    }

    console.log(`Parsing complete! Found ${tools.length} items`);
    console.log(`Categories: ${Object.keys(categories).length}`);
    console.log(`Icons: ${iconCount}/${tools.length}`);
    console.log(`Title: ${title}`);
    console.log(`Description: ${description}`);

    Object.keys(categories).forEach((category) => {
      const childGroups = Object.keys(categories[category].children || {});
      console.log(
        `- ${category}: ${childGroups.length} child groups, ${countEntries(categories[category])} items`
      );
    });
  } catch (error) {
    console.error('❌ Error parsing README:', error.message);
    process.exit(1);
  }
}

export { parseContentsDirectory, parseReadme, generateCategories };

// 如果直接运行此脚本
const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main().catch((error) => {
    console.error('❌ Error parsing README:', error.message);
    process.exit(1);
  });
}
