# Repository Guidelines
The compound miter calculator uses Next.js 15, React 19, and Tailwind CSS to deliver interactive geometry tooling. Follow these guidelines to keep contributions predictable and maintainable.

## Project Structure & Module Organization
The `app/` directory hosts Next.js routes, layouts, and metadata. UI building blocks live in `components/` (Radix primitives and custom widgets), while domain logic resides in `lib/`, including `lib/calculations/` and supporting utilities. Shared hooks belong in `hooks/`, and localized copy sits inside `locales/{lang}/` for consumption via `react-i18next`. Static assets and icons live in `public/`. Tests currently sit beside the code they cover (`lib/calculations/__tests__/`); follow that co-location pattern when adding suites.

## Build, Test, and Development Commands
`npm run dev` launches the Turbopack dev server with hot reload. `npm run build` compiles the production bundle; run it before deploying. `npm run start` serves the production output locally. `npm run lint` checks TypeScript and JSX against `eslint.config.mjs`. `npm run test` starts Vitest in watch mode; use `npm run test:run` for CI-style runs and `npm run test:ui` for the interactive dashboard.

## Coding Style & Naming Conventions
Write TypeScript with two-space indentation, no semicolons, and prefer named exports from feature modules. Component files use PascalCase (e.g., `components/ui/ModeToggle.tsx`), hooks use `useX` naming in `hooks/`, and utility helpers belong under `lib/utils/`. Tailwind classes should compose via the `cn` helper to keep conditional styling readable. Enforce lint fixes with `npm run lint -- --fix` before opening a PR.

## Testing Guidelines
Vitest is the test runner; use `.test.ts` files colocated with their implementation. Mirror the arrange-act-assert pattern in `lib/calculations/__tests__/angles.test.ts`. Add regression cases for new edge angles and ensure floating-point comparisons rely on tolerances. Run `npm run test:run` before pushing; add suites whenever domain logic grows.

## Commit & Pull Request Guidelines
Recent history follows Conventional Commits (`fix:`, `feat:`, `chore:`). Keep subject lines under 72 characters and describe what changed, not how. For PRs, include a concise summary, related issue links, testing notes, and screenshots or GIFs when UI changes are user-visible. Request review only after lint and tests pass.

## Localization & Assets
When altering copy, update the corresponding `locales/{lang}/translation.json` entry and keep keys consistent. Store downloadable references or imagery in `public/`, and prefer SVG for new icons to match existing assets.
