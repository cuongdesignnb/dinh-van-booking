import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, relative as relativePath, resolve as resolvePath, sep } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = resolvePath(dirname(fileURLToPath(import.meta.url)), '..');
const appRoot = join(root, 'src', 'app');
const codeExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css']);
const sourceExtensions = new Set([...codeExtensions, '.json']);
const ignoredDirectories = new Set(['node_modules', '.next', '.next-dev', '.next-devbuild', 'dist']);
const normalized = (path) => relativePath(root, path).split(sep).join('/');

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) return [];
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function configOptions(configPath) {
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
  return ts.parseJsonConfigFileContent(config.config, ts.sys, dirname(configPath)).options;
}

const frontOptions = configOptions(join(root, 'tsconfig.json'));
const backOptions = configOptions(join(root, 'backend', 'tsconfig.json'));

function localResolution(importer, specifier) {
  if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return null;
  const options = normalized(importer).startsWith('backend/') ? backOptions : frontOptions;
  const resolved = ts.resolveModuleName(specifier, importer, options, ts.sys).resolvedModule?.resolvedFileName;
  if (resolved && existsSync(resolved) && sourceExtensions.has(extname(resolved)) &&
    !normalized(resolved).split('/').includes('node_modules')) return resolved;
  const base = specifier.startsWith('@/') ? join(root, 'src', specifier.slice(2)) : resolvePath(dirname(importer), specifier);
  const candidates = extname(base)
    ? [base]
    : [
        ...[...sourceExtensions].map((extension) => base + extension),
        ...[...sourceExtensions].map((extension) => join(base, 'index' + extension)),
      ];
  return candidates.find((candidate) =>
    existsSync(candidate) &&
    sourceExtensions.has(extname(candidate)) &&
    !normalized(candidate).split('/').includes('node_modules'),
  ) ?? null;
}

