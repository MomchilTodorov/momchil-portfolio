# Momchil Todorov headless React portfolio

The entire public website is a standalone React application. WordPress is the content backend. No WordPress theme or PHP template renders the public pages.

## Architecture

```text
Public website                          Content backend
React + React Router + Vite    ← REST → WordPress + Momchil Headless Core
Homepage and case studies               Profile, projects and editing
```

- `frontend/src/`: all public page layouts, navigation, project filtering, contact interactions, loading and error states.
- `wordpress/plugins/momchil-headless-core/`: the WordPress content model, profile settings, CV project importer and public REST API.
- `scripts/`: local development, CMS content export, React prerendering and verification.
- `dist/`: prebuilt public frontend, including the homepage, four case study pages and a 404 page.
- `install/momchil-headless-core.zip`: the ready-to-install WordPress plugin in the delivered package.

React is bundled independently. The frontend does not use `wp.element`, a WordPress-rendered page, or an iframe. The public case study routes are `/work/ligre/`, `/work/walhalla/`, `/work/elfbar/` and `/work/tzn/`.

## Start locally

Install Node.js 22.12 or newer and pnpm. From the extracted project directory:

```sh
pnpm install
pnpm dev
```

This starts both applications:

- React website: `http://127.0.0.1:5173`
- WordPress admin: `http://127.0.0.1:9417/wp-admin/`
- Local Playground login: username `admin`, password `password`

These are the disposable local development credentials created by WordPress Playground, not credentials for an existing account. Use separate credentials when installing WordPress for hosting.

The first run downloads the pinned WordPress 7.1.4 development runtime and imports the four case studies from the supplied CV. Later runs keep your content edits in `.local/wordpress/`. The importer skips existing project slugs and never overwrites their edited content. The cache and development data stay inside the project. Stop both applications with Ctrl+C.

## Edit content in WordPress

- **Portfolio projects**: title, summary excerpt, full case study content, technologies, categories, client URL and optional featured image.
- **Settings → Portfolio profile**: name, role, location, email, bio, experience figures and CV URL.
- **Settings → Portfolio profile → React frontend URL**: the address used by the WordPress admin’s View project links.
- **Tools → Portfolio setup**: explicitly import the four CV projects if installing the plugin manually.

Reload the React site to see the latest CMS data. Homepage profile fields and case study content come from the WordPress API. General section headings and the design live in the React components.

The project descriptions and career figures come from the supplied CV. The existing DOCX CV is available through the frontend’s download link. Project diagrams are original technical illustrations; the portfolio credits the agency work and notes that the live client sites may have changed.

## Use an existing WordPress installation

1. If migrating from the earlier package, deactivate **Momchil Portfolio Core** first. The new plugin reuses the existing project post type and metadata, so the saved projects remain available.
2. Upload `install/momchil-headless-core.zip` through **Plugins → Add New Plugin → Upload Plugin**, then activate it.
3. Use **Tools → Portfolio setup** to import the CV projects only if they are not already present.
4. Copy `.env.example` to `.env.local` in this project’s root and set the public CMS REST API base:

```dotenv
VITE_WP_API_BASE=https://cms.example.com/wp-json/
PUBLIC_SITE_URL=https://portfolio.example.com
```

5. Start only the React frontend:

```sh
pnpm dev:frontend
```

The WordPress site can keep its existing theme; it does not control the React design. The frontend reads public portfolio content without an admin login or API secret. WordPress must permit public GET access to the portfolio REST routes. The local API bridge is read-only and does not proxy admin requests or credentials.

## Build and preview

```sh
pnpm content:sync
pnpm build
pnpm preview
```

`content:sync` exports actual data from the configured external CMS, or from the local WordPress installation when no external URL is configured. It updates `frontend/public/content/portfolio.json`.

`build` bundles React and prerenders the current homepage and case study pages using `react-dom/server`. Each page contains its initial content and metadata before JavaScript runs. The browser hydrates that React markup and refreshes it from the WordPress API.

`preview` starts the built frontend on `http://127.0.0.1:4173` together with the local CMS and API bridge. The pre-rendered files are a snapshot; run content sync and build again after CMS edits to refresh initial HTML and social metadata. Runtime API requests still retrieve the latest published content.

The source defaults to local development. Before static hosting, configure `VITE_WP_API_BASE` with the separately hosted WordPress API and rebuild. The `dist/` directory is the public deployment output. `_redirects` contains a fallback for new `/work/` routes on hosts supporting that format; configure equivalent rules on other hosts. Search indexing is disabled in the initial local draft and should be reviewed when choosing public hosting.

## Verification

```sh
pnpm build
pnpm verify
```

The checks use a separate local WordPress database. They cover:

- WordPress plugin loading, PHP parsing, importer idempotence and public REST responses.
- Exclusion of draft and password-protected projects, rejection of anonymous writes and sanitization of case study HTML.
- A real CMS edit reaching the React frontend through an API fetch.
- React hydration, category filtering, case study navigation, route metadata, 404 handling and retry after an API failure, using a simulated DOM.
- Persistence across CMS restarts and pre-rendered HTML for the public routes.

The saved verification report is included as `verification.json`; each automated run writes its results to `.local/verification.json`. The automated interaction checks use a simulated DOM. The personal-profile redesign was also checked in a real browser at desktop and mobile widths, including filtering, project navigation, contact navigation and copying the email address.

## Later AI extension

A separate WordPress plugin can add an **Ask about my work** assistant based on the published case studies and profile. The React chat interface would call that plugin’s backend endpoint. The current package has no chatbot, AI provider credentials, external AI calls or AI usage costs.

## References

- [React](https://react.dev/)
- [Vite](https://vite.dev/guide/)
- [WordPress REST API](https://developer.wordpress.org/rest-api/)
- [WordPress Playground CLI](https://developer.wordpress.org/playground/developers/local-development/wp-playground-cli/)
