import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';

import type { MigrateResult } from './migrate-source';
import { Schema } from './schema';

/**
 * Lazily load the ts-morph-backed transform. `ts-morph` is an *optional* peer dependency — only needed when
 * running this migration — so resolve it on demand and surface a friendly install hint if it's missing.
 */
function loadTransform(context: SchematicContext): ((source: string, filePath?: string) => MigrateResult) | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('./migrate-source').migrateTableColumnsSource;
  } catch {
    context.logger.error(
      'The migrate-table-columns migration needs the optional peer dependency `ts-morph`. ' +
        'Install it and re-run:\n\n  npm install --save-dev ts-morph\n',
    );
    return null;
  }
}

/**
 * Rewrites legacy `createTable({ visible, headers, formatters, … })` projection configs across the
 * workspace into the declarative `createTable({ columns: { … } })` map.
 *
 * Run with:  `ng generate @hakistack/ng-daisyui:migrate-table-columns`
 * Preview with `--dry-run` (handled by the Angular CLI).
 */
export function migrateTableColumns(options: Schema): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const transform = loadTransform(context);
    if (!transform) return tree;

    const root = options.path ? normalize(options.path) : '';
    let migratedFiles = 0;

    tree.visit((filePath, entry) => {
      if (!isMigratableFile(filePath, root)) return;

      const content = entry?.content?.toString();
      if (!content || !content.includes('createTable')) return;

      const result = transform(content, filePath);
      for (const warning of result.warnings) {
        context.logger.warn(`${filePath}: ${warning}`);
      }
      if (result.changed) {
        tree.overwrite(filePath, result.code);
        migratedFiles++;
      }
    });

    if (migratedFiles > 0) {
      context.logger.info(
        `✓ Migrated createTable() in ${migratedFiles} file(s) to the declarative columns map. ` +
          `Run your formatter (e.g. \`prettier --write\`) to tidy indentation.`,
      );
    } else {
      context.logger.info('No legacy createTable() projection configs found — nothing to migrate.');
    }

    return tree;
  };
}

function isMigratableFile(filePath: string, root: string): boolean {
  if (!filePath.endsWith('.ts') || filePath.endsWith('.d.ts')) return false;
  if (filePath.includes('/node_modules/') || filePath.includes('/dist/')) return false;
  if (root && !filePath.startsWith(root) && !filePath.startsWith(`/${root}`)) return false;
  return true;
}

function normalize(path: string): string {
  return path.replace(/^\.?\/+/, '').replace(/\/+$/, '');
}
