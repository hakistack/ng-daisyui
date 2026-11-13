/**
 * Public-API extractor for @hakistack/ng-daisyui.
 *
 * Walks every symbol exported from `src/public-api.ts` with the TypeScript
 * type checker (via ts-morph) and classifies it: component, directive,
 * service, injection token, provider function, function, class, constant,
 * interface, type alias or enum. For Angular classes it reads the decorator
 * metadata and resolves signal inputs / models / outputs from their *types*
 * (`InputSignal`, `InputSignalWithTransform`, `ModelSignal`,
 * `OutputEmitterRef`) — not from regexes over the source text.
 *
 * Consumed by:
 *   - scripts/extract-api-docs.mjs  → writes the manifest the docs app reads
 *   - scripts/check-docs-coverage.mjs → compares the manifest with the docs catalog
 */
import { Node, Project, SyntaxKind } from 'ts-morph';
import { relative, resolve } from 'node:path';

const MAX_TYPE_LENGTH = 600;

/**
 * @param {string} root Repository root.
 * @returns {{ symbols: ApiSymbol[] }}
 */
export function extractPublicApi(root) {
  const libRoot = resolve(root, 'projects/hakistack/ng-daisyui');
  const project = new Project({
    tsConfigFilePath: resolve(libRoot, 'tsconfig.lib.json'),
    skipAddingFilesFromTsConfig: true,
  });
  const entry = project.addSourceFileAtPath(resolve(libRoot, 'src/public-api.ts'));
  project.resolveSourceFileDependencies();

  const symbols = [];
  const exported = entry.getExportedDeclarations();

  for (const [exportName, declarations] of exported) {
    const decl = declarations[0];
    if (!decl) continue;
    const file = decl.getSourceFile().getFilePath();
    // Re-exports of third-party types (e.g. libphonenumber-js CountryCode).
    const external = file.includes('/node_modules/');
    const sourcePath = relative(root, file);

    const base = {
      name: exportName,
      localName: getDeclName(decl) ?? exportName,
      kind: 'constant',
      area: external ? 'external' : areaFromPath(sourcePath),
      description: external ? '' : readDoc(decl),
      deprecated: hasTag(decl, 'deprecated'),
      source: external ? null : { path: sourcePath, line: decl.getStartLineNumber() },
    };

    if (external) {
      symbols.push({ ...base, kind: 'type', typeText: `re-exported from ${packageFromPath(file)}` });
      continue;
    }

    if (Node.isClassDeclaration(decl)) symbols.push(describeClass(decl, base));
    else if (Node.isFunctionDeclaration(decl)) symbols.push(describeFunction(decl, base));
    else if (Node.isVariableDeclaration(decl)) symbols.push(describeVariable(decl, base));
    else if (Node.isInterfaceDeclaration(decl)) symbols.push(describeInterface(decl, base));
    else if (Node.isTypeAliasDeclaration(decl)) symbols.push(describeTypeAlias(decl, base));
    else if (Node.isEnumDeclaration(decl)) {
      symbols.push({
        ...base,
        kind: 'enum',
        members: decl.getMembers().map((m) => ({ name: m.getName(), type: String(m.getValue()), description: readDoc(m) })),
      });
    } else symbols.push(base);
  }

  symbols.sort((a, b) => a.name.localeCompare(b.name));
  return { symbols };
}

// ── classes ─────────────────────────────────────────────────────────────

function describeClass(cls, base) {
  const component = cls.getDecorator('Component');
  const directive = cls.getDecorator('Directive');
  const injectable = cls.getDecorator('Injectable');
  const pipe = cls.getDecorator('Pipe');

  if (component || directive) {
    const meta = component ?? directive;
    const io = collectSignalIo(cls);
    return {
      ...base,
      kind: component ? 'component' : 'directive',
      selector: readDecoratorString(meta, 'selector') ?? '',
      exportAs: readDecoratorString(meta, 'exportAs') ?? undefined,
      inputs: io.inputs,
      outputs: io.outputs,
      methods: collectMethods(cls),
    };
  }
  if (pipe) {
    return { ...base, kind: 'pipe', selector: readDecoratorString(pipe, 'name') ?? '', methods: collectMethods(cls) };
  }
  if (injectable) {
    return {
      ...base,
      kind: 'service',
      providedIn: readDecoratorString(injectable, 'providedIn') ?? undefined,
      methods: collectMethods(cls),
      properties: collectProperties(cls),
    };
  }
  return { ...base, kind: 'class', methods: collectMethods(cls), properties: collectProperties(cls) };
}

