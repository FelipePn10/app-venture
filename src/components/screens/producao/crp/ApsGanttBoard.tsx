import { useMemo, useState } from "react";
import type { GanttBoard } from "@/services/apsService";

/**
 * Quadro do APS desenhado como linha do tempo.
 *
 * A tela mostrava só a grade de barras: para saber se duas ordens brigavam pelo
 * mesmo centro no mesmo dia era preciso comparar datas de cabeça, linha a
 * linha. Aqui a posição horizontal é a data e a linha é o recurso — a colisão
 * e o buraco de agenda aparecem sem ninguém procurar.
 *
 * Mesmo par de cores do gráfico de carga (VPRO0200), validado para visão normal
 * e para os três tipos de daltonismo. A barra atrasada ainda ganha hachura e a
 * palavra "atrasada", porque cor sozinha não informa.
 */
type Props = { board: GanttBoard };

const COR_BARRA = "#0d7d9e";
const COR_ATRASO = "#b4302c";

const ALTURA_LINHA = 30;
const ALTURA_BARRA = 18;
const LARGURA_ROTULO = 178;
const LARGURA_DIA_MIN = 26;
const LARGURA_DIA_MAX = 64;
const LARGURA_ALVO = 1000;
const TOPO_EIXO = 22;
/** Largura média de um caractere do rótulo da barra (10px, semibold). */
const LARGURA_CARACTERE = 5.9;

const diaCurto = (iso: string) => {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso.slice(5, 10) : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};
const dataHora = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};

