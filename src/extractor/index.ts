import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { relativePath } from '../utils/path';
import { Module } from './module';
import * as webpack from './webpack';

export function extractBundle(ast: t.Node): Bundle | undefined {
  return webpack.extract(ast);
}

export class Bundle {
  constructor(
    public type: 'webpack',
    public entryId: number,
    public modules: Map<number, Module>
  ) {}

  applyMappings(mappings: Record<string, m.Matcher<any>>) {
    const unusedMappings = new Set(Object.keys(mappings));

    for (const module of this.modules.values()) {
      traverse(module.ast, {
        enter(path) {
          for (const [name, matcher] of Object.entries(mappings)) {
            if (matcher.match(path.node)) {
              if (unusedMappings.has(name)) {
                unusedMappings.delete(name);
              } else {
                console.warn(`Mapping ${name} is already used.`);
                continue;
              }
              module.path = name;
              path.stop();
              break;
            }
          }
        },
        noScope: true,
      });
    }

    if (unusedMappings.size > 0) {
      console.warn(
        `Unused mappings: ${Array.from(unusedMappings).join(', ')}.`
      );
    }
  }

  /**
   * Saves each module to a file and the bundle metadata to a JSON file.
   * @param path Output directory
   */
  async save(
    path: string,
    transformCode = (code: string): Promise<string> | string => code,
    mappings: (
      m: typeof import('@codemod/matchers')
    ) => Record<string, m.Matcher<any>> = m => ({})
  ) {
    this.applyMappings(mappings(m));
    this.replaceRequireCalls();

    const bundleJson = {
      type: this.type,
      entryId: this.entryId,
      modules: Array.from(this.modules.values(), module => ({
        id: module.id,
        path: module.path,
      })),
    };

    await mkdir(path, { recursive: true });

    await writeFile(
      join(path, 'bundle.json'),
      JSON.stringify(bundleJson, null, 2),
      'utf8'
    );

    await Promise.all(
      Array.from(this.modules.values(), async module => {
        const modulePath = join(path, module.path);
        const code = await transformCode(module.code);
        await mkdir(dirname(modulePath), { recursive: true });
        await writeFile(modulePath, code, 'utf8');
      })
    );
  }

  /**
   * Replaces `require(id)` calls with `require("./relative/path.js")` calls.
   */
  replaceRequireCalls() {
    const idMatcher = m.capture(m.numericLiteral());
    const matcher = m.callExpression(m.identifier('require'), [idMatcher]);

    this.modules.forEach(module => {
      traverse(module.ast, {
        enter: path => {
          if (matcher.match(path.node)) {
            const requiredModule = this.modules.get(idMatcher.current!.value);
            if (requiredModule) {
              const [arg] = path.get('arguments') as NodePath<t.Identifier>[];
              arg.replaceWith(
                t.stringLiteral(relativePath(module.path, requiredModule.path))
              );
            }
          }
        },
        noScope: true,
      });
    });
  }
}