/**
 * Inputs / models / outputs are recognised by the *type* of the class field
 * (Angular's signal primitives), walking base classes so inherited inputs
 * are included.
 */
function collectSignalIo(cls) {
  const inputs = [];
  const outputs = [];
  const seen = new Set();
  for (let current = cls; current; current = current.getBaseClass()) {
    for (const prop of current.getProperties()) {
      const name = prop.getName();
      if (seen.has(name) || prop.hasModifier(SyntaxKind.PrivateKeyword) || prop.hasModifier(SyntaxKind.ProtectedKeyword)) continue;
      if (name.startsWith('#')) continue;
      const type = prop.getType();
      const symbolName = type.getSymbol()?.getName() ?? type.getAliasSymbol()?.getName();
      const args = type.getTypeArguments().length ? type.getTypeArguments() : type.getAliasTypeArguments();
      const init = prop.getInitializer();
      const initText = init?.getText() ?? '';
      const alias = readCallOption(init, 'alias');
      const publicName = alias ?? name;

      if (symbolName === 'InputSignal' || symbolName === 'InputSignalWithTransform' || symbolName === 'ModelSignal') {
        seen.add(name);
        const isModel = symbolName === 'ModelSignal';
        // InputSignalWithTransform<T, WriteT>: consumers bind WriteT.
        const typeArg = symbolName === 'InputSignalWithTransform' ? (args[1] ?? args[0]) : args[0];
        const required = /^(input|model)\.required\b/.test(initText);
        inputs.push(
          compact({
            name: publicName,
            property: alias ? name : undefined,
            type: typeArg ? printType(typeArg, prop) : 'unknown',
            default: required ? undefined : readFirstArg(init),
            required: required || undefined,
            model: isModel || undefined,
            description: readDoc(prop),
            deprecated: hasTag(prop, 'deprecated') || undefined,
          }),
        );
        if (isModel) {
          outputs.push(
            compact({
              name: `${publicName}Change`,
              type: typeArg ? printType(typeArg, prop) : 'unknown',
              description: `Two-way binding event for \`${publicName}\` (model).`,
              model: true,
            }),
          );
        }
      } else if (symbolName === 'OutputEmitterRef' || symbolName === 'OutputRef') {
        seen.add(name);
        outputs.push(
          compact({
            name: publicName,
            property: alias ? name : undefined,
            type: args[0] ? printType(args[0], prop) : 'void',
            description: readDoc(prop),
            deprecated: hasTag(prop, 'deprecated') || undefined,
          }),
        );
      }
    }
  }
  return { inputs, outputs };
}

function collectMethods(cls) {
  return cls
    .getMethods()
    .filter((m) => isPublicMember(m) && !m.getName().startsWith('ng') && !m.getName().startsWith('_'))
    .filter((m) => !hasTag(m, 'internal'))
    .map((m) =>
      compact({
        name: m.getName(),
        signature: truncate(
          `${m.isStatic() ? 'static ' : ''}${m.getName()}(${m.getParameters().map(paramText).join(', ')}): ${safeReturnType(m)}`,
        ),
        description: readDoc(m),
        deprecated: hasTag(m, 'deprecated') || undefined,
      }),
    );
}

function collectProperties(cls) {
  return cls
    .getProperties()
    .filter((p) => isPublicMember(p) && !p.getName().startsWith('_') && !hasTag(p, 'internal'))
    .map((p) =>
      compact({
        name: p.getName(),
        type: truncate(p.getTypeNode()?.getText() ?? printType(p.getType(), p)),
        readonly: p.isReadonly() || undefined,
        description: readDoc(p),
      }),
    );
}

