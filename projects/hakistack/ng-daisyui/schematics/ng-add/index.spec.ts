import { logging } from '@angular-devkit/core';
import { callRule, HostTree, SchematicContext } from '@angular-devkit/schematics';
import { lastValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { ngAdd } from './index';

function workspace(extra: Record<string, string> = {}): HostTree {
  const tree = new HostTree();
  tree.create('/package.json', JSON.stringify({ name: 'app', dependencies: { '@angular/core': '^21.0.0' } }));
  tree.create(
    '/angular.json',
    JSON.stringify({
      version: 1,
      projects: { app: { projectType: 'application', architect: { build: { options: { styles: ['src/styles.css'] } } } } },
    }),
  );
  tree.create('/src/styles.css', '');
  for (const [path, contents] of Object.entries(extra)) tree.create(path, contents);
  return tree;
}

const context = { logger: new logging.NullLogger(), addTask: () => undefined } as unknown as SchematicContext;

describe('ng-add (Tailwind v4 / daisyUI 5 path)', () => {
  it('creates .postcssrc.json so the Angular builder runs @tailwindcss/postcss', async () => {
    const tree = await lastValueFrom(callRule(ngAdd({ skipInstall: true }), workspace(), context));
    const config = JSON.parse(tree.readText('/.postcssrc.json'));
    expect(config.plugins['@tailwindcss/postcss']).toEqual({});
    expect(tree.readText('/src/styles.css')).toContain('@import "@hakistack/ng-daisyui"');
  });

  it('leaves an existing PostCSS config alone', async () => {
    const tree = await lastValueFrom(
      callRule(ngAdd({ skipInstall: true }), workspace({ '/postcss.config.mjs': 'export default {}' }), context),
    );
    expect(tree.exists('/.postcssrc.json')).toBe(false);
  });
});
