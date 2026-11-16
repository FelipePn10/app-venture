import { useState } from "react";
import { definirNomeCliente, nomeClientePreferido, type NomeCliente } from "@/services/preferenciasService";
import { errMessage } from "@/services/fiscalShared";

/** Preferências de exibição do usuário (botão do cabeçalho do painel). */
export function PreferenciasDialog({ onClose }: { onClose: () => void }): JSX.Element {
  const [nome, setNome] = useState<NomeCliente>(nomeClientePreferido());
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar() {
    setBusy(true); setErro("");
    try { await definirNomeCliente(nome); onClose(); }
    catch (e) { setErro(errMessage(e, "Não foi possível gravar a preferência.")); }
    finally { setBusy(false); }
  }

  const opcao = (v: NomeCliente, titulo: string, exemplo: string) => (
    <label style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", border: `1px solid ${nome === v ? "#2f7d4f" : "#d6e0d9"}`, borderRadius: 6, cursor: "pointer", background: nome === v ? "#eef7f1" : "#fff" }}>
      <input type="radio" name="nome-cliente" checked={nome === v} onChange={() => setNome(v)} style={{ marginTop: 3 }} />
      <span><strong>{titulo}</strong><br /><small style={{ color: "#5b6b62" }}>{exemplo}</small></span>
    </label>
  );

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="pref-titulo" onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(10,25,15,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", color: "#1d2b22", borderRadius: 10, padding: 22, width: "min(460px, calc(100vw - 32px))", boxShadow: "0 18px 50px rgba(0,0,0,.25)" }}>
        <h2 id="pref-titulo" style={{ margin: "0 0 4px", fontSize: 17 }}>Preferências</h2>
        <p style={{ margin: "0 0 14px", fontSize: 13, color: "#5b6b62" }}>Valem para o seu usuário, em qualquer computador.</p>
        <fieldset style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 8 }}>
          <legend style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Nome do cliente nas buscas e campos de cliente</legend>
          {opcao("RAZAO_SOCIAL", "Razão social", "Ex.: METALÚRGICA EXEMPLO INDÚSTRIA E COMÉRCIO LTDA")}
          {opcao("FANTASIA", "Nome fantasia", "Ex.: Metalúrgica Exemplo — sem fantasia, mostra a razão social")}
        </fieldset>
        <p style={{ margin: "10px 0 0", fontSize: 12, color: "#5b6b62" }}>A busca continua encontrando o cliente pelos dois nomes e pelo CNPJ/CPF.</p>
        {erro && <div style={{ marginTop: 10, color: "#b91c1c", fontSize: 13 }}>{erro}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <button type="button" className="erp-btn" onClick={onClose} disabled={busy}>Cancelar</button>
          <button type="button" className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Gravando…" : "Gravar"}</button>
        </div>
      </div>
    </div>
  );
}
