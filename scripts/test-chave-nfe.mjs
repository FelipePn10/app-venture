// A chave de acesso digitada à mão: dígito verificador e coerência com a nota.
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const js = ts.transpileModule(readFileSync("src/utils/chaveNFe.ts", "utf8"), { compilerOptions: { module: "ESNext", target: "ES2020" } }).outputText;
const dir = mkdtempSync(join(tmpdir(), "chave-")); const arq = join(dir, "c.mjs"); writeFileSync(arq, js);
const { chaveValida, lerChaveNFe, divergenciaDaChave } = await import(arq);

const boa = "41261012345678000190550010000123451000123450";
assert.equal(chaveValida(boa), true);
assert.equal(chaveValida(boa.slice(0, 43) + "9"), false);
assert.equal(chaveValida("123"), false);
assert.deepEqual(lerChaveNFe(boa), { uf: "PR", anoMes: "2610", cnpj: "12345678000190", modelo: "55", serie: "1", numero: 12345 });
const nota = { cnpj: "12345678000190", numero: 12345, serie: "1", modelo: "55", uf: "PR", emissao: "2026-10-05" };
assert.equal(divergenciaDaChave(boa, nota), "");
for (const [mudanca, trecho] of [[{ cnpj: "11444777000161" }, "outro CNPJ"], [{ numero: 9 }, "da nota 12345"], [{ serie: "2" }, "série 1"], [{ modelo: "01" }, "modelo 55"], [{ uf: "SP" }, "de PR"], [{ emissao: "2026-09-30" }, "10/2026"]]) {
  assert.match(divergenciaDaChave(boa, { ...nota, ...mudanca }), new RegExp(trecho));
}
assert.match(divergenciaDaChave(boa.slice(0, 43) + "9", nota), /último dígito/);
assert.match(divergenciaDaChave("123", nota), /44 dígitos/);
console.log("chave de acesso: ok");
