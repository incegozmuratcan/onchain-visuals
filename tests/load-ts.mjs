import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
export async function importTs(path) {
  const abs = new URL(path, import.meta.url);
  const source = await readFile(abs, 'utf8');
  const js = ts.transpileModule(source, { fileName: abs.pathname, compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
  const dataUrl = `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`;
  return import(dataUrl);
}
export function fileUrl(path) { return pathToFileURL(new URL(path, import.meta.url).pathname).href; }
