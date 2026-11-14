/**
 * Static validation of the code examples shown by the live demos
 * (`[codeExample]` on <app-doc-section>, `[code]` on <app-code-block>).
 *
 * Those snippets are often fragments (a template excerpt, a config object),
 * so they cannot all be compiled. Instead every snippet is checked against
 * the API manifest:
 *   - every name imported from '@hakistack/ng-daisyui' must be exported;
 *   - templates are parsed with Angular's own template parser (@angular/compiler),
 *     and every `hk-*` element must be a known component selector, every bound
 *     input / two-way binding / output and every plain attribute on it must be a
 *     real input/output of that component (or of a library directive present on
 *     the element), unless it is a global HTML/ARIA attribute or an Angular forms
 *     directive.
 *
 * Catches documentation of removed or renamed inputs, outputs and components.
 */
import { parseTemplate, TmplAstElement, TmplAstTemplate, TmplAstBoundAttribute } from '@angular/compiler';
import { Node, Project, SyntaxKind } from 'ts-morph';
import { readdirSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const GLOBAL_ATTRS = new Set([
  'class',
  'id',
  'style',
  'title',
  'role',
  'tabindex',
  'slot',
  'lang',
  'dir',
  'hidden',
  'name',
  // Angular forms directives commonly placed on CVA components
  'formControl',
  'formControlName',
  'formGroup',
  'formGroupName',
  'formArrayName',
  'ngModel',
  'ngModelChange',
  'ngModelOptions',
]);
const GLOBAL_PREFIXES = ['aria-', 'data-', 'attr.', 'class.', 'style.'];

/**
 * @param {string} root repo root
 * @param {Array<{name:string, kind:string, selector?:string, inputs?:{name:string}[], outputs?:{name:string}[]}>} symbols manifest
 * @returns {{ errors: string[], checked: number }}
 */
export function checkDemoSnippets(root, symbols) {
  const checkSnippet = createSnippetChecker(symbols);
  const dir = resolve(root, 'projects/shared-demos/demos');
  const project = new Project({ skipAddingFilesFromTsConfig: true, compilerOptions: { allowJs: false } });
  const errors = [];
  let checked = 0;

  for (const file of readdirSync(dir).filter((f) => f.endsWith('.component.ts'))) {
    const sf = project.addSourceFileAtPath(resolve(dir, file));
    const where = relative(root, sf.getFilePath());
    for (const cls of sf.getClasses()) {
      const template = readTemplate(cls);
      const codeFields = new Set([...template.matchAll(/\[(?:codeExample|code)\]="([A-Za-z_]\w*)"/g)].map((m) => m[1]));
      for (const prop of cls.getProperties()) {
        if (!codeFields.has(prop.getName())) continue;
        const text = literalText(prop.getInitializer());
        if (text == null) continue;
        checked++;
        for (const e of checkSnippet(text)) errors.push(`${where} → ${prop.getName()}: ${e}`);
      }
    }
  }
  return { errors, checked };
}

/** Returns `(code) => string[]` that validates one snippet against the manifest. Exported for tests. */
export function createSnippetChecker(symbols) {
  const exported = new Set(symbols.map((s) => s.name));
  const components = new Map(); // tag → symbol
  const directives = []; // { attrs: string[], symbol }
  for (const s of symbols) {
    if (!s.selector) continue;
    for (const part of s.selector.split(',').map((x) => x.trim())) {
      const tag = /^([a-z][\w-]*)/.exec(part)?.[1];
      const attrs = [...part.matchAll(/\[([\w-]+)(?:=[^\]]*)?\]/g)].map((m) => m[1]);
      if (s.kind === 'component' && tag) components.set(tag, s);
      else if (attrs.length) directives.push({ attrs, tag, symbol: s });
    }
  }

  return checkSnippet;

  function checkSnippet(code) {
    const out = [];
    for (const m of code.matchAll(/import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*['"]@hakistack\/ng-daisyui['"]/g)) {
      for (const raw of m[1].split(',')) {
        const name = raw
          .replace(/^\s*type\s+/, '')
          .split(/\s+as\s+/)[0]
          .trim();
        if (name && !exported.has(name)) out.push(`imports \`${name}\`, which is not exported by @hakistack/ng-daisyui`);
      }
    }
    for (const tpl of templatesIn(code)) {
      const parsed = parseTemplate(tpl, 'snippet.html', { preserveWhitespaces: false });
      if (parsed.errors?.length) continue; // fragments that are not complete templates are skipped, not guessed at
      walk(parsed.nodes, out);
    }
    return out;
  }

  function walk(nodes, out) {
    for (const n of nodes) {
      if (n instanceof TmplAstElement) checkElement(n, out);
      if (n instanceof TmplAstTemplate) {
        // `<ng-template>` or a structural directive host
        if (n.tagName && n.tagName !== 'ng-template') checkElement(n, out);
      }
      if (n.children) walk(n.children, out);
    }
  }

  function checkElement(el, out) {
    const tag = el.name ?? el.tagName;
    const attrNames = (el.attributes ?? []).map((a) => a.name);
    const present = directives.filter((d) => d.attrs.some((a) => attrNames.includes(a) || (el.inputs ?? []).some((i) => i.name === a)));
    const comp = components.get(tag);
    if (!comp) {
      if (/^hk-/.test(tag)) out.push(`<${tag}> is not a known component selector`);
      if (!present.length) return;
    }
    const inputs = new Set([...(comp?.inputs ?? []), ...present.flatMap((d) => d.symbol.inputs ?? [])].map((i) => i.name));
    const outputs = new Set([...(comp?.outputs ?? []), ...present.flatMap((d) => d.symbol.outputs ?? [])].map((o) => o.name));
    const dirAttrs = new Set(present.flatMap((d) => d.attrs));
    const owner = comp ? `<${tag}>` : present.map((d) => d.symbol.name).join('/');
    const allowed = (name) => GLOBAL_ATTRS.has(name) || GLOBAL_PREFIXES.some((p) => name.startsWith(p)) || dirAttrs.has(name);

    for (const a of el.attributes ?? []) {
      if (allowed(a.name) || inputs.has(a.name)) continue;
      if (comp) out.push(`${owner} has attribute "${a.name}", which is not an input`);
    }
    for (const i of el.inputs ?? []) {
      // keyed property bindings only; attr./class./style. bindings are DOM bindings
      if (i.type !== 0 /* BindingType.Property */) continue;
      if (allowed(i.name) || inputs.has(i.name)) continue;
      out.push(`${owner} binds [${i.name}], which is not an input`);
    }
    for (const o of el.outputs ?? []) {
      if (o.type === 1 /* animation */) continue;
      const name = o.name;
      if (outputs.has(name) || GLOBAL_ATTRS.has(name) || isDomEvent(name)) continue;
      out.push(`${owner} listens to (${name}), which is not an output`);
    }
  }
}

const DOM_EVENTS = new Set([
  'click',
  'dblclick',
  'input',
  'change',
  'blur',
  'focus',
  'focusin',
  'focusout',
  'keydown',
  'keyup',
  'keypress',
  'submit',
  'mouseenter',
  'mouseleave',
  'mousedown',
  'mouseup',
  'contextmenu',
  'scroll',
  'wheel',
  'pointerdown',
  'pointerup',
  'dragstart',
  'dragend',
  'drop',
  'dragover',
  'paste',
  'copy',
]);
function isDomEvent(name) {
  return DOM_EVENTS.has(name.split('.')[0]);
}

/** Inline template of a @Component class (string or no-substitution template literal). */
function readTemplate(cls) {
  const dec = cls.getDecorator('Component');
  const arg = dec?.getArguments()[0];
  if (!arg || !Node.isObjectLiteralExpression(arg)) return '';
  const p = arg.getProperty('template');
  if (!p || !Node.isPropertyAssignment(p)) return '';
  return literalText(p.getInitializer()) ?? '';
}

function literalText(init) {
  if (!init) return null;
  if (Node.isStringLiteral(init) || Node.isNoSubstitutionTemplateLiteral(init)) return init.getLiteralText();
  if (Node.isTemplateExpression(init)) return init.getText().slice(1, -1); // keep ${…} text; good enough for parsing
  return null;
}

/** Templates inside a snippet: the whole snippet if it is markup, plus every `template: \`…\`` in TS. */
function templatesIn(code) {
  const out = [];
  const trimmed = code.trim();
  if (trimmed.startsWith('<')) out.push(trimmed);
  for (const m of code.matchAll(/template:\s*`([\s\S]*?)`/g)) out.push(m[1]);
  return out;
}

export { SyntaxKind };
