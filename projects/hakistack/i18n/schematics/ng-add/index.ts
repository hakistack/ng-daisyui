import { chain, Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Schema } from './schema';

const DEFAULT_TRANSLOCO_RANGE = '^8.2.0';

interface ResolvedSetup {
  projectName: string;
  sourceRoot: string; // e.g. 'src' or 'projects/app/src'
  definitionsDir: string; // posix, relative to root
  outputDir: string; // posix, relative to root
  locales: string[];
  sourceLang: string;
}

export function ngAdd(options: Schema): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const setup = resolveSetup(tree, options);
    context.logger.info(`\n@hakistack/i18n setup → project "${setup.projectName}" (locales: ${setup.locales.join(', ')})`);

    return chain([
      addTranslocoDependency(),
      createConfig(setup),
      addNpmScripts(options, setup),
      createLocaleTypes(options, setup),
      createSampleModule(options, setup),
      addGitignore(setup),
      printNextSteps(setup),
      scheduleInstall(options),
    ]);
  };
}

// =============================================================================
// Dependencies
// =============================================================================

function addTranslocoDependency(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const pkg = readJson(tree, '/package.json');
    if (!pkg) throw new Error('Could not find package.json at the workspace root.');

    pkg.dependencies = pkg.dependencies ?? {};
    pkg.devDependencies = pkg.devDependencies ?? {};

    const range = readLibraryPeerDependencies()['@jsverse/transloco'] ?? DEFAULT_TRANSLOCO_RANGE;
    if (pkg.dependencies['@jsverse/transloco'] || pkg.devDependencies['@jsverse/transloco']) {
      context.logger.info('  @jsverse/transloco already present — skipped');
    } else {
      pkg.dependencies['@jsverse/transloco'] = range;
      context.logger.info(`  Added @jsverse/transloco@${range} to dependencies`);
      writeJson(tree, '/package.json', pkg);
    }
    return tree;
  };
}

// =============================================================================
// i18n.config.json
// =============================================================================

function createConfig(setup: ResolvedSetup): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const path = '/i18n.config.json';
    if (tree.exists(path)) {
      context.logger.info('  i18n.config.json already exists — skipped');
      return tree;
    }
    const config = {
      srcRoot: setup.sourceRoot,
      definitionsDir: setup.definitionsDir,
      outputDir: setup.outputDir,
      locales: setup.locales,
      sourceLang: setup.sourceLang,
    };
    tree.create(path, JSON.stringify(config, null, 2) + '\n');
    context.logger.info('  Created i18n.config.json');
    return tree;
  };
}

// =============================================================================
// npm scripts
// =============================================================================

function addNpmScripts(options: Schema, _setup: ResolvedSetup): Rule {
  return (tree: Tree, context: SchematicContext) => {
    if (options.skipScripts) return tree;

    const pkg = readJson(tree, '/package.json');
    if (!pkg) return tree;
    pkg.scripts = pkg.scripts ?? {};

    let mutated = false;
    const set = (name: string, value: string) => {
      if (pkg.scripts[name] === undefined) {
        pkg.scripts[name] = value;
        mutated = true;
        context.logger.info(`  Added script "${name}"`);
      }
    };
    set('i18n:scan', 'hakistack-i18n scan');
    set('i18n:generate', 'hakistack-i18n generate');
    set('i18n:validate', 'hakistack-i18n validate');

    // Chain codegen before serve/build. Append (don't clobber) existing hooks.
    mutated = appendToScript(pkg.scripts, 'prestart', 'npm run i18n:scan', context) || mutated;
    mutated =
      appendToScript(pkg.scripts, 'prebuild', 'npm run i18n:scan && npm run i18n:generate && npm run i18n:validate', context) || mutated;

    if (mutated) writeJson(tree, '/package.json', pkg);
    return tree;
  };
}

function appendToScript(scripts: Record<string, string>, name: string, command: string, context: SchematicContext): boolean {
  const existing = scripts[name];
  if (existing === undefined) {
    scripts[name] = command;
    context.logger.info(`  Added "${name}": ${command}`);
    return true;
  }
  if (existing.includes('hakistack-i18n') || existing.includes('i18n:scan')) {
    context.logger.info(`  "${name}" already runs i18n codegen — skipped`);
    return false;
  }
  scripts[name] = `${existing} && ${command}`;
  context.logger.info(`  Appended i18n codegen to "${name}"`);
  return true;
}

// =============================================================================
// Locale type augmentation
// =============================================================================

function createLocaleTypes(options: Schema, setup: ResolvedSetup): Rule {
  return (tree: Tree, context: SchematicContext) => {
    if (options.skipSample) return tree;
    const path = `/${setup.sourceRoot}/i18n-locales.d.ts`;
    if (tree.exists(path)) {
      context.logger.info(`  ${rel(path)} already exists — skipped`);
      return tree;
    }
    const others = setup.locales.filter((l) => l !== 'en');
    const fields = ['en', ...others].map((l) => `    ${l}: string;`).join('\n');
    const content = `// Declares this project's locale set so \`t()\` autocompletes the right locales.
import '@hakistack/i18n/engine';

declare module '@hakistack/i18n/engine' {
  interface I18nLocales {
${fields}
  }
}
`;
    tree.create(path, content);
    context.logger.info(`  Created ${rel(path)}`);
    return tree;
  };
}

// =============================================================================
// Sample module
// =============================================================================

