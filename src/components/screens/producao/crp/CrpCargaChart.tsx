import { useMemo, useState } from "react";
import type { CrpEntry } from "@/services/crpService";
import { EntityName } from "@/components/ui/EntityName";
import { loadWorkCenters } from "@/services/lookups";

/**
 * Carga × capacidade por centro de trabalho, um gráfico por centro.
 *
 * A grade do CRP responde "quanto" mas não "quando aperta": para achar o dia
 * que estoura era preciso ler linha a linha e comparar dois números de cabeça.
 * Aqui a altura da barra é a carga, a linha tracejada é a capacidade, e o dia
 * que passa dela salta sem depender de cor — que é o que permite ler isto
 * impresso em preto e branco ou com daltonismo.
 *
 * O encaixe: **altura da barra** (posição) é a codificação principal; a cor é
 * reforço, e vem acompanhada de hachura e do número escrito na barra que
 * estoura. Verde-e-vermelho foi descartado de propósito — é justamente o par
 * que some no daltonismo mais comum.
 */
type Props = { rows: CrpEntry[] };

/**
 * Rotula só os PICOS de cada sequência de dias estourados.
 *
 * Numerar todos os dias de uma sequência empilha "152 158 147" um sobre o
 * outro e nenhum fica legível. O pico é o número que interessa — é ele que diz
 * o tamanho do problema; os vizinhos continuam identificados pela hachura.
 */
function picosRotulaveis(dias: CrpEntry[]): Set<string> {
  const rotular = new Set<string>();
  let i = 0;
  while (i < dias.length) {
    if (!dias[i].is_overloaded) { i += 1; continue; }
    let fim = i;
    while (fim + 1 < dias.length && dias[fim + 1].is_overloaded) fim += 1;
    let pico = i;
    for (let j = i; j <= fim; j += 1) if ((dias[j].load_pct || 0) > (dias[pico].load_pct || 0)) pico = j;
    rotular.add(dias[pico].req_date);
    i = fim + 1;
  }
  return rotular;
}

/** Teal e vermelho: par validado para visão normal e para os três tipos de daltonismo. */
const COR_NORMAL = "#0d7d9e";
const COR_ESTOURO = "#b4302c";

const ALTURA = 124;
const TOPO = 20;
const BASE = ALTURA - 22;
const ESPACO = 4;
/** Sobra em cada ponta para o primeiro e o último rótulo de dia não serem cortados. */
const MARGEM = 18;
const BARRA_MIN = 14;
const BARRA_MAX = 34;
/** Largura útil típica do painel; poucos dias espalham, muitos rolam. */
const LARGURA_ALVO = 980;

const numero = (n: number, casas = 1) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: casas });

