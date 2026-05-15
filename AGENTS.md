# DNSSpeed Agent Instructions

When working on this project, please adhere to the following rules and conventions:

## Tech Stack
- **Desktop Framework:** Electron
- **Frontend Framework:** React 18+
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Bundler:** Webpack (via electron-react-boilerplate)

## Coding Conventions
1. **TypeScript:** Always use strong typing. Avoid `any` wherever possible. Define proper interfaces and types.
2. **React:** Use functional components and React Hooks. Do not use class components.
3. **Styling:** Use Tailwind CSS utility classes for styling. Avoid writing custom CSS in `.css` files unless absolutely necessary.
4. **Main/Renderer IPC:** All communication between the React frontend (Renderer process) and the Node.js backend (Main process) must go through the `window.electron` bridge defined in `preload.ts` and `main.ts`. Direct access to Node APIs from the frontend is forbidden.
5. **DNS Testing:** DNS speed testing logic should remain in the Main process using Node's native `dns` module and `perf_hooks`.

## Workflow
- Before making significant changes to the UI, ensure they match the existing dark mode aesthetic.
- Run `npm run build` to verify that there are no compilation or typing errors after completing a feature.
- **Unit Tests:** Always create unit tests for new code.
- **Pre-release Checks:** Before making a release, check if unit test cases pass, there are no npm audit issues, and release numbers are updated.
- **Manual Releases:** Never create a release automatically. Always ask the user for confirmation first.