export function ApsGanttBoard({ board }: Props): JSX.Element {
  const [foco, setFoco] = useState<string | null>(null);

  const dias = useMemo(() => board.days ?? [], [board.days]);
  const larguraDia = Math.min(LARGURA_DIA_MAX, Math.max(LARGURA_DIA_MIN,
    Math.floor((LARGURA_ALVO - LARGURA_ROTULO) / Math.max(dias.length, 1))));

  /** Posição em pixels de um instante, a partir do primeiro dia do quadro. */
  const escala = useMemo(() => {
    if (!dias.length) return null;
    const inicio = new Date(`${dias[0].date.slice(0, 10)}T00:00:00`).getTime();
    const fim = new Date(`${dias[dias.length - 1].date.slice(0, 10)}T00:00:00`).getTime() + 86400000;
    const total = Math.max(fim - inicio, 1);
    const largura = dias.length * larguraDia;
    return {
      inicio, largura,
      x: (iso: string) => {
        const t = new Date(iso).getTime();
        if (Number.isNaN(t)) return 0;
        return ((Math.min(Math.max(t, inicio), fim) - inicio) / total) * largura;
      },
    };
  }, [dias, larguraDia]);

  if (!escala || !board.rows.length) {
    return <div className="erp-grid-empty">Sequencie o APS e clique em <strong>Ver quadro</strong> para desenhar a linha do tempo.</div>;
  }

  const altura = TOPO_EIXO + board.rows.length * ALTURA_LINHA + 6;
  const passoRotulo = Math.ceil(dias.length / 16);
  const barraEmFoco = foco
    ? board.rows.flatMap((r) => r.bars).find((b) => `${b.sequence_id ?? b.label}-${b.start}` === foco)
    : undefined;

  return (
    <div className="aps-gantt">
      <div className="aps-legenda">
        <span><i style={{ background: COR_BARRA }} />No prazo</span>
        <span><i className="hachurada" style={{ background: COR_ATRASO }} />Atrasada</span>
        <span><i className="folga" />Dia sem expediente</span>
        <span><i className="hoje" />Hoje</span>
        <span className="aps-leitor">
          {barraEmFoco
            ? `${barraEmFoco.label} · ${dataHora(barraEmFoco.start)} → ${dataHora(barraEmFoco.end)}${
                barraEmFoco.percent_done ? ` · ${Math.round(barraEmFoco.percent_done)}% feito` : ""}${
                barraEmFoco.is_late ? " · atrasada" : ""}`
            : "aponte uma barra para ver as datas"}
        </span>
      </div>

      <div className="aps-rolagem">
        <svg width={LARGURA_ROTULO + escala.largura} height={altura} role="img"
          aria-label={`Quadro do APS com ${board.rows.length} recurso(s) e ${dias.length} dia(s)`}>
          {/* Fundo: fim de semana e parada entram recessivos, como ausência. */}
          {dias.map((dia, i) => (
            <g key={dia.date}>
              {!dia.is_working && (
                <rect x={LARGURA_ROTULO + i * larguraDia} y={TOPO_EIXO - 4} width={larguraDia} height={altura - TOPO_EIXO}
                  className="aps-folga" />
              )}
              {i % passoRotulo === 0 && (
                <text x={LARGURA_ROTULO + i * larguraDia + larguraDia / 2} y={13} className="aps-dia">{diaCurto(dia.date)}</text>
              )}
              {dia.is_today && (
                <line x1={LARGURA_ROTULO + i * larguraDia} x2={LARGURA_ROTULO + i * larguraDia}
                  y1={TOPO_EIXO - 6} y2={altura} className="aps-hoje" />
              )}
            </g>
          ))}

          {board.rows.map((row, linha) => {
            const y = TOPO_EIXO + linha * ALTURA_LINHA;
            return (
              <g key={row.key}>
                <line x1={0} x2={LARGURA_ROTULO + escala.largura} y1={y} y2={y} className="aps-separador" />
                <text x={8} y={y + ALTURA_LINHA / 2 + 4} className="aps-rotulo">{row.label}</text>
                {row.bars.map((bar) => {
                  const id = `${bar.sequence_id ?? bar.label}-${bar.start}`;
                  const x = LARGURA_ROTULO + escala.x(bar.start);
                  const largura = Math.max(6, LARGURA_ROTULO + escala.x(bar.end) - x - 2);
                  const topo = y + (ALTURA_LINHA - ALTURA_BARRA) / 2;
                  const ativo = foco === id;
                  const feito = Math.max(0, Math.min(100, bar.percent_done ?? 0)) / 100;
                  return (
                    <g key={id} onMouseEnter={() => setFoco(id)} onMouseLeave={() => setFoco(null)}>
                      <rect x={x} y={topo} width={largura} height={ALTURA_BARRA} rx={4}
                        fill={bar.is_late ? COR_ATRASO : COR_BARRA} opacity={ativo ? 1 : 0.92}
                        stroke={ativo ? "var(--v-ink)" : "#ffffff"} strokeWidth={2} />
                      {bar.is_late && (
                        <rect x={x} y={topo} width={largura} height={ALTURA_BARRA} rx={4} fill="url(#aps-hachura)" />
                      )}
                      {/* O quanto já foi apontado, em cima da própria barra. */}
                      {feito > 0 && (
                        <rect x={x + 2} y={topo + ALTURA_BARRA - 5} width={Math.max(2, (largura - 4) * feito)} height={3} rx={1.5}
                          className="aps-feito" />
                      )}
                      {/* O rótulo só entra quando cabe no tamanho natural.
                          Espremer a fonte para caber (textLength) deixa o texto
                          ilegível justamente na barra curta — e sobre a hachura
                          da barra atrasada, pior ainda. Não coube, o nome está
                          no leitor do cabeçalho e na grade abaixo. */}
                      {largura - 12 > bar.label.length * LARGURA_CARACTERE && (
                        <text x={x + 6} y={topo + ALTURA_BARRA / 2 + 4} className="aps-barra-rotulo">
                          {bar.label}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}

          <defs>
            <pattern id="aps-hachura" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke="#ffffff" strokeWidth="2" opacity="0.55" />
            </pattern>
          </defs>
        </svg>
      </div>
    </div>
  );
}
