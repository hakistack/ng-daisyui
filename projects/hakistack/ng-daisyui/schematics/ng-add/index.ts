import { chain, Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Schema, Toolchain } from './schema';

const DEFAULT_ANGULAR_MAJOR = 21;
const DEFAULT_TAILWIND_V5_RANGE = '^4.0.0';
const DEFAULT_DAISYUI_V5_RANGE = '^5.0.0';

const LEGACY_DEPS: Record<string, string> = {
  tailwindcss: '^3.4.0',
  daisyui: '^4.12.0',
  postcss: '^8.4.0',
  autoprefixer: '^10.4.0',
};

const TAILWIND_V5_IMPORT = '@import "tailwindcss";';
const DAISYUI_V5_PLUGIN = '@plugin "daisyui";';
const LIBRARY_V5_IMPORT = '@import "@hakistack/ng-daisyui";';

const LEGACY_STYLE_IMPORT = '@import "@hakistack/ng-daisyui/themes/daisyui-v4.css";';
const LEGACY_TAILWIND_DIRECTIVES = '@tailwind base;\n@tailwind components;\n@tailwind utilities;';

const LEGACY_TAILWIND_CONFIG = `const ngDaisyuiPreset = require('@hakistack/ng-daisyui/themes/daisyui-v4-preset');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [ngDaisyuiPreset],
  content: [
    './src/**/*.{html,ts}',
  ],
  theme: {
    extend: {},
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: ['light', 'dark'],
    darkTheme: 'dark',
    base: true,
    styled: true,
    utils: true,
    logs: false,
  },
};
`;

