import { useEffect, useState } from "react";
import { getCreditPolicy, saveCreditPolicy, type CreditPolicy } from "@/services/customerService";
import { errMessage } from "@/services/fiscalShared";
import { useAuthStore } from "@/store/authStore";

/*
 * Política de crédito da empresa (VCLI0500 › Cadastros de apoio). São os
 * parâmetros do cálculo do limite sugerido; só o administrador altera.
 */

const CAMPOS: { key: keyof CreditPolicy; label: string; hint: string; col?: number }[] = [
  { key: "max_limit", label: "Teto de limite por cliente (R$)", hint: "0 = sem teto." },
  { key: "new_customer_capital_pct", label: "Cliente novo: % do capital social", hint: "Capacidade do cliente sem histórico: quanto do capital social dele o crédito pode alcançar." },
  { key: "new_customer_revenue_pct", label: "Cliente novo: % do faturamento mensal da empresa", hint: "Apetite: quanto a empresa aceita expor num cliente ainda não testado, sobre o faturamento médio mensal dela (notas autorizadas dos últimos 12 meses)." },
  { key: "new_customer_cap", label: "Cliente novo: piso do apetite (R$)", hint: "O mínimo do apetite, para empresa com pouco faturamento no sistema. Sem capital social informado, o limite parte de 25% deste valor." },
  { key: "override_tolerance_pct", label: "Tolerância para aprovar acima do sugerido (%)", hint: "Acima disso, só administrador." },
  { key: "overdue_block_days", label: "Dias de atraso que zeram o crédito", hint: "Título vencido há mais que isso (no cliente ou no grupo) bloqueia." },
  { key: "history_months", label: "Meses de histórico analisados", hint: "De 6 a 60." },
  { key: "registration_check_days", label: "Reconsultar a Receita a cada (dias)", hint: "O agendador confere os CNPJs nesse intervalo." },
];
const VALIDADES: { key: keyof CreditPolicy; classe: string }[] = [
  { key: "validity_months_a", classe: "A" }, { key: "validity_months_b", classe: "B" }, { key: "validity_months_c", classe: "C" },
  { key: "validity_months_d", classe: "D" }, { key: "validity_months_e", classe: "E" },
];

export function PoliticaCreditoPanel(): JSX.Element {
  const isAdmin = useAuthStore((s) => s.user?.role?.toUpperCase() === "ADMIN");
  const [p, setP] = useState<CreditPolicy | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => { getCreditPolicy().then(setP).catch((e) => setFeedback({ type: "error", message: errMessage(e) })); }, []);

  const set = (k: keyof CreditPolicy, v: string) => setP((cur) => (cur ? { ...cur, [k]: v === "" ? 0 : Number(v) } : cur));

  async function salvar() {
    if (!p) return;
    setBusy(true); setFeedback(null);
    try { setP(await saveCreditPolicy(p)); setFeedback({ type: "success", message: "Política de crédito gravada. Vale para as próximas análises." }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); }
    finally { setBusy(false); }
  }

  if (!p) return <div className="erp-fieldset-body">{feedback ? <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div> : <div className="erp-note">Carregando…</div>}</div>;
  return (
    <div className="erp-fieldset-body">
      {feedback && <div className="erp-field erp-c12"><div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div></div>}
      <div className="erp-field erp-c12"><div className="erp-note">
        Como o limite é calculado: com histórico, média mensal faturada × (prazo médio ÷ 30 + 1); sem histórico, o menor entre a capacidade
        do cliente (% do capital social) e o apetite da empresa (% do faturamento médio mensal dela, nunca abaixo do piso).
        O resultado é multiplicado pelo fator da classe (A 100%, B 80%, C 60%, D 30%, E 0%). CNPJ irregular, título vencido além da tolerância,
        protesto ou título baixado como perda zeram o limite.
      </div></div>
      {CAMPOS.map((c) => (
        <div key={c.key} className={`erp-field erp-c${c.col ?? 4}`}><label className="erp-label">{c.label}</label>
          <input className="erp-input num" type="number" step="0.01" min="0" value={p[c.key]} disabled={!isAdmin} onChange={(e) => set(c.key, e.target.value)} />
          <span className="erp-field-hint">{c.hint}</span></div>
      ))}
      <div className="erp-field erp-c12"><label className="erp-label">Validade do limite por classe (meses)</label></div>
      {VALIDADES.map((v) => (
        <div key={v.key} className="erp-field erp-c2"><label className="erp-label">Classe {v.classe}</label>
          <input className="erp-input num" type="number" min="1" value={p[v.key]} disabled={!isAdmin} onChange={(e) => set(v.key, e.target.value)} /></div>
      ))}
      <div className="erp-field erp-c12">
        {isAdmin
          ? <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "..." : "Gravar política"}</button>
          : <span className="erp-field-hint">Só o administrador altera a política de crédito.</span>}
      </div>
    </div>
  );
}