function moduleSpecifiers(source, file) {
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') || file.endsWith('.jsx') ? ts.ScriptKind.TSX : undefined);
  const result = [];
  const add = (literal, runtime) => {
    if (literal && ts.isStringLiteralLike(literal)) result.push({ specifier: literal.text, runtime });
  };
  const visit = (node) => {
    if (ts.isImportDeclaration(node)) {
      const clause = node.importClause;
      const runtime = !clause || (!clause.isTypeOnly && (
        !!clause.name ||
        !clause.namedBindings ||
        ts.isNamespaceImport(clause.namedBindings) ||
        (ts.isNamedImports(clause.namedBindings) && clause.namedBindings.elements.some((element) => !element.isTypeOnly))
      ));
      add(node.moduleSpecifier, runtime);
    } else if (ts.isExportDeclaration(node)) {
      add(node.moduleSpecifier, !node.isTypeOnly && (!node.exportClause || (ts.isNamedExports(node.exportClause) && node.exportClause.elements.some((element) => !element.isTypeOnly))));
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      add(node.arguments[0], true);
    } else if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'require') {
      add(node.arguments[0], true);
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      add(node.moduleReference.expression, true);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return result;
}

function traceRuntimeGraph(roots, label) {
  const seen = new Set();
  const queue = [...roots];
  const edges = [];
  const unresolved = [];
  while (queue.length) {
    const path = queue.pop();
    if (seen.has(path)) continue;
    seen.add(path);
    const extension = extname(path);
    if (!codeExtensions.has(extension)) continue;
    const source = readFileSync(path, 'utf8');
    for (const item of moduleSpecifiers(source, path)) {
      if (!item.runtime || (!item.specifier.startsWith('.') && !item.specifier.startsWith('@/'))) continue;
      const target = localResolution(path, item.specifier);
      if (!target) {
        unresolved.push({ from: normalized(path), specifier: item.specifier });
        continue;
      }
      edges.push({ from: normalized(path), to: normalized(target) });
      queue.push(target);
    }
  }
  return {
    label,
    roots: roots.map(normalized).sort(),
    files: [...seen].filter((path) => codeExtensions.has(extname(path))).map((path) => ({
      path,
      relative: normalized(path),
      source: readFileSync(path, 'utf8'),
    })).sort((a, b) => a.relative.localeCompare(b.relative)),
    edges,
    unresolved,
  };
}

const publicRoutes = walk(appRoot).filter((path) =>
  !normalized(path).startsWith('src/app/admin/') &&
  /(?:^|\/)(?:page|layout|not-found|global-error|robots|sitemap)\.(?:tsx?|jsx?)$/.test(normalized(path)),
);
const publicRoots = new Set(publicRoutes);
const middlewarePath = join(root, 'src', 'middleware.ts');
if (existsSync(middlewarePath)) publicRoots.add(middlewarePath);
// These HTTP entrypoints serve the public Next runtime and its settings projection.
const publicApiRoots = [
  join(root, 'backend', 'src', 'public', 'public.controller.ts'),
  join(root, 'backend', 'src', 'settings', 'settings.controller.ts'),
];
for (const path of publicApiRoots) {
  if (existsSync(path)) publicRoots.add(path);
}

const adminRoot = join(appRoot, 'admin');
const adminPages = walk(adminRoot).filter((path) => /(?:^|\/)(?:page|layout)\.(?:tsx?|jsx?)$/.test(normalized(path)));
const adminRoots = new Set(adminPages);
const publicGraph = traceRuntimeGraph([...publicRoots], 'public-web-and-http-runtime');
const adminGraph = traceRuntimeGraph([...adminRoots], 'reachable-admin-runtime');

const contentFields = /^(?:title|titleLine[0-9]*|heroTitle|heroKicker|heroDescription|kicker|signature|tagline|motto|quote|quoteAuthor|copyrightText|description|descriptionText|body|summary|subtitle|excerpt|note|ctaLabel|ctaTarget|advisorName|advisorRole|zaloCtaLabel|phoneCtaLabel|phone|hotline|zaloUrl|email|address|mapUrl|facebook|instagram|youtube|tiktok)$/i;
const contactFields = /^(?:phone|hotline|zaloUrl|email|address|mapUrl|advisorName|advisorRole|advisorDescription|quickTitle|quickIntro|hoursTitle|weekdays|weekend)$/i;
const headerFields = /^(?:mottoLine[12]|ctaLabel|ctaTarget|name|shortName|tagline)$/i;
const footerFields = /^(?:quote|quoteAuthor|motto|copyrightText|phone|hotline|zaloUrl|email|address|mapUrl|facebook|instagram|youtube|tiktok)$/i;

function propertyName(node) {
  if (ts.isIdentifier(node)) return node.text;
  if (ts.isStringLiteralLike(node) || ts.isNumericLiteral(node)) return node.text;
  return '';
}

function literalText(node) {
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return null;
}

function hardcodedFieldLiterals(entry, fieldPattern) {
  const sourceFile = ts.createSourceFile(entry.relative, entry.source, ts.ScriptTarget.Latest, true, entry.relative.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const findings = [];
  const record = (node, field, value) => {
    if (!fieldPattern.test(field) || !value || !value.trim()) return;
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    findings.push({ file: entry.relative, line: line + 1, field, value: value.slice(0, 100) });
  };
  const visit = (node) => {
    if (ts.isPropertyAssignment(node)) {
      record(node, propertyName(node.name), literalText(node.initializer));
    } else if (ts.isJsxAttribute(node)) {
      record(node, propertyName(node.name), node.initializer && ts.isStringLiteralLike(node.initializer) ? node.initializer.text : null);
    } else if (ts.isBinaryExpression(node) &&
      (node.operatorToken.kind === ts.SyntaxKind.BarBarToken || node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) &&
      fieldPattern.test(node.left.getText(sourceFile))) {
      record(node, node.left.getText(sourceFile).split(/[.\[\]]/).filter(Boolean).at(-1) ?? '', literalText(node.right));
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return findings;
}

function hardcodedBusinessText(files, classPattern) {
  const findings = [];
  for (const file of files) {
    if (!/\.(?:tsx|jsx)$/.test(file.relative)) continue;
    const sourceFile = ts.createSourceFile(file.relative, file.source, ts.ScriptTarget.Latest, true, file.relative.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.JSX);
    const visit = (node, insideBusinessContent = false) => {
      let active = insideBusinessContent;
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
        const opening = ts.isJsxElement(node) ? node.openingElement : node;
        const classAttribute = opening.attributes.properties.find((attribute) =>
          ts.isJsxAttribute(attribute) && propertyName(attribute.name) === 'className',
        );
        const className = classAttribute && ts.isJsxAttribute(classAttribute) && classAttribute.initializer && ts.isStringLiteralLike(classAttribute.initializer)
          ? classAttribute.initializer.text
          : '';
        active ||= classPattern.test(className);
      }
      const text = ts.isJsxText(node)
        ? node.text.trim()
        : ts.isJsxExpression(node) && node.expression
          ? literalText(node.expression) ?? ''
          : '';
      if (active && /[\p{L}\p{N}]{2}/u.test(text)) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        findings.push({ file: file.relative, line: line + 1, value: text.slice(0, 100) });
      }
      ts.forEachChild(node, (child) => visit(child, active));
    };
    visit(sourceFile);
  }
  return findings;
}

function scope(graph, predicate) {
  return graph.files.filter((file) => predicate(file.relative));
}

const homeFiles = scope(publicGraph, (path) =>
  path === 'src/app/page.tsx' ||
  path.startsWith('src/components/home/') ||
  path === 'src/components/layout/PageShell.tsx' ||
  path === 'src/components/site/SiteDataProvider.tsx' ||
  path === 'src/config/site.ts' ||
  path === 'src/lib/public-content.ts',
);
const contactFiles = scope(publicGraph, (path) =>
  path === 'src/app/lien-he/page.tsx' ||
  path === 'src/components/home/PersonalContact.tsx' ||
  path === 'src/components/home/SiteFooter.tsx' ||
  path === 'src/components/stays/AdvisorCard.tsx',
);
const heroFiles = scope(publicGraph, (path) =>
  path === 'src/app/page.tsx' ||
  /(?:^|\/)[^/]*hero[^/]*\.(?:tsx?|jsx?)$/i.test(path) ||
  /(?:stays|destinations|combos)\/page\.tsx$/i.test(path),
);
const promoFiles = scope(publicGraph, (path) =>
  /(?:promo|personalcontact|advisorcard|experiencepromo)/i.test(path) ||
  path === 'src/app/page.tsx',
);
const headerFiles = scope(publicGraph, (path) =>
  path === 'src/components/home/SiteHeader.tsx' ||
  path === 'src/components/ui/BrandLogo.tsx',
);
const footerFiles = scope(publicGraph, (path) => path === 'src/components/home/SiteFooter.tsx');

const homepageContentClasses = /(?:^|\s)(?:hero__title|hero__kicker|hero__signature|hero__note|promo__title|promo__text|promo__quote|contact__title|contact__text|contact__sign|contact__note|home-faq)(?:\s|$)/;
const contactContentClasses = /(?:^|\s)(?:contact__(?:title|text|sign|note)|contact-advisor__?(?:image|title|description|note)?)(?:\s|$)/;
const heroContentClasses = /(?:^|\s)(?:hero__(?:title|kicker|signature|note|sub)|phero__(?:title|script|text))(?:\s|$)/;
const promoContentClasses = /(?:^|\s)(?:promo__(?:title|text|quote)|contact__(?:title|text|sign|note))(?:\s|$)/;
const footerContentClasses = /(?:^|\s)(?:footer__(?:quote|quote-by|motto|copy|contact)|footer__links)(?:\s|$)/;
const headerContentClasses = /(?:^|\s)(?:site-header__motto|brand-wordmark|brand__tagline)(?:\s|$)/;

const homepageHardcode = homeFiles.flatMap((file) => hardcodedFieldLiterals(file, contentFields))
  .concat(hardcodedBusinessText(homeFiles, homepageContentClasses));
const staticContact = contactFiles.flatMap((file) => hardcodedFieldLiterals(file, contactFields))
  .concat(hardcodedBusinessText(contactFiles, contactContentClasses));
const staticHero = heroFiles.flatMap((file) => hardcodedFieldLiterals(file, contentFields))
  .concat(hardcodedBusinessText(heroFiles, heroContentClasses));
const staticPromo = promoFiles.flatMap((file) => hardcodedFieldLiterals(file, contentFields))
  .concat(hardcodedBusinessText(promoFiles, promoContentClasses));
const staticFooter = footerFiles.flatMap((file) => hardcodedFieldLiterals(file, footerFields))
  .concat(hardcodedBusinessText(footerFiles, footerContentClasses));
const staticHeader = headerFiles.flatMap((file) => hardcodedFieldLiterals(file, headerFields))
  .concat(hardcodedBusinessText(headerFiles, headerContentClasses));

const fixtureImportEdges = publicGraph.edges.filter(({ to }) =>
  /^src\/data\/(?:admin|stays|combos|destinations|reviews|home-fixtures)(?:\/|\.|$)/i.test(to) ||
  /^backend\/src\/(?:fixtures?|demo|mock)(?:\/|\.|$)/i.test(to),
);
const fixtureTokens = publicGraph.files.flatMap((file) => {
  const lines = file.source.split(/\r?\n/);
  return lines.flatMap((line, index) => /\b(?:fixtureFallback|fallbackToDemo|mockData|demoData|fixture-data)\b/i.test(line)
    ? [{ file: file.relative, line: index + 1, excerpt: line.trim().slice(0, 160) }]
    : []);
});
const fixtureFallbackCount = fixtureImportEdges.length + fixtureTokens.length;

function jsxElements(graph, tagName) {
  const elements = [];
  for (const file of graph.files) {
    if (!/\.(?:tsx|jsx)$/.test(file.relative)) continue;
    const sourceFile = ts.createSourceFile(file.relative, file.source, ts.ScriptTarget.Latest, true, file.relative.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.JSX);
    const visit = (node) => {
      if (ts.isJsxElement(node) && propertyName(node.openingElement.tagName).toLowerCase() === tagName.toLowerCase()) {
        elements.push({ file, node, sourceFile });
      } else if (ts.isJsxSelfClosingElement(node) && propertyName(node.tagName).toLowerCase() === tagName.toLowerCase()) {
        elements.push({ file, node, sourceFile });
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  return elements;
}

const staticBusinessImages = jsxElements(publicGraph, 'Image').concat(jsxElements(publicGraph, 'img')).flatMap(({ file, node, sourceFile }) => {
  const opening = ts.isJsxElement(node) ? node.openingElement : node;
  const src = opening.attributes.properties.find((attribute) => ts.isJsxAttribute(attribute) && propertyName(attribute.name) === 'src');
  const value = src && ts.isJsxAttribute(src) && src.initializer && ts.isStringLiteralLike(src.initializer) ? src.initializer.text : null;
  if (!value || !/\.(?:jpe?g|png|webp|avif|gif)(?:[?#].*)?$/i.test(value)) return [];
  const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return [{ file: file.relative, line: line + 1, src: value }];
});

function jsxTextAttributes(element) {
  const opening = ts.isJsxElement(element.node) ? element.node.openingElement : element.node;
  const values = {};
  for (const attribute of opening.attributes.properties) {
    if (!ts.isJsxAttribute(attribute)) continue;
    const value = attribute.initializer && ts.isStringLiteralLike(attribute.initializer) ? attribute.initializer.text : '';
    values[propertyName(attribute.name).toLowerCase()] = value;
  }
  return values;
}

function textareaEvidence(graph, predicate) {
  return jsxElements(graph, 'textarea').flatMap((element) => {
    const attrs = jsxTextAttributes(element);
    const snippet = element.node.getText(element.sourceFile).slice(0, 1600);
    const { line } = element.sourceFile.getLineAndCharacterOfPosition(element.node.getStart(element.sourceFile));
    return predicate(element, attrs, snippet) ? [{ file: element.file.relative, line: line + 1, excerpt: snippet.replace(/\s+/g, ' ').slice(0, 220) }] : [];
  });
}

const rawJsonTextareas = textareaEvidence(adminGraph, (_element, attrs, snippet) =>
  /json/i.test([attrs['aria-label'], attrs.placeholder, snippet].join(' ')) ||
  /JSON\s*\.\s*stringify/.test(snippet),
);
const rawJsonEditors = rawJsonTextareas.concat(jsxElements(adminGraph, 'pre').flatMap((element) => {
  const snippet = element.node.getText(element.sourceFile);
  if (!/JSON\s*\.\s*stringify|raw\s+json|JSON editor/i.test(snippet)) return [];
  const { line } = element.sourceFile.getLineAndCharacterOfPosition(element.node.getStart(element.sourceFile));
  return [{ file: element.file.relative, line: line + 1, excerpt: snippet.slice(0, 180) }];
}));

const imageUrlInputs = jsxElements(adminGraph, 'input').flatMap((element) => {
  const attrs = jsxTextAttributes(element);
  const text = [attrs['aria-label'], attrs.placeholder, attrs.name, element.node.getText(element.sourceFile)].join(' ');
  const type = (attrs.type ?? '').toLowerCase();
  const imageNamed = /image|ảnh|cover|hero|hình/i.test(text);
  const urlBound = type === 'url' || /(?:image|cover|hero|imageUrl|ảnh).{0,60}(?:url|href|https?:\/\/)/i.test(text);
  if (!imageNamed || !urlBound || type === 'file') return [];
  const { line } = element.sourceFile.getLineAndCharacterOfPosition(element.node.getStart(element.sourceFile));
  return [{ file: element.file.relative, line: line + 1, excerpt: text.trim().slice(0, 200) }];
});

const longPlainTextareas = textareaEvidence(adminGraph, (element, attrs, snippet) => {
  const text = [attrs['aria-label'], attrs.placeholder, snippet].join(' ').toLocaleLowerCase('vi-VN');
  const isLongEditorial = /nội dung chi tiết|nội dung bài|câu trả lời|mô tả chi tiết|article body|long-form|rich content/.test(text);
  const isShortMetadata = /seo|meta description|mô tả ngắn|tóm tắt|caption|chú thích|ghi chú|tin nhắn|thông báo/.test(text);
  return isLongEditorial && !isShortMetadata;
});
const richFieldMeta = scope(adminGraph, (path) => path.endsWith('/SettingsFormEditor.tsx'))
  .flatMap((file) => {
    const sourceFile = ts.createSourceFile(file.relative, file.source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const findings = [];
    const visit = (node) => {
      if (ts.isPropertyAssignment(node) && ts.isStringLiteralLike(node.name) &&
        /(?:^|\.)(?:body|content|description|answer)$/i.test(node.name.text) &&
        ts.isObjectLiteralExpression(node.initializer)) {
        const kind = node.initializer.properties.find((item) =>
          ts.isPropertyAssignment(item) && propertyName(item.name) === 'kind',
        );
        if (kind && ts.isPropertyAssignment(kind) && literalText(kind.initializer) === 'textarea') {
          const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
          findings.push({ file: file.relative, line: line + 1, key: node.name.text });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    return findings;
  });
const longTextareaFindings = longPlainTextareas.concat(richFieldMeta);

const metrics = {
  HOMEPAGE_HARDCODE_BUSINESS_CONTENT: homepageHardcode.length,
  STATIC_CONTACT_CONTENT: staticContact.length,
  STATIC_HERO_CONTENT: staticHero.length,
  STATIC_PROMO_CONTENT: staticPromo.length,
  STATIC_FOOTER_BUSINESS_CONTENT: staticFooter.length,
  STATIC_HEADER_BUSINESS_CONTENT: staticHeader.length,
  RUNTIME_FIXTURE_FALLBACK_COUNT: fixtureFallbackCount,
  PUBLIC_BUSINESS_IMAGE_HARDCODE_COUNT: staticBusinessImages.length,
  RAW_JSON_EDITOR_COUNT: rawJsonEditors.length,
  RAW_JSON_TEXTAREA_COUNT: rawJsonTextareas.length,
  IMAGE_URL_MANUAL_INPUT_COUNT: imageUrlInputs.length,
  LONG_CONTENT_WITH_PLAIN_TEXTAREA_COUNT: longTextareaFindings.length,
};
const evidence = {
  HOMEPAGE_HARDCODE_BUSINESS_CONTENT: homepageHardcode,
  STATIC_CONTACT_CONTENT: staticContact,
  STATIC_HERO_CONTENT: staticHero,
  STATIC_PROMO_CONTENT: staticPromo,
  STATIC_FOOTER_BUSINESS_CONTENT: staticFooter,
  STATIC_HEADER_BUSINESS_CONTENT: staticHeader,
  RUNTIME_FIXTURE_FALLBACK_COUNT: { imports: fixtureImportEdges, tokens: fixtureTokens },
  PUBLIC_BUSINESS_IMAGE_HARDCODE_COUNT: staticBusinessImages,
  RAW_JSON_EDITOR_COUNT: rawJsonEditors,
  RAW_JSON_TEXTAREA_COUNT: rawJsonTextareas,
  IMAGE_URL_MANUAL_INPUT_COUNT: imageUrlInputs,
  LONG_CONTENT_WITH_PLAIN_TEXTAREA_COUNT: longTextareaFindings,
};

console.log('PUBLIC_RUNTIME_GRAPH');
console.log('  frontend public route entries: ' + publicRoutes.length);
console.log('  frontend + public API reachable modules: ' + publicGraph.files.length);
console.log('  admin route entries: ' + adminPages.length);
console.log('  admin reachable modules: ' + adminGraph.files.length);
console.log('  unresolved public imports: ' + publicGraph.unresolved.length);
console.log('  unresolved admin imports: ' + adminGraph.unresolved.length);
for (const [name, count] of Object.entries(metrics)) console.log(name + '=' + count);

if (!publicRoutes.length || !adminPages.length || Object.values(metrics).some((value) => value !== 0) || publicGraph.unresolved.length || adminGraph.unresolved.length) {
  console.error(JSON.stringify({ evidence, unresolvedPublicImports: publicGraph.unresolved, unresolvedAdminImports: adminGraph.unresolved }, null, 2));
  process.exitCode = 1;
}