const LEGACY_POSTCSS_CONFIG = `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;

export function ngAdd(options: Schema): Rule {
  const target: Toolchain = options.target ?? 'v5';
  return chain([addDependencies(target), addStyleSetup(options, target), scheduleInstall(options)]);
}

function addDependencies(target: Toolchain): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const pkgPath = '/package.json';
    const pkgBuffer = tree.read(pkgPath);
    if (!pkgBuffer) {
      throw new Error('Could not find package.json at the workspace root.');
    }

    const pkgJson = JSON.parse(pkgBuffer.toString('utf-8'));
    pkgJson.dependencies = pkgJson.dependencies ?? {};
    pkgJson.devDependencies = pkgJson.devDependencies ?? {};

    const angularMajor = detectAngularMajor(pkgJson);
    const runtimeDeps: Record<string, string> = {
      '@angular/cdk': `^${angularMajor}.0.0`,
      '@angular/aria': `^${angularMajor}.0.0`,
    };

    const buildDeps = target === 'v5' ? resolveV5BuildDeps() : LEGACY_DEPS;

    let mutated = false;
    mutated = mergeDeps(pkgJson.dependencies, pkgJson.devDependencies, runtimeDeps, 'dependencies', context) || mutated;
    mutated = mergeDeps(pkgJson.devDependencies, pkgJson.dependencies, buildDeps, 'devDependencies', context) || mutated;

    if (mutated) {
      tree.overwrite(pkgPath, JSON.stringify(pkgJson, null, 2) + '\n');
    }
    return tree;
  };
}

function resolveV5BuildDeps(): Record<string, string> {
  const libraryPeers = readLibraryPeerDependencies();
  const tailwindRange = libraryPeers['tailwindcss'] ?? DEFAULT_TAILWIND_V5_RANGE;
  const daisyuiRange = libraryPeers['daisyui'] ?? DEFAULT_DAISYUI_V5_RANGE;
  return {
    tailwindcss: tailwindRange,
    '@tailwindcss/postcss': tailwindRange,
    daisyui: daisyuiRange,
  };
}

function detectAngularMajor(consumerPkg: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }): number {
  const range = consumerPkg.dependencies?.['@angular/core'] ?? consumerPkg.devDependencies?.['@angular/core'];
  if (!range) {
    return DEFAULT_ANGULAR_MAJOR;
  }
  const match = range.match(/(\d+)/);
  return match ? Number(match[1]) : DEFAULT_ANGULAR_MAJOR;
}

function readLibraryPeerDependencies(): Record<string, string> {
  try {
    const pkgPath = join(__dirname, '..', '..', 'package.json');
    const raw = readFileSync(pkgPath, 'utf-8');
    const parsed = JSON.parse(raw) as { peerDependencies?: Record<string, string> };
    return parsed.peerDependencies ?? {};
  } catch {
    return {};
  }
}

function mergeDeps(
  target: Record<string, string>,
  other: Record<string, string>,
  deps: Record<string, string>,
  bucket: string,
  context: SchematicContext,
): boolean {
  let mutated = false;
  for (const [name, range] of Object.entries(deps)) {
    if (target[name] || other[name]) {
      context.logger.info(`  ${name} already present — skipped`);
      continue;
    }
    target[name] = range;
    mutated = true;
    context.logger.info(`  Added ${name}@${range} to ${bucket}`);
  }
  return mutated;
}

function addStyleSetup(options: Schema, target: Toolchain): Rule {
  return target === 'v5' ? wireV5Styles(options) : wireLegacyStyles(options);
}

function wireV5Styles(options: Schema): Rule {
  return (tree: Tree, context: SchematicContext) => {
    if (options.skipStyleImport) {
      return tree;
    }

    const stylesPath = findStylesFile(tree, options.project);
    if (!stylesPath) {
      context.logger.warn(
        '  Could not locate a root CSS styles file — add the following manually to styles.css:\n' +
          `    ${TAILWIND_V5_IMPORT}\n    ${DAISYUI_V5_PLUGIN}\n    ${LIBRARY_V5_IMPORT}`,
      );
      return tree;
    }

    const stylesBuffer = tree.read(stylesPath);
    if (!stylesBuffer) {
      return tree;
    }

    let contents = stylesBuffer.toString('utf-8');
    let mutated = false;

    if (!/@import\s+["']tailwindcss["']/.test(contents)) {
      contents = `${TAILWIND_V5_IMPORT}\n${contents}`;
      mutated = true;
      context.logger.info(`  Added ${TAILWIND_V5_IMPORT} to ${stylesPath}`);
    }

    if (!/@plugin\s+["']daisyui["']/.test(contents)) {
      contents = insertAfter(contents, /@import\s+["']tailwindcss["'];?\s*\n?/, `${DAISYUI_V5_PLUGIN}\n`);
      mutated = true;
      context.logger.info(`  Added ${DAISYUI_V5_PLUGIN} to ${stylesPath}`);
    }

    if (!contents.includes('@hakistack/ng-daisyui')) {
      contents = insertAfter(contents, /@plugin\s+["']daisyui["'][^;]*;?\s*\n?/, `${LIBRARY_V5_IMPORT}\n`);
      mutated = true;
      context.logger.info(`  Added ${LIBRARY_V5_IMPORT} to ${stylesPath}`);
    }

    if (mutated) {
      tree.overwrite(stylesPath, contents);
    } else {
      context.logger.info(`  ${stylesPath} already wired up — skipped`);
    }
    return tree;
  };
}

function wireLegacyStyles(options: Schema): Rule {
  return (tree: Tree, context: SchematicContext) => {
    if (!options.skipStyleImport) {
      wireLegacyStylesFile(tree, options, context);
    }
    ensureFile(tree, '/tailwind.config.js', LEGACY_TAILWIND_CONFIG, context);
    ensureFile(tree, '/postcss.config.js', LEGACY_POSTCSS_CONFIG, context);
    return tree;
  };
}

function wireLegacyStylesFile(tree: Tree, options: Schema, context: SchematicContext): void {
  const stylesPath = findStylesFile(tree, options.project);
  if (!stylesPath) {
    context.logger.warn(
      '  Could not locate a root CSS styles file — add the following manually to styles.css:\n' +
        `    ${LEGACY_STYLE_IMPORT}\n    ${LEGACY_TAILWIND_DIRECTIVES}`,
    );
    return;
  }

  const stylesBuffer = tree.read(stylesPath);
  if (!stylesBuffer) {
    return;
  }

  let contents = stylesBuffer.toString('utf-8');
  let mutated = false;

  if (!contents.includes('@hakistack/ng-daisyui/themes/daisyui-v4.css')) {
    contents = `${LEGACY_STYLE_IMPORT}\n${contents}`;
    mutated = true;
    context.logger.info(`  Added ${LEGACY_STYLE_IMPORT} to ${stylesPath}`);
  }

  if (!/@tailwind\s+base/.test(contents)) {
    contents = `${contents}\n${LEGACY_TAILWIND_DIRECTIVES}\n`;
    mutated = true;
    context.logger.info(`  Added @tailwind directives to ${stylesPath}`);
  }

  if (mutated) {
    tree.overwrite(stylesPath, contents);
  } else {
    context.logger.info(`  ${stylesPath} already wired up — skipped`);
  }
}

function ensureFile(tree: Tree, path: string, contents: string, context: SchematicContext): void {
  if (tree.exists(path)) {
    context.logger.info(`  ${path} already exists — skipped`);
    return;
  }
  tree.create(path, contents);
  context.logger.info(`  Created ${path}`);
}

function insertAfter(source: string, anchor: RegExp, insertion: string): string {
  const match = source.match(anchor);
  if (!match || match.index === undefined) {
    return `${source}\n${insertion}`;
  }
  const end = match.index + match[0].length;
  return source.slice(0, end) + insertion + source.slice(end);
}

function scheduleInstall(options: Schema): Rule {
  return (_tree: Tree, context: SchematicContext) => {
    if (options.skipInstall) {
      return;
    }
    context.addTask(new NodePackageInstallTask());
    context.logger.info('  Scheduled npm install for new dependencies');
  };
}

function findStylesFile(tree: Tree, projectName?: string): string | null {
  const angularJsonBuffer = tree.read('/angular.json');
  if (!angularJsonBuffer) {
    return null;
  }

  const angularJson = JSON.parse(angularJsonBuffer.toString('utf-8'));
  const projects = angularJson.projects ?? {};
  const targetName = resolveProjectName(projects, projectName);
  if (!targetName) {
    return null;
  }

  const build = projects[targetName]?.architect?.build ?? projects[targetName]?.targets?.build;
  const styles: unknown[] = build?.options?.styles ?? [];

  for (const entry of styles) {
    const path = typeof entry === 'string' ? entry : (entry as { input?: string })?.input;
    if (typeof path === 'string' && /\.css$/i.test(path)) {
      return path.startsWith('/') ? path : `/${path}`;
    }
  }
  return null;
}

function resolveProjectName(projects: Record<string, unknown>, explicit?: string): string | null {
  if (explicit && projects[explicit]) {
    return explicit;
  }
  for (const [name, project] of Object.entries(projects)) {
    if ((project as { projectType?: string })?.projectType === 'application') {
      return name;
    }
  }
  const first = Object.keys(projects)[0];
  return first ?? null;
}
