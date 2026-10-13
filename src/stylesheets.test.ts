import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * Two silent failures of the CSS toolchain (lightningcss):
 *
 * - CSS Modules rename every animation name in a module, so naming a keyframe
 *   from globals.css compiles to a name that matches nothing: no error, just
 *   no animation. Modules define their own keyframes or reach shared ones
 *   through var(--kf-*).
 * - When a standard property comes before its -webkit- twin, only the
 *   prefixed copy survives the build, and Chrome and Firefox ignore it
 *   (this left the frosted nav unblurred). Prefixed copies go first.
 */

const SRC = join(process.cwd(), 'src');

const KEYWORDS = new Set([
  'none',
  'infinite',
  'auto',
  'normal',
  'reverse',
  'alternate',
  'alternate-reverse',
  'forwards',
  'backwards',
  'both',
  'running',
  'paused',
  'linear',
  'ease',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'step-start',
  'step-end',
  'initial',
  'inherit',
  'unset',
  'revert',
  'revert-layer',
]);

function cssFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return cssFiles(path);
    return entry.name.endsWith('.css') ? [path] : [];
  });
}

const read = (path: string) => readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const keyframesIn = (css: string) => new Set([...css.matchAll(/@keyframes\s+([\w-]+)/g)].map(match => match[1]));
const animationsIn = (css: string) =>
  [...css.matchAll(/(?<![\w-])animation(?:-name)?\s*:\s*([^;}]+)/g)].map(match => match[1]);

/** Keyframe names a value refers to directly (not through var()). */
function animationNames(value: string) {
  let flat = value;
  while (/\(/.test(flat)) flat = flat.replace(/[\w-]*\([^()]*\)/g, ' ');
  return flat.split(/[\s,]+/).filter(token => token && !KEYWORDS.has(token) && !/^[-+.\d]/.test(token));
}

const globals = read(join(SRC, 'app/globals.css'));
const globalKeyframes = keyframesIn(globals);
const shared = new Map([...globals.matchAll(/(--kf-[\w-]+)\s*:\s*([\w-]+)/g)].map(match => [match[1], match[2]]));
const sheets = cssFiles(SRC).map(path => ({ name: relative(SRC, path), css: read(path) }));
const modules = sheets.filter(({ name }) => name.endsWith('.module.css'));

/** Standard properties declared before their -webkit- twin in the same block. */
function prefixAfterStandard(css: string) {
  return [...css.matchAll(/\{([^{}]*)\}/g)].flatMap(([, block]) => {
    const props = [...block.matchAll(/(?:^|;)\s*([-\w]+)\s*:/g)].map(match => match[1]);
    return props.filter(
      (prop, i) => prop.startsWith('-webkit-') && props.slice(0, i).includes(prop.slice('-webkit-'.length))
    );
  });
}

describe('animation names', () => {
  it.each([
    ['spin 700ms linear infinite', ['spin']],
    ['var(--kf-spin) 700ms linear infinite', []],
    ['marquee var(--marquee-duration, 80s) linear infinite', ['marquee']],
    ['.7s cubic-bezier(0.2, 0, 0, 1) both fade, 1s rise', ['fade', 'rise']],
  ])('are read from %s', (value, names) => {
    expect(animationNames(value)).toEqual(names);
  });
});

describe('CSS module animations', () => {
  it('are found', () => {
    expect(modules.flatMap(({ css }) => animationsIn(css)).length).toBeGreaterThan(10);
  });

  it('only name keyframes defined in the same module', () => {
    const broken = modules.flatMap(({ name, css }) => {
      const local = keyframesIn(css);
      return animationsIn(css)
        .flatMap(animationNames)
        .filter(keyframe => !local.has(keyframe))
        .map(keyframe => `${name}: ${keyframe}`);
    });
    expect(broken).toEqual([]);
  });

  it('reach shared keyframes through variables that exist', () => {
    const broken = modules.flatMap(({ name, css }) =>
      animationsIn(css)
        .flatMap(value => [...value.matchAll(/var\((--kf-[\w-]+)\)/g)].map(match => match[1]))
        .filter(variable => !globalKeyframes.has(shared.get(variable) ?? ''))
        .map(variable => `${name}: ${variable}`)
    );
    expect(broken).toEqual([]);
  });
});

describe('vendor prefixes', () => {
  it('are caught when they follow the standard property', () => {
    expect(prefixAfterStandard('.a { backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); }')).toEqual([
      '-webkit-backdrop-filter',
    ]);
    expect(prefixAfterStandard('.a { -webkit-mask: none; mask: none; }')).toEqual([]);
  });

  it('come before the standard property', () => {
    const broken = sheets.flatMap(({ name, css }) => prefixAfterStandard(css).map(prop => `${name}: ${prop}`));
    expect(broken).toEqual([]);
  });
});
