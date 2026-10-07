// Arquivo da EFD: conversão para Latin-1 e competência padrão.
import { paraLatin1, competenciaAnterior, cpfValido } from '../src/components/screens/fiscal/spedArquivo.ts';

const falhar = (m) => { throw new Error(m); };

const b = paraLatin1('|0000|ÇÃO é ü|\r\n');
const esperado = [0x7c, 0x30, 0x30, 0x30, 0x30, 0x7c, 0xc7, 0xc3, 0x4f, 0x20, 0xe9, 0x20, 0xfc, 0x7c, 0x0d, 0x0a];
if (b.length !== esperado.length || esperado.some((v, i) => b[i] !== v)) falhar(`Latin-1: ${[...b].map((x) => x.toString(16))}`);
// Fora do Latin-1 (aspas tipográficas, emoji com par substituto) vira um único "?".
const fora = paraLatin1('“a”😀');
if ([...fora].join() !== '63,97,63,63') falhar(`fora do Latin-1: ${[...fora]}`);

const jan = competenciaAnterior(new Date(2026, 0, 15));
if (jan.ano !== 2025 || jan.mes !== 12) falhar(`janeiro → ${JSON.stringify(jan)}`);
const out = competenciaAnterior(new Date(2026, 9, 6));
if (out.ano !== 2026 || out.mes !== 9) falhar(`outubro → ${JSON.stringify(out)}`);

if (!cpfValido('111.222.333-44') || cpfValido('123')) falhar('CPF');
console.log('ok — sped efd');