function createSampleModule(options: Schema, setup: ResolvedSetup): Rule {
  return (tree: Tree, context: SchematicContext) => {
    if (options.skipSample) return tree;
    if (hasExistingI18nModule(tree, setup.sourceRoot)) {
      context.logger.info('  Existing *.i18n.ts found — skipped sample');
      return tree;
    }
    const path = `/${setup.sourceRoot}/app/app.i18n.ts`;
    if (tree.exists(path)) return tree;
    const esLine = setup.locales.includes('es') ? ", { es: 'Mi App' }" : '';
    const content = `import { defineTranslations, t } from '@hakistack/i18n/engine';

export const APP = defineTranslations('app', {
  title: t('My App'${esLine}),
});
`;
    tree.create(path, content);
    context.logger.info(`  Created sample ${rel(path)}`);
    return tree;
  };
}

function hasExistingI18nModule(tree: Tree, sourceRoot: string): boolean {
  const dir = tree.getDir(`/${sourceRoot}`);
  let found = false;
  dir.visit((filePath) => {
    if (filePath.endsWith('.i18n.ts')) found = true;
  });
  return found;
}

// =============================================================================
// .gitignore
// =============================================================================

function addGitignore(setup: ResolvedSetup): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const path = '/.gitignore';
    const marker = '# @hakistack/i18n generated artifacts';
    const lines = [
      marker,
      `${setup.definitionsDir}/index.generated.ts`,
      `${setup.definitionsDir}/keys.generated.ts`,
      `${setup.definitionsDir}/*.directive.ts`,
    ];
    const block = '\n' + lines.join('\n') + '\n';

    if (!tree.exists(path)) {
      tree.create(path, block.trimStart());
      context.logger.info('  Created .gitignore with generated-artifact entries');
      return tree;
    }
    const current = tree.read(path)!.toString('utf-8');
    if (current.includes(marker)) {
      context.logger.info('  .gitignore already has i18n entries — skipped');
      return tree;
    }
    tree.overwrite(path, current.replace(/\s*$/, '') + '\n' + block);
    context.logger.info('  Added generated-artifact entries to .gitignore');
    return tree;
  };
}

// =============================================================================
// Next-steps message
// =============================================================================

function printNextSteps(setup: ResolvedSetup): Rule {
  return (_tree: Tree, context: SchematicContext) => {
    context.logger.info(
      [
        '',
        '@hakistack/i18n is set up. Next steps:',
        '  1. Run the first codegen:        npm run i18n:scan',
        '  2. Add provideI18n to your app config:',
        '',
        `       import { provideI18n } from '@hakistack/i18n';`,
        `       import { ALL_TRANSLATIONS } from './${trimLeadingSrc(setup.definitionsDir, setup.sourceRoot)}/index.generated';`,
        '',
        '       providers: [',
        '         provideI18n({',
        '           registry: ALL_TRANSLATIONS,',
        `           languages: [${setup.locales.map((l) => `{ id: '${l}', label: '${l}' }`).join(', ')}],`,
        `           defaultLang: '${setup.sourceLang}',`,
        '           persistLanguage: true,',
        '         }),',
        '       ],',
        '',
        '  3. Author translations in *.i18n.ts and import the generated AppTranslateDirective in templates.',
        '',
      ].join('\n'),
    );
    return _tree;
  };
}

function scheduleInstall(options: Schema): Rule {
  return (_tree: Tree, context: SchematicContext) => {
    if (options.skipInstall) return;
    context.addTask(new NodePackageInstallTask());
    context.logger.info('  Scheduled package install');
  };
}

// =============================================================================
// Helpers
// =============================================================================

function resolveSetup(tree: Tree, options: Schema): ResolvedSetup {
  const angularJson = readJson(tree, '/angular.json');
  const projects: Record<string, { projectType?: string; sourceRoot?: string; root?: string }> = angularJson?.projects ?? {};

  const projectName = resolveProjectName(projects, options.project);
  if (!projectName) throw new Error('Could not resolve a target project from angular.json.');

  const project = projects[projectName];
  const sourceRoot = (project?.sourceRoot ?? (project?.root ? `${project.root}/src` : 'src')).replace(/^\/+/, '');

  const locales = (options.locales ?? 'en,es')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (locales.length === 0) locales.push('en');

  const sourceLang = options.sourceLang ?? locales[0];

  return {
    projectName,
    sourceRoot,
    definitionsDir: `${sourceRoot}/i18n/definitions`,
    outputDir: `${sourceRoot}/assets/i18n`,
    locales,
    sourceLang,
  };
}

function resolveProjectName(projects: Record<string, { projectType?: string }>, explicit?: string): string | null {
  if (explicit && projects[explicit]) return explicit;
  for (const [name, project] of Object.entries(projects)) {
    if (project?.projectType === 'application') return name;
  }
  return Object.keys(projects)[0] ?? null;
}

function readJson(tree: Tree, path: string): any {
  const buffer = tree.read(path);
  return buffer ? JSON.parse(buffer.toString('utf-8')) : null;
}

function writeJson(tree: Tree, path: string, value: unknown): void {
  tree.overwrite(path, JSON.stringify(value, null, 2) + '\n');
}

function readLibraryPeerDependencies(): Record<string, string> {
  try {
    const pkgPath = join(__dirname, '..', '..', 'package.json');
    const parsed = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { peerDependencies?: Record<string, string> };
    return parsed.peerDependencies ?? {};
  } catch {
    return {};
  }
}

function rel(path: string): string {
  return path.replace(/^\//, '');
}

/** Turn `src/i18n/definitions` + sourceRoot `src` into `i18n/definitions` (for an import relative to app). */
function trimLeadingSrc(definitionsDir: string, sourceRoot: string): string {
  return definitionsDir.startsWith(`${sourceRoot}/`) ? definitionsDir.slice(sourceRoot.length + 1) : definitionsDir;
}