function isPublicMember(m) {
  return !m.hasModifier(SyntaxKind.PrivateKeyword) && !m.hasModifier(SyntaxKind.ProtectedKeyword) && !m.getName().startsWith('#');
}

// ── functions / variables / types ───────────────────────────────────────

function describeFunction(fn, base) {
  const overloads = fn.getOverloads();
  const sigs = (overloads.length ? overloads : [fn]).map(
    (f) => `${base.name}${typeParamsText(f)}(${f.getParameters().map(paramText).join(', ')}): ${safeReturnType(f)}`,
  );
  return { ...base, kind: classifyFunctionName(base.name), signatures: sigs.map(truncate), params: paramDocs(fn) };
}

function describeVariable(v, base) {
  const init = v.getInitializer();
  if (init && Node.isNewExpression(init) && init.getExpression().getText() === 'InjectionToken') {
    const typeArg = init.getTypeArguments()[0];
    return { ...base, kind: 'token', typeText: truncate(`InjectionToken<${typeArg ? typeArg.getText() : printType(v.getType(), v)}>`) };
  }
  if (init && (Node.isArrowFunction(init) || Node.isFunctionExpression(init))) {
    return {
      ...base,
      kind: classifyFunctionName(base.name),
      signatures: [truncate(`${base.name}(${init.getParameters().map(paramText).join(', ')}): ${safeReturnType(init)}`)],
    };
  }
  const typeText = v.getTypeNode()?.getText() ?? printType(v.getType(), v);
  // Namespaced builder objects (field.*, step(), item.*, node.*) are callable maps.
  return { ...base, kind: 'constant', typeText: truncate(typeText) };
}

function describeInterface(i, base) {
  const members = [];
  for (const p of i.getProperties()) {
    if (hasTag(p, 'internal')) continue;
    members.push(
      compact({
        name: p.getName(),
        type: truncate(p.getTypeNode()?.getText() ?? printType(p.getType(), p)),
        optional: p.hasQuestionToken() || undefined,
        readonly: p.isReadonly() || undefined,
        description: readDoc(p),
        deprecated: hasTag(p, 'deprecated') || undefined,
      }),
    );
  }
  for (const m of i.getMethods()) {
    if (hasTag(m, 'internal')) continue;
    members.push(
      compact({
        name: m.getName(),
        type: truncate(`(${m.getParameters().map(paramText).join(', ')}) => ${m.getReturnTypeNode()?.getText() ?? 'void'}`),
        method: true,
        optional: m.hasQuestionToken() || undefined,
        description: readDoc(m),
      }),
    );
  }
  const ext = i.getExtends().map((e) => e.getText());
  return compact({
    ...base,
    kind: 'interface',
    typeParams: typeParamsText(i) || undefined,
    extends: ext.length ? ext : undefined,
    members,
  });
}

function describeTypeAlias(t, base) {
  return compact({
    ...base,
    kind: 'type',
    typeParams: typeParamsText(t) || undefined,
    typeText: truncate(t.getTypeNode()?.getText() ?? ''),
  });
}

function classifyFunctionName(name) {
  if (/^provide[A-Z]/.test(name)) return 'provider';
  return 'function';
}

// ── helpers ─────────────────────────────────────────────────────────────

function getDeclName(decl) {
  return typeof decl.getName === 'function' ? decl.getName() : undefined;
}

function areaFromPath(path) {
  const m = /src\/lib\/(components|directives|services|grid-core|theme|types|utils|helpers|api)\/?([^/]*)/.exec(path);
  if (!m) return 'core';
  if (m[1] === 'components') return m[2].replace(/\.ts$/, '');
  if (m[1] === 'directives') return 'directives';
  if (m[1] === 'services') return m[2].replace(/\.ts$/, '').replace(/\.service$/, '');
  return m[1];
}

