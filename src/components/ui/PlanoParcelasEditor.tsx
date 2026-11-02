import { useEffect, useMemo, useRef } from "react";
import { LookupField } from "@/components/ui/LookupField";
import { loadPaymentConditions } from "@/services/lookups";
import { listPaymentConditionInstallments } from "@/services/customerService";
import { errMessage } from "@/services/fiscalShared";
import {
  type BlocoPlano, type ModoBloco, calcularPlano, dataMaisDias, novoBloco, planoDaCondicao,
  planoEntradaMaisParcelas, planoParcelasIguais, planoParcelasMaisFinal,
} from "@/utils/planoParcelas";

const moeda = (cent: number) => (cent / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dataBR = (iso: string) => iso.split("-").reverse().join("/");

const MODOS: Array<{ value: ModoBloco; label: string }> = [
  { value: "percentual", label: "% do total" },
  { value: "valor", label: "Valor (R$)" },
  { value: "restante", label: "Restante" },
];

interface Props {
  totalCent: number;
  /** Data de onde os dias contam (normalmente a emissão). */
  dataBase: string;
  blocos: BlocoPlano[];
  onBlocos: (b: BlocoPlano[]) => void;
  condicao?: number;
  onCondicao: (c?: number) => void;
  /** Dias da data-base até a entrega: é de onde conta a parcela "na entrega" da condição. */
  diasAteEntrega?: number;
  /** Sem esta função o plano vale ao gravar; com ela, aparece o botão de aplicar. */
  onAplicar?: () => void;
  onErro: (mensagem: string) => void;
  desabilitado?: boolean;
}

/**
 * Monta as parcelas combinando percentual, valor e quantidade: entrada em %, saldo
 * no final ou no meio, ou a condição de pagamento do cadastro como ponto de partida.
 */
export function PlanoParcelasEditor({
  totalCent, dataBase, blocos, onBlocos, condicao, onCondicao, diasAteEntrega = 0, onAplicar, onErro, desabilitado = false,
}: Props): JSX.Element {
  const resultado = useMemo(() => calcularPlano(blocos, totalCent), [blocos, totalCent]);
  const ultimaCondicao = useRef(0);

  const setBloco = (id: number, patch: Partial<BlocoPlano>) => {
    onBlocos(blocos.map((b) => {
      if (b.id !== id) return b;
      const novo = { ...b, ...patch };
      // Com a parcela única, o intervalo não tem o que separar.
      if (novo.quantidade <= 1) novo.intervalo = 0;
      else if (novo.intervalo === 0) novo.intervalo = 30;
      return novo;
    }));
  };

  async function escolherCondicao(code?: number) {
    const esta = ++ultimaCondicao.current;
    onCondicao(code);
    if (!code) return;
    try {
      const parcelas = await listPaymentConditionInstallments(code);
      if (ultimaCondicao.current === esta) onBlocos(planoDaCondicao(parcelas, diasAteEntrega));
    } catch (e) { onErro(errMessage(e, "Não foi possível buscar as parcelas da condição.")); }
  }

  // A condição chegou de fora (a do fornecedor): monta o plano com ela uma vez.
  const condicaoAplicada = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (condicao === condicaoAplicada.current) return;
    condicaoAplicada.current = condicao;
    if (condicao) void escolherCondicao(condicao);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [condicao]);

  const atalho = (b: BlocoPlano[]) => { condicaoAplicada.current = undefined; onCondicao(undefined); onBlocos(b); };

  return (
    <div className="erp-plano">
      <div className="erp-plano-topo">
        <div className="erp-plano-condicao"><span className="erp-label">Condição de pagamento</span>
          <LookupField value={condicao} loader={loadPaymentConditions} entityLabel="condição de pagamento" allowManualCode={false} placeholder="Buscar condição" disabled={desabilitado}
            vazio="Nenhuma condição cadastrada. Cadastre em VCLI0520."
            onChange={(c) => { const code = c ? Number(c) : undefined; condicaoAplicada.current = code; void escolherCondicao(code); }} /></div>
        <div className="erp-plano-atalhos"><span className="erp-label">Ou monte o parcelamento</span>
          <div>
            <button type="button" className="erp-btn erp-btn-sm" disabled={desabilitado} onClick={() => atalho(planoParcelasIguais(3))}>Parcelas iguais</button>
            <button type="button" className="erp-btn erp-btn-sm" disabled={desabilitado} onClick={() => atalho(planoEntradaMaisParcelas())}>Entrada em % + parcelas</button>
            <button type="button" className="erp-btn erp-btn-sm" disabled={desabilitado} onClick={() => atalho(planoParcelasMaisFinal())}>Parcelas + % no final</button>
            <button type="button" className="erp-btn erp-btn-sm" disabled={desabilitado} onClick={() => onBlocos([...blocos, novoBloco({ rotulo: "Parcela", modo: blocos.some((b) => b.modo === "restante") ? "percentual" : "restante" })])}>+ Bloco</button>
          </div></div>
      </div>

      <div className="erp-plano-tabelas">
        <table className="erp-grid">
          <thead><tr><th>Descrição</th><th style={{ width: 128 }}>Quanto</th><th className="num" style={{ width: 112 }}>% ou R$</th><th className="num" style={{ width: 76 }}>Parcelas</th><th className="num" style={{ width: 84 }}>1º venc. (dias)</th><th className="num" style={{ width: 84 }}>Intervalo (dias)</th><th style={{ width: 36 }} /></tr></thead>
          <tbody>
            {blocos.map((b, i) => (
              <tr key={b.id}>
                <td><input className="erp-cell-input" aria-label={`Descrição do bloco ${i + 1}`} value={b.rotulo} disabled={desabilitado} onChange={(e) => setBloco(b.id, { rotulo: e.target.value })} /></td>
                <td><select className="erp-input" style={{ height: 30 }} aria-label={`Quanto leva o bloco ${i + 1}`} value={b.modo} disabled={desabilitado} onChange={(e) => setBloco(b.id, { modo: e.target.value as ModoBloco })}>
                  {MODOS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select></td>
                <td>{b.modo === "restante"
                  ? <span className="erp-plano-resto">o que sobrar</span>
                  : <input className="erp-cell-input num" aria-label={`Percentual ou valor do bloco ${i + 1}`} type="number" min="0" step="0.01" value={b.quanto || ""} disabled={desabilitado} onChange={(e) => setBloco(b.id, { quanto: Number(e.target.value) })} />}</td>
                <td><input className="erp-cell-input num" aria-label={`Parcelas do bloco ${i + 1}`} type="number" min="1" max="120" value={b.quantidade || ""} disabled={desabilitado} onChange={(e) => setBloco(b.id, { quantidade: Math.trunc(Number(e.target.value)) })} /></td>
                <td><input className="erp-cell-input num" aria-label={`Dias até o primeiro vencimento do bloco ${i + 1}`} type="number" min="0" value={b.dias} disabled={desabilitado} onChange={(e) => setBloco(b.id, { dias: Number(e.target.value) })} /></td>
                <td><input className="erp-cell-input num" aria-label={`Intervalo do bloco ${i + 1}`} type="number" min="0" value={b.quantidade > 1 ? b.intervalo : ""} disabled={desabilitado || b.quantidade <= 1} onChange={(e) => setBloco(b.id, { intervalo: Number(e.target.value) })} /></td>
                <td><button type="button" className="erp-btn erp-btn-sm" aria-label={`Remover o bloco ${i + 1}`} disabled={desabilitado || blocos.length === 1} onClick={() => onBlocos(blocos.filter((x) => x.id !== b.id))}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="erp-plano-previa">
          <div className="erp-label">Como fica ({resultado.parcelas.length} {resultado.parcelas.length === 1 ? "parcela" : "parcelas"})</div>
          {totalCent <= 0
            ? <div className="erp-field-hint" style={{ margin: "6px 0 8px" }}>Informe os valores da nota para ver as parcelas.</div>
            : resultado.erro
            ? <div className="erp-plano-erro" role="alert">{resultado.erro}</div>
            : (
              <ol>
                {resultado.parcelas.map((p) => (
                  <li key={p.numero}><span>{p.numero}. {p.rotulo}</span><span>{dataBase ? dataBR(dataMaisDias(dataBase, p.dias)) : `${p.dias} dias`}</span><strong>R$ {moeda(p.valorCent)}</strong></li>
                ))}
              </ol>
            )}
          {onAplicar && <button type="button" className="erp-btn erp-btn-primary erp-btn-sm" disabled={desabilitado || Boolean(resultado.erro)} onClick={onAplicar}>Aplicar às parcelas</button>}
        </div>
      </div>
    </div>
  );
}
