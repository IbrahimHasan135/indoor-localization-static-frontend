# Repository Guidelines

## Project Structure & Module Organization

This is a static HTML, CSS, and JavaScript dashboard with no backend or build pipeline. `index.html` contains the dashboard and settings modal; `style.css` owns the theme and responsive layouts. `app.js` wires dependencies. Keep orchestration in `src/controllers/`, application state and rules in `src/services/`, and browser, MQTT.js, storage, and DOM adapters in `src/drivers/`. External fonts and MQTT.js load from CDNs; there is no bundled asset directory.

## Build, Test, and Development Commands

- `python3 -m http.server 8000`: serve the repository, then visit `http://localhost:8000`. ES modules require HTTP rather than `file://`.
- `node --check app.js`: check entry-point syntax; check changed modules the same way.
- `node --test`: run the JavaScript regression tests under `tests/`.
- `git diff --check`: catch whitespace errors before review.

There is no package installation, compilation, lint script, or formatter configuration. Check desktop and mobile layouts in a browser after changing HTML or CSS.

## Coding Style & Naming Conventions

Use two-space indentation in JavaScript, semicolons, single-quoted strings, and ES module imports with explicit `.js` extensions. Match existing PascalCase class filenames (`MessageLogService.js`) and camelCase methods and variables. Keep services testable through dependency injection. Render untrusted MQTT content with `textContent`, never interpolated HTML. Preserve existing layout breakpoints when updating the theme.

## Testing Guidelines

Use Node’s built-in test runner and name regression files `tests/*.test.js`. Test observable behavior, especially that raw telemetry cannot update positioning state. No numerical coverage threshold is configured. Verify connection settings, filtering, export, map reset, and responsive rendering manually. Distinguish mock-based checks from real broker or cloud verification.

## Commit & Pull Request Guidelines

History uses short imperative subjects, such as `Refactor frontend into controller service driver layers`. Follow that pattern and keep commits focused. Describe behavior changes, validation performed, and remaining integration gaps. Include screenshots for theme changes and link relevant issues when available.

## Configuration & Architecture

Keep raw MQTT telemetry separate from cloud localization results. Devices publish measurements; cloud processing computes positions; the dashboard displays results. Do not add localization algorithms to device assumptions or browser drivers. Never commit broker credentials; passwords must remain absent from local storage and exports.
