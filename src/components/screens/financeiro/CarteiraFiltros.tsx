import { LookupField } from "@/components/ui/LookupField";
import type { LookupLoader } from "@/services/lookups";
import { type ListFilters, temFiltroAtivo } from "@/services/financialService";

/**
 * Painel de filtros da carteira, compartilhado por VFIN0200 (a pagar) e VFIN0210
 * (a receber).
 *
 * Existe compartilhado porque as duas telas fazem a MESMA pergunta com nomes
 * diferentes ("do fornecedor" × "do cliente"), e manter dois painéis iguais é como
 * eles divergem: um ganha o filtro de período e o outro não.
 *
 * ⚠️ Antes desta versão a única opção era a situação, e ela não funcionava — o
 * backend lia o filtro do corpo de uma requisição GET, então nada chegava e a
 * listagem vinha inteira com o filtro marcado na tela.
 */

export interface OpcaoDeSituacao {
  readonly valor: string;
  readonly rotulo: string;
}

interface CarteiraFiltrosProps {
  filtros: ListFilters;
  onChange: (filtros: ListFilters) => void;
  onAplicar: () => void;
  busy?: boolean;
  /** Situações possíveis — diferentes entre pagar e receber. */
  situacoes: readonly OpcaoDeSituacao[];
  /** "fornecedor" em VFIN0200, "cliente" em VFIN0210. */
  parceiroLabel: string;
  parceiroLoader: LookupLoader;
  /** Chave do filtro para o parceiro: `fornecedor_id` ou `cliente_id`. */
  parceiroCampo: "fornecedor_id" | "cliente_id";
  /** Plano de contas e centro de custo só existem no título a pagar. */
  planoContasLoader?: LookupLoader;
  centroCustoLoader?: LookupLoader;
  /** Quantos títulos a consulta devolveu, para o painel dizer o efeito do filtro. */
  totalEncontrado?: number;
}

export function CarteiraFiltros({
  filtros, onChange, onAplicar, busy, situacoes, parceiroLabel, parceiroLoader,
  parceiroCampo, planoContasLoader, centroCustoLoader, totalEncontrado,
}: CarteiraFiltrosProps): JSX.Element {
  const set = <K extends keyof ListFilters>(k: K, v: ListFilters[K]) => onChange({ ...filtros, [k]: v });
  const ativo = temFiltroAtivo(filtros);

  return (
    <div className="erp-fieldset">
      <div className="erp-fieldset-head">
        Filtrar a carteira
        {ativo && (
          <span style={{ fontWeight: 400, opacity: 0.65 }}>
            {totalEncontrado !== undefined ? ` — ${totalEncontrado} título(s) com o filtro atual` : " — filtro aplicado"}
          </span>
        )}
      </div>
      <div className="erp-fieldset-body">
        <div className="erp-field erp-c3">
          <label className="erp-label">{parceiroLabel}</label>
          <LookupField value={Number(filtros[parceiroCampo]) || undefined} loader={parceiroLoader}
            entityLabel={parceiroLabel.toLowerCase()} placeholder={`Todos os ${parceiroLabel.toLowerCase()}s`} clearable
            onChange={(c) => set(parceiroCampo, c ? Number(c) : undefined)} />
        </div>

        <div className="erp-field erp-c2">
          <label className="erp-label">Situação</label>
          <select className="erp-input" value={filtros.status ?? ""}
            onChange={(e) => set("status", e.target.value || undefined)}>
            {situacoes.map((s) => <option key={s.valor} value={s.valor}>{s.rotulo}</option>)}
          </select>
        </div>

        <div className="erp-field erp-c2">
          <label className="erp-label">Período por</label>
          <select className="erp-input" value={filtros.date_field ?? "VENCIMENTO"}
            onChange={(e) => set("date_field", e.target.value as ListFilters["date_field"])}>
            <option value="VENCIMENTO">Vencimento</option>
            <option value="EMISSAO">Emissão</option>
          </select>
          <span className="erp-hint">Cobrança olha vencimento; conferência com o parceiro olha emissão.</span>
        </div>
        <div className="erp-field erp-c2">
          <label className="erp-label">De</label>
          <input className="erp-input" type="date" value={filtros.start_date ?? ""}
            onChange={(e) => set("start_date", e.target.value || undefined)} />
        </div>
        <div className="erp-field erp-c2">
          <label className="erp-label">Até</label>
          <input className="erp-input" type="date" value={filtros.end_date ?? ""}
            onChange={(e) => set("end_date", e.target.value || undefined)} />
        </div>

        <div className="erp-field erp-c3">
          <label className="erp-label">Nº do documento</label>
          <input className="erp-input" value={filtros.documento ?? ""} placeholder="1001 encontra NF-1001/2"
            onChange={(e) => set("documento", e.target.value || undefined)} />
        </div>
        <div className="erp-field erp-c2">
          <label className="erp-label">Valor de</label>
          <input className="erp-input num" type="number" step="0.01" min="0" value={filtros.valor_minimo ?? ""}
            onChange={(e) => set("valor_minimo", e.target.value || undefined)} />
        </div>
        <div className="erp-field erp-c2">
          <label className="erp-label">Valor até</label>
          <input className="erp-input num" type="number" step="0.01" min="0" value={filtros.valor_maximo ?? ""}
            onChange={(e) => set("valor_maximo", e.target.value || undefined)} />
        </div>

        {planoContasLoader && (
          <div className="erp-field erp-c3">
            <label className="erp-label">Conta do plano</label>
            <LookupField value={Number(filtros.plano_contas_id) || undefined} loader={planoContasLoader}
              entityLabel="conta do plano" placeholder="Todas" clearable
              onChange={(c) => set("plano_contas_id", c ? Number(c) : undefined)} />
          </div>
        )}
        {centroCustoLoader && (
          <div className="erp-field erp-c2">
            <label className="erp-label">Centro de custo</label>
            <LookupField value={Number(filtros.centro_custo_id) || undefined} loader={centroCustoLoader}
              entityLabel="centro de custo" placeholder="Todos" clearable
              onChange={(c) => set("centro_custo_id", c ? Number(c) : undefined)} />
          </div>
        )}

        <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}>
          <label className="erp-check">
            <input type="checkbox" checked={filtros.somente_vencidos === true}
              onChange={(e) => set("somente_vencidos", e.target.checked ? true : undefined)} />
            Só títulos vencidos e em aberto
          </label>
        </div>

        <div className="erp-field erp-c12" style={{ flexDirection: "row", gap: 8 }}>
          <button className="erp-btn erp-btn-primary" onClick={onAplicar} disabled={busy}>
            {busy ? <><span className="erp-spin" />Consultando…</> : "Aplicar filtro"}
          </button>
          <button className="erp-btn" disabled={busy || !ativo}
            onClick={() => { onChange({}); onAplicar(); }}>
            Limpar filtro
          </button>
        </div>
      </div>
    </div>
  );
}
