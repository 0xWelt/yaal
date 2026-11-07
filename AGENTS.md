# CRUSH.md - Codebase Reference for Agents

## Toolchain

This project uses [Vite+](https://viteplus.dev) (`vp`) as the unified toolchain for
runtime/package-manager management, formatting (Oxfmt), linting (Oxlint), and type
checking (tsgo). `vp` is the only command entry point; ESLint, Prettier, Husky, and
lint-staged are no longer used. Configuration lives in a single `vite.config.ts`.

## Build/Lint/Test Commands

- `vp run build` - Build production bundle (runs generate-config + parse-readme + next build)
- `vp check` - Format, lint, and type-check in one pass (use `--fix` to auto-fix)
- `vp fmt` - Format only (`vp fmt --check` to verify)
- `vp lint` - Lint only
- `vp run parse-readme` - Parse README.md to generate tool data
- `vp node scripts/parse-readme.js` - Run single script directly
- `vp install` - Install dependencies with the right package manager

**Note**: Do not run `npm run dev` (hangs), use `vp run build` and inspect generated files instead

## Code Style Guidelines

- **Imports**: TypeScript, no extensions, use `@/` alias
- **Formatting**: 2 spaces, single quotes, semicolons, trailing commas (Oxfmt, see `fmt` in `vite.config.ts`)
- **Types**: Interfaces for props (`Tool`, `ToolCardProps`), strict TypeScript
- **Naming**: PascalCase components, camelCase functions/variables
- **Error handling**: Try-catch with fallbacks, never throw in UI
- **Styling**: Tailwind CSS, custom components in `globals.css`
- **Structure**: `/app` Next.js pages, `/components` React components
- **Config**: Use `lib/config.ts` for environment detection
- **Pre-commit**: `vp staged` runs automatically via `.vite-hooks/pre-commit`

## Communication Guidelines

- **Conversation language**: Use Chinese for user communication
- **Code language**: Use English for code, comments, and commit messages

## List data sources

The parser supports two modes, switched automatically by whether a `contents/` directory exists next to `README.md`. Diverging from these formats can cause entries to be skipped silently or the build to fail.

### README mode

```markdown
# Project title

> Short description (required).

## Category name

> Optional category description.

### Subcategory name

> Optional subcategory description.

#### [Tool name](https://example.com)

Tool description paragraph.

#### [Another tool](https://example.org)

Another description.
```

Supported entry formats:

1. `#### [Name](link)` — put the description on the following non-empty, non-heading line.
2. `- [Name](link) - inline description`

An optional official preview can follow the description, before the next heading or list item. Use an HTML comment so the README renderer stays unchanged:

```html
<!-- image: https://example.com/preview.png -->
```

`image` is not required. It must be an absolute `https` URL of the product's official preview image (typically the page's Open Graph image). Do not commit an image binary, and do not use an unofficial screenshot. A bare `image: https://...` line is accepted too. Badges and other images are ignored.

Keep translated copies (such as `README.es-ES.md`) in sync with the main README.

### Directory mode (`contents/`)

```
contents/
├── <category>/
│   ├── _meta.md                 # YAML frontmatter: title; body is the category description
│   └── <subcategory>/
│       ├── _meta.md             # YAML frontmatter: title; body is the subcategory description
│       └── <tool>.md            # YAML frontmatter + body description
```

Tool file frontmatter:

```yaml
---
name: Tool Name
link: https://example.com
image: https://example.com/preview.png # optional
---
Tool description paragraph.
```

`image` is not required. When present, it must be an absolute `https` URL of the product's official preview image (typically the page's Open Graph image). Do not commit an image binary, and do not use an unofficial screenshot. If `image` is absent, it is omitted from the generated data.

`category` / `subcategory` may also be set in frontmatter to override path inference; otherwise they come from the directory path.

## Taxonomy maintenance

Design categories from currently listed entries only. Do not reserve empty directories or empty sections for types that do not exist yet.

Whenever you add a new item, re-evaluate whether the current taxonomy still makes sense:

- If the item does not fit a current category cleanly, create a new category and put it there.
- If existing categories are unclear, draw a distinction without a real difference, are empty shells, or no longer hold after the new item, adjust them in the same change and migrate existing entries.
- Do not keep empty “might need later” categories.

This applies to both `contents/` directory mode and README heading mode.