const diaCurto = (iso: string) => {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso.slice(5, 10) : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

export function CrpCargaChart({ rows }: Props): JSX.Element {
  const [foco, setFoco] = useState<{ centro: number; dia: string; x: number } | null>(null);

  /** Um bloco por centro, dias em ordem cronológica. */
  const centros = useMemo(() => {
    const porCentro = new Map<number, CrpEntry[]>();
    for (const linha of rows) {
      if (!linha.req_date) continue;
      const atual = porCentro.get(linha.work_center_id) ?? [];
      atual.push(linha);
      porCentro.set(linha.work_center_id, atual);
    }
    return [...porCentro.entries()]
      .map(([id, dias]) => {
        const ordenados = [...dias].sort((a, b) => a.req_date.localeCompare(b.req_date));
        const pico = Math.max(...ordenados.map((d) => d.load_pct || 0), 0);
        return { id, dias: ordenados, pico, estouros: ordenados.filter((d) => d.is_overloaded).length };
      })
      // O centro que estoura primeiro é o que decide a semana: vai no topo.
      .sort((a, b) => b.estouros - a.estouros || b.pico - a.pico || a.id - b.id);
  }, [rows]);

  if (centros.length === 0) {
    return <div className="erp-grid-empty">Calcule um plano para ver a carga por centro.</div>;
  }

  return (
    <div className="crp-carga">
      <div className="crp-legenda">
        <span><i style={{ background: COR_NORMAL }} />Dentro da capacidade</span>
        <span><i className="hachurada" style={{ background: COR_ESTOURO }} />Acima da capacidade</span>
        <span><i className="linha" />Capacidade do dia (100%)</span>
      </div>

      {centros.map((centro) => {
        // A escala vai até o pico, com 120% de piso: sem isso, um centro que
        // nunca passa de 40% desenha barras gigantes e parece sobrecarregado.
        const teto = Math.max(120, Math.ceil(centro.pico / 10) * 10);
        // Poucos dias espalham pela largura do painel; muitos mantêm a barra
        // legível e o bloco rola na horizontal. Barra fina de mais vira risco.
        const barra = Math.min(BARRA_MAX, Math.max(BARRA_MIN,
          Math.floor((LARGURA_ALVO - MARGEM * 2) / Math.max(centro.dias.length, 1)) - ESPACO));
        const largura = centro.dias.length * (barra + ESPACO) + MARGEM * 2;
        const y = (pct: number) => BASE - (Math.min(pct, teto) / teto) * (BASE - TOPO);
        // Com muitos dias, rotular todos vira borrão: um a cada N.
        const passo = Math.ceil(centro.dias.length / 14);
        const rotulados = picosRotulaveis(centro.dias);

        return (
          <figure className="crp-centro" key={centro.id}>
            <figcaption>
              <strong><EntityName code={centro.id} loader={loadWorkCenters} prefix="Centro" showCode={false} /></strong>
              <span className="crp-pico">pico {numero(centro.pico, 0)}%</span>
              {centro.estouros > 0 && (
                <span className="erp-badge err">{centro.estouros} dia(s) acima da capacidade</span>
              )}
              {/* Leitor do dia apontado. Fica aqui, e não sobre o gráfico, porque
                  uma caixa flutuante cobre justamente as barras vizinhas — que é
                  o que se estava comparando quando se foi olhar o número. */}
              <span className="crp-leitor">{(() => {
                if (foco?.centro !== centro.id) return "aponte um dia para ver as horas";
                const dia = centro.dias.find((d) => d.req_date === foco.dia);
                if (!dia) return "";
                const folga = dia.available_hours - dia.required_hours;
                return `${diaCurto(dia.req_date)} · ${numero(dia.required_hours, 2)} h de ${numero(dia.available_hours, 2)} h · ${numero(dia.load_pct, 1)}% · ${
                  folga < 0 ? `faltam ${numero(-folga, 2)} h` : `sobram ${numero(folga, 2)} h`}`;
              })()}</span>
            </figcaption>

            <div className="crp-rolagem">
              <svg width={largura} height={ALTURA} role="img"
                aria-label={`Carga diária do centro ${centro.id}; pico de ${numero(centro.pico, 0)} por cento`}>
                {/* Grade recessiva: só 50% e a capacidade. */}
                <line x1={0} x2={largura} y1={y(50)} y2={y(50)} className="crp-grade" />
                <line x1={0} x2={largura} y1={y(100)} y2={y(100)} className="crp-capacidade" />
                <text x={2} y={y(100) - 3} className="crp-marca">capacidade</text>

                {centro.dias.map((dia, i) => {
                  const x = MARGEM + i * (barra + ESPACO);
                  const pct = dia.load_pct || 0;
                  const topo = y(pct);
                  const altura = Math.max(2, BASE - topo);
                  const ativo = foco?.centro === centro.id && foco?.dia === dia.req_date;
                  return (
                    <g key={dia.req_date}
                      onMouseEnter={() => setFoco({ centro: centro.id, dia: dia.req_date, x })}
                      onMouseLeave={() => setFoco(null)}>
                      {/* Alvo de mouse maior que a barra: 14px é pouco para a mão. */}
                      <rect x={x - ESPACO / 2} y={TOPO - 12} width={barra + ESPACO} height={BASE - TOPO + 20} fill="transparent" />
                      <rect x={x} y={topo} width={barra} height={altura} rx={4}
                        fill={dia.is_overloaded ? COR_ESTOURO : COR_NORMAL}
                        opacity={ativo ? 1 : 0.92}
                        stroke={ativo ? "var(--v-ink)" : "none"} strokeWidth={ativo ? 2 : 0} />
                      {dia.is_overloaded && (
                        <rect x={x} y={topo} width={barra} height={altura} rx={4} fill="url(#crp-hachura)" />
                      )}
                      {rotulados.has(dia.req_date) && (
                        <text x={x + barra / 2} y={topo - 5} className="crp-valor">{numero(pct, 0)}%</text>
                      )}
                      {i % passo === 0 && (
                        <text x={x + barra / 2} y={ALTURA - 6} className="crp-dia">{diaCurto(dia.req_date)}</text>
                      )}
                    </g>
                  );
                })}

                <defs>
                  {/* Hachura: o dia que estoura continua identificável impresso
                      em preto e branco e para quem não distingue as cores. */}
                  <pattern id="crp-hachura" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <line x1="0" y1="0" x2="0" y2="6" stroke="#ffffff" strokeWidth="2" opacity="0.55" />
                  </pattern>
                </defs>
              </svg>
            </div>

          </figure>
        );
      })}
    </div>
  );
}
