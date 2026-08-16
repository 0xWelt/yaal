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
