// Lädt eine der Spieldateien (klassisches Skript ohne import/export) in eine eigene Umgebung
// und gibt die darin angelegten Namen zurück. So brauchen die Tests weder Build noch Bibliothek.
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";

export function loadScript(file, names) {
  const context = createContext({});
  const code = readFileSync(new URL("../" + file, import.meta.url), "utf8");
  // const und function auf oberster Ebene landen nicht von selbst im Kontext, darum
  // werden die gewünschten Namen am Ende ausdrücklich übergeben.
  const handOver = names.map((name) => "this." + name + " = " + name + ";").join("\n");
  runInContext(code + "\n" + handOver, context);
  // Listen aus der fremden Umgebung haben ein anderes Array-Vorbild; assert.deepEqual hielte
  // selbst zwei leere Listen dann für verschieden. Darum als einfache Kopie zurückgeben.
  const result = {};
  for (const name of names) {
    if (Array.isArray(context[name])) {
      result[name] = Array.from(context[name]);
    } else {
      result[name] = context[name];
    }
  }
  return result;
}
