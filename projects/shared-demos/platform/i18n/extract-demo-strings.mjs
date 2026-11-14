#!/usr/bin/env node
/**
 * Lists every static `title` / `description` attribute on `<app-doc-section>` in the live demos
 * (projects/shared-demos/demos/*.ts, skipping *-v4.component.ts). Inline templates are pulled out with
 * ts-morph and parsed with Angular's own template parser, so the values are the decoded strings the
 * component input receives (entities such as &amp; / &#64; already resolved). Bound `[title]` /
 * `[description]` are out of scope (they are not static text).
 *
 * Usage (from the repo root): node projects/shared-demos/platform/i18n/extract-demo-strings.mjs
 */
import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTemplate } from '@angular/compiler';
import { Project, SyntaxKind } from 'ts-morph';

const DEMOS_DIR = join('projects', 'shared-demos', 'demos');
const SECTION_TAG = 'app-doc-section';
const ATTRS = new Set(['title', 'description']);

/** Inline `template:` strings of every `@Component` in a source file. */
function inlineTemplates(sourceFile) {
  const out = [];
  for (const prop of sourceFile.getDescendantsOfKind(SyntaxKind.PropertyAssignment)) {
    if (prop.getName() !== 'template') continue;
    const init = prop.getInitializer();
    if (!init) continue;
    const kind = init.getKind();
    if (kind === SyntaxKind.NoSubstitutionTemplateLiteral || kind === SyntaxKind.StringLiteral) {
      out.push(init.getLiteralValue());
    } else {
      throw new Error(`${sourceFile.getFilePath()}: non-literal template (${init.getKindName()}) is not supported`);
    }
  }
  return out;
}

function walk(nodes, visit) {
  for (const node of nodes ?? []) {
    visit(node);
    // Elements/templates keep `children`; control-flow blocks keep `children` or `branches`/`cases`.
    walk(node.children, visit);
    walk(node.branches, visit);
    walk(node.cases, visit);
    if (node.empty) walk([node.empty], visit);
    if (node.placeholder) walk([node.placeholder], visit);
    if (node.loading) walk([node.loading], visit);
    if (node.error) walk([node.error], visit);
  }
}

/**
 * @param {string} [root] repo root (defaults to the current working directory)
 * @returns {string[]} unique static section titles/descriptions, sorted
 */
export function extractDemoStrings(root = process.cwd()) {
  const dir = resolve(root, DEMOS_DIR);
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('-v4.component.ts') && !f.endsWith('.spec.ts'))
    .map((f) => join(dir, f));

  const project = new Project({ skipAddingFilesFromTsConfig: true, skipFileDependencyResolution: true });
  const found = new Set();

  for (const file of files) {
    const sf = project.addSourceFileAtPath(file);
    for (const template of inlineTemplates(sf)) {
      const parsed = parseTemplate(template, file, { preserveWhitespaces: false });
      if (parsed.errors?.length) {
        throw new Error(`${file}: template parse errors:\n${parsed.errors.map((e) => e.toString()).join('\n')}`);
      }
      walk(parsed.nodes, (node) => {
        // `node.name` is the element tag for t.Element; structural templates expose `tagName`.
        const tag = node.name ?? node.tagName;
        if (tag !== SECTION_TAG || !Array.isArray(node.attributes)) return;
        for (const attr of node.attributes) {
          if (ATTRS.has(attr.name) && attr.value.trim()) found.add(attr.value);
        }
      });
    }
  }

  return [...found].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const strings = extractDemoStrings();
  if (process.argv.includes('--json')) {
    process.stdout.write(JSON.stringify(strings, null, 2) + '\n');
  } else {
    for (const s of strings) console.log(s);
    console.error(`\n${strings.length} strings`);
  }
}