function packageFromPath(file) {
  const m = /node_modules\/((?:@[^/]+\/)?[^/]+)/.exec(file);
  return m ? m[1] : 'a dependency';
}

function readDoc(node) {
  if (typeof node.getJsDocs !== 'function') {
    // Variable declarations carry docs on their statement.
    const stmt = node.getFirstAncestorByKind?.(SyntaxKind.VariableStatement);
    return stmt ? readDoc(stmt) : '';
  }
  const docs = node.getJsDocs();
  if (!docs.length) return '';
  const raw = docs[docs.length - 1].getDescription();
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\{@link\s+([^}|\s]+)(?:[|\s][^}]*)?\}/g, '`$1`')
    .trim();
}

function hasTag(node, tag) {
  const target = typeof node.getJsDocs === 'function' ? node : node.getFirstAncestorByKind?.(SyntaxKind.VariableStatement);
  if (!target || typeof target.getJsDocs !== 'function') return false;
  return target.getJsDocs().some((d) => d.getTags().some((t) => t.getTagName() === tag));
}

function readDecoratorString(decorator, prop) {
  const arg = decorator.getArguments()[0];
  if (!arg || !Node.isObjectLiteralExpression(arg)) return null;
  const p = arg.getProperty(prop);
  if (!p || !Node.isPropertyAssignment(p)) return null;
  const init = p.getInitializer();
  if (!init) return null;
  if (Node.isStringLiteral(init) || Node.isNoSubstitutionTemplateLiteral(init)) return init.getLiteralText();
  return init.getText();
}

/** Read `{ alias: 'x' }` from the options argument of `input(...)` / `output(...)`. */
function readCallOption(init, key) {
  if (!init || !Node.isCallExpression(init)) return null;
  for (const arg of init.getArguments()) {
    if (!Node.isObjectLiteralExpression(arg)) continue;
    const p = arg.getProperty(key);
    if (p && Node.isPropertyAssignment(p)) {
      const v = p.getInitializer();
      if (v && Node.isStringLiteral(v)) return v.getLiteralText();
    }
  }
  return null;
}

/** Default value of `input(default, opts)` / `model(default)`: the first argument's source text. */
function readFirstArg(init) {
  if (!init || !Node.isCallExpression(init)) return undefined;
  const first = init.getArguments()[0];
  if (!first) return undefined;
  return truncate(first.getText(), 120);
}

function paramText(p) {
  const name = p.isRestParameter() ? `...${p.getName()}` : p.getName();
  const type = p.getTypeNode()?.getText() ?? printType(p.getType(), p);
  return `${name}${p.hasQuestionToken() || p.hasInitializer() ? '?' : ''}: ${type}`;
}

function paramDocs(fn) {
  const docs = fn.getJsDocs?.() ?? [];
  const out = [];
  for (const d of docs) {
    for (const t of d.getTags()) {
      if (t.getTagName() === 'param' && Node.isJSDocParameterTag(t)) {
        out.push({ name: t.getName(), description: (t.getCommentText() ?? '').replace(/^\s*-\s*/, '').trim() });
      }
    }
  }
  return out.length ? out : undefined;
}

function typeParamsText(node) {
  const tps = node.getTypeParameters?.() ?? [];
  return tps.length ? `<${tps.map((t) => t.getText()).join(', ')}>` : '';
}

function safeReturnType(fn) {
  const node = fn.getReturnTypeNode?.();
  if (node) return node.getText();
  try {
    return printType(fn.getReturnType(), fn);
  } catch {
    return 'unknown';
  }
}

function printType(type, enclosing) {
  const text = type.getText(enclosing).replace(/import\("[^"]+"\)\./g, '');
  return truncate(text);
}

function truncate(text, max = MAX_TYPE_LENGTH) {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  return oneLine.length > max ? `${oneLine.slice(0, max - 1)}…` : oneLine;
}

function compact(obj) {
  for (const k of Object.keys(obj)) if (obj[k] === undefined || obj[k] === '') delete obj[k];
  return obj;
}
