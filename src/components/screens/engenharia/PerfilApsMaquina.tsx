import { useCallback, useEffect, useState } from "react";
import {
  type IndustrialProfile, type Machine, type ResourceGroup,
  deleteResourceGroup, getIndustrialProfile, listResourceGroups, saveIndustrialProfile, saveResourceGroup,
} from "@/services/machineService";
import { errMessage } from "@/services/fiscalShared";
import { LookupField } from "@/components/ui/LookupField";
import { confirmar } from "@/components/ui/dialogos";
import { loadCostCentersById } from "@/services/lookups";
import { type MachineType, saveWorkCenterSequencing } from "@/services/machineTypeService";
import { useAuthStore } from "@/store/authStore";

/*
 * Aba "APS e custos" da VMAQ0200: grupos de recursos (máquinas que o
 * sequenciamento pode trocar entre si), campos especiais da máquina e o custo e
 * a capacidade do centro de trabalho. Era o que só as rotinas genéricas VAPS0100
 * e VAPS0500 faziam, pedindo o código interno da máquina; o resto do perfil
 * (uso, marca, calendário, localização, gargalo) já é a aba Máquinas.
 */

type Feedback = { type: "success" | "error" | "info"; message: string } | null;

export function PerfilApsMaquina({ machines, types, aoMudarCadastro }: { machines: Machine[]; types: MachineType[]; aoMudarCadastro: () => void }): JSX.Element {
  const isAdmin = useAuthStore((s) => s.user?.role?.toUpperCase() === "ADMIN");
  const [centro, setCentro] = useState<{ id?: number; maquina?: number; mao?: number; horas: string }>({ horas: "" });
  const [maquina, setMaquina] = useState<number | undefined>();
  const [perfil, setPerfil] = useState<IndustrialProfile | null>(null);
  const [grupos, setGrupos] = useState<ResourceGroup[]>([]);
  const [novoGrupo, setNovoGrupo] = useState({ code: "", description: "" });
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);
  useEffect(() => { void run(async () => { setGrupos(await listResourceGroups()); }); }, [run]);

  const abrir = (id?: number) => {
    setMaquina(id); setPerfil(null);
    if (!id) return;
    void run(async () => { setPerfil(await getIndustrialProfile(id)); });
  };
  const gravarPerfil = () => run(async () => {
    if (!maquina || !perfil) return;
    if (perfil.special_values.some((v) => !v.name.trim() || (v.value_type === "TEXT" ? !v.text_value?.trim() : !(v.numeric_value ?? "").trim()))) {
      setFeedback({ type: "error", message: "Cada campo especial precisa de nome e valor." }); return;
    }
    const nomes = perfil.special_values.map((v) => v.name.trim().toLowerCase());
    if (new Set(nomes).size !== nomes.length) { setFeedback({ type: "error", message: "Há campo especial com o mesmo nome mais de uma vez." }); return; }
    if (!String(perfil.preparation_time ?? "").trim()) { setFeedback({ type: "error", message: "Informe antes o tempo de preparação da máquina na aba Máquinas." }); return; }
    await saveIndustrialProfile(maquina, perfil);
    setPerfil(await getIndustrialProfile(maquina));
    setFeedback({ type: "success", message: "Campos especiais gravados." });
  });
  const criarGrupo = () => run(async () => {
    if (!novoGrupo.code.trim() || !novoGrupo.description.trim()) { setFeedback({ type: "error", message: "Informe o código e a descrição do grupo." }); return; }
    await saveResourceGroup(novoGrupo.code, novoGrupo.description); setNovoGrupo({ code: "", description: "" }); setGrupos(await listResourceGroups()); aoMudarCadastro();
  });
  const excluirGrupo = async (g: ResourceGroup) => {
    if (!(await confirmar({ titulo: "Excluir grupo de recursos", mensagem: "As máquinas do grupo ficam sem grupo.", assunto: `${g.code} — ${g.description}`, rotulo: "Excluir", tom: "perigo" }))) return;
    void run(async () => { await deleteResourceGroup(g.id); setGrupos(await listResourceGroups()); aoMudarCadastro(); });
  };
  const setP = <K extends keyof IndustrialProfile>(k: K, v: IndustrialProfile[K]) => setPerfil((p) => (p ? { ...p, [k]: v } : p));

  return (
    <>
      {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
      <div className="erp-fieldset"><div className="erp-fieldset-head">Campos especiais — máquina</div><div className="erp-fieldset-body">
        <div className="erp-field erp-c6"><label className="erp-label erp-req">Máquina</label>
          <select className="erp-input" value={maquina ?? ""} onChange={(e) => abrir(Number(e.target.value) || undefined)}>
            <option value="">Escolha a máquina…</option>
            {machines.map((m) => <option key={m.id} value={m.id}>{m.code} · {m.name}{m.is_active ? "" : " (inativa)"}</option>)}
          </select></div>
      </div></div>

      {maquina && perfil && (
        <div className="erp-fieldset"><div className="erp-fieldset-head">Campos especiais da máquina</div><div className="erp-fieldset-body">
          <div className="erp-field erp-c12"><span className="erp-field-hint">Características próprias da máquina que o cadastro não tem (potência, tensão, curso…). Uso, marca, fornecedor e responsável ficam na aba Máquinas.</span>
            <table className="erp-grid">
              <thead><tr><th>Nome</th><th style={{ width: 140 }}>Tipo</th><th>Valor</th><th style={{ width: 60 }} /></tr></thead>
              <tbody>
                {perfil.special_values.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Nenhum campo especial.</td></tr>}
                {perfil.special_values.map((v, i) => {
                  const muda = (patch: Partial<typeof v>) => setP("special_values", perfil.special_values.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                  return (
                    <tr key={i}>
                      <td><input className="erp-input" value={v.name} onChange={(e) => muda({ name: e.target.value })} /></td>
                      <td><select className="erp-input" value={v.value_type} onChange={(e) => muda({ value_type: e.target.value as "TEXT" | "NUMBER" })}><option value="NUMBER">Número</option><option value="TEXT">Texto</option></select></td>
                      <td>{v.value_type === "TEXT"
                        ? <input className="erp-input" value={v.text_value ?? ""} onChange={(e) => muda({ text_value: e.target.value })} />
                        : <input className="erp-input num" inputMode="decimal" value={v.numeric_value ?? ""} onChange={(e) => muda({ numeric_value: e.target.value.replace(",", ".") })} />}</td>
                      <td><button className="erp-btn erp-btn-sm erp-btn-danger" onClick={() => setP("special_values", perfil.special_values.filter((_, j) => j !== i))}>×</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <button className="erp-btn erp-btn-sm" style={{ marginTop: 6 }} onClick={() => setP("special_values", [...perfil.special_values, { name: "", value_type: "NUMBER", numeric_value: "" }])}>+ Campo especial</button>
          </div>
          {perfil.services.length > 0 && (
            <div className="erp-field erp-c12"><span className="erp-field-hint">Esta máquina tem {perfil.services.length} serviço(s) preventivo(s) cadastrado(s) no perfil; eles são mantidos ao gravar. Planos e ordens de manutenção ficam na VPRO0500.</span></div>
          )}
          <div className="erp-field erp-c12" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={() => void gravarPerfil()} disabled={busy}>Gravar campos especiais</button></div>
        </div></div>
      )}

      <div className="erp-fieldset"><div className="erp-fieldset-head">Custo e capacidade do centro de trabalho</div><div className="erp-fieldset-body">
        <div className="erp-field erp-c3"><label className="erp-label">Centro de trabalho</label>
          <select className="erp-input" value={centro.id ?? ""} onChange={(e) => { const t = types.find((x) => x.id === Number(e.target.value)); setCentro({ id: t?.id, maquina: t?.machine_cost_center_id, mao: t?.labor_cost_center_id, horas: t?.capacity_hours ?? "" }); }}>
            <option value="">Escolha…</option>{types.filter((t) => t.id).map((t) => <option key={t.id} value={t.id}>{t.code} · {t.name}</option>)}
          </select></div>
        {centro.id && <>
          <div className="erp-field erp-c3"><label className="erp-label">Centro de custo da máquina</label><LookupField value={centro.maquina} loader={loadCostCentersById} entityLabel="centro de custo" clearable onChange={(c) => setCentro((x) => ({ ...x, maquina: c ? Number(c) : undefined }))} /></div>
          <div className="erp-field erp-c3"><label className="erp-label">Centro de custo da mão de obra</label><LookupField value={centro.mao} loader={loadCostCentersById} entityLabel="centro de custo" clearable onChange={(c) => setCentro((x) => ({ ...x, mao: c ? Number(c) : undefined }))} /></div>
          <div className="erp-field erp-c1"><label className="erp-label">Horas/dia</label><input className="erp-input num" inputMode="decimal" value={centro.horas} onChange={(e) => setCentro((x) => ({ ...x, horas: e.target.value.replace(",", ".") }))} /></div>
          <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}>
            <button className="erp-btn" disabled={busy || !isAdmin} title={isAdmin ? undefined : "Somente o administrador altera o custeio do centro"} onClick={() => void run(async () => {
              await saveWorkCenterSequencing(centro.id!, { machine_cost_center_id: centro.maquina, labor_cost_center_id: centro.mao, capacity_hours: centro.horas });
              aoMudarCadastro(); setFeedback({ type: "success", message: "Custo e capacidade do centro gravados." });
            })}>Gravar centro</button></div>
        </>}
      </div></div>

      <div className="erp-fieldset"><div className="erp-fieldset-head">Grupos de recursos</div><div className="erp-fieldset-body">
        <div className="erp-field erp-c3"><label className="erp-label erp-req">Código</label><input className="erp-input" placeholder="CORTE" value={novoGrupo.code} onChange={(e) => setNovoGrupo((g) => ({ ...g, code: e.target.value.toUpperCase() }))} /></div>
        <div className="erp-field erp-c6"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={novoGrupo.description} onChange={(e) => setNovoGrupo((g) => ({ ...g, description: e.target.value }))} /></div>
        <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}><button className="erp-btn" onClick={() => void criarGrupo()} disabled={busy}>Gravar grupo</button></div>
        <div className="erp-field erp-c12"><table className="erp-grid">
          <thead><tr><th>Grupo</th><th>Descrição</th><th style={{ width: 90 }} /></tr></thead>
          <tbody>
            {grupos.length === 0 && <tr><td colSpan={3} className="erp-grid-empty">Nenhum grupo. Grupos juntam máquinas que o sequenciamento pode trocar entre si.</td></tr>}
            {grupos.map((g) => <tr key={g.id}><td style={{ fontWeight: 600 }}>{g.code}</td><td>{g.description}</td><td><button className="erp-btn erp-btn-sm erp-btn-danger" disabled={busy} onClick={() => void excluirGrupo(g)}>Excluir</button></td></tr>)}
          </tbody>
        </table></div>
      </div></div>
    </>
  );
}
