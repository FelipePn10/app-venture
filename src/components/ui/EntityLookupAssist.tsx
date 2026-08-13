import { useEffect, useState } from "react";
import { listItems } from "@/services/itemService";
import { listMachines } from "@/services/machineService";
import { listSuppliers } from "@/services/supplierService";
import { listCustomers } from "@/services/customerService";
import { loadWarehouses } from "@/services/lookups";

type Option = { value: string | number; code: string | number; label: string; sub?: string };
type Entity = "item" | "machine" | "supplier" | "customer" | "warehouse";
type Active = { input: HTMLInputElement; entity: Entity; label: string; useId: boolean } | null;

function identify(label: string): Entity | undefined {
  const text = label.toLowerCase().replace(/\s+/g, " ").trim();
  if (/^(máquina|maquina)( |$)/.test(text)) return "machine";
  if (/^(item|item insumo|item cotação|código item|matéria-prima|produto|componente)( |$)/.test(text)) return "item";
  if (/^fornecedor( |$)/.test(text)) return "supplier";
  if (/^cliente( |$)/.test(text)) return "customer";
  if (/^(almoxarifado|depósito)( |$)/.test(text)) return "warehouse";
  return undefined;
}

async function optionsFor(entity: Entity, useId: boolean): Promise<Option[]> {
  if (entity === "item") return (await listItems()).filter((x) => x.code).map((x) => ({ value: x.code!, code: x.code!, label: x.description || `Item ${x.code}`, sub: x.uom }));
  if (entity === "machine") return (await listMachines()).map((x) => ({ value: useId ? x.id : x.code, code: x.code, label: x.name, sub: x.is_active ? "Ativa" : "Inativa" }));
  if (entity === "supplier") return (await listSuppliers()).filter((x) => x.code).map((x) => ({ value: useId ? (x.id || x.code!) : x.code!, code: x.code!, label: x.name, sub: x.document_number }));
  if (entity === "customer") return (await listCustomers()).filter((x) => x.code).map((x) => ({ value: x.code!, code: x.code!, label: x.name, sub: x.document_number }));
  return (await loadWarehouses()).map((x) => ({ value: x.code, code: x.code, label: x.label, sub: x.sub }));
}

/** Acrescenta lupa aos campos legados de código sem redesenhar cada tela. */
export function EntityLookupAssist(): JSX.Element | null {
  const [active, setActive] = useState<Active>(null);
  const [options, setOptions] = useState<Option[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const buttons = new Set<HTMLButtonElement>();
    const enhance = () => document.querySelectorAll<HTMLElement>(".erp-field").forEach((field) => {
      const input = field.querySelector<HTMLInputElement>('input[type="number"]');
      const label = field.querySelector<HTMLLabelElement>("label");
      if (!input || !label || input.readOnly || input.disabled || field.querySelector(".erp-entity-lookup-btn")) return;
      const entity = identify(label.textContent || "");
      if (!entity) return;
      field.style.position = "relative";
      input.style.paddingRight = "38px";
      const button = document.createElement("button");
      button.type = "button"; button.className = "erp-entity-lookup-btn"; button.title = `Pesquisar ${label.textContent?.trim().toLowerCase()}`;
      button.setAttribute("aria-label", button.title);
      button.innerHTML = '<svg aria-hidden="true" width="15" height="15" viewBox="0 0 20 20" fill="none"><circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" stroke-width="1.8"/><path d="m12.6 12.6 4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
      Object.assign(button.style, { position: "absolute", right: "5px", top: "23px", width: "28px", height: "28px", border: "1px solid #b8cdbc", borderRadius: "5px", background: "#f4f8f3", color: "#245b35", cursor: "pointer", zIndex: "2", display: "grid", placeItems: "center", padding: "0" });
      button.onclick = () => setActive({ input, entity, label: label.textContent?.trim() || "registro", useId: /\bID\b/i.test(label.textContent || "") || /_id$/i.test(input.name) });
      field.appendChild(button); buttons.add(button);
    });
    enhance();
    const observer = new MutationObserver(enhance); observer.observe(document.body, { childList: true, subtree: true });
    return () => { observer.disconnect(); buttons.forEach((button) => button.remove()); };
  }, []);

  useEffect(() => {
    if (!active) return;
    setLoading(true); setQuery("");
    void optionsFor(active.entity, active.useId).then(setOptions).catch(() => setOptions([])).finally(() => setLoading(false));
  }, [active]);

  if (!active) return null;
  const filtered = options.filter((option) => !query.trim() || `${option.code} ${option.label} ${option.sub || ""}`.toLowerCase().includes(query.toLowerCase())).slice(0, 250);
  const choose = (value: string | number) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(active.input, String(value));
    active.input.dispatchEvent(new Event("input", { bubbles: true }));
    active.input.dispatchEvent(new Event("change", { bubbles: true }));
    active.input.focus(); setActive(null);
  };

  return <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(13,31,20,.38)", zIndex: 20000, display: "grid", placeItems: "center" }} onMouseDown={(e) => { if (e.target === e.currentTarget) setActive(null); }}>
    <div style={{ width: "min(620px,92vw)", maxHeight: "72vh", background: "white", borderRadius: 10, boxShadow: "0 18px 55px rgba(0,0,0,.24)", overflow: "hidden" }}>
      <div style={{ padding: 14, borderBottom: "1px solid #dbe8d5", display: "flex", gap: 10, alignItems: "center" }}><strong style={{ flex: 1 }}>Pesquisar {active.label}</strong><button className="erp-btn erp-btn-sm" onClick={() => setActive(null)}>Fechar</button></div>
      <div style={{ padding: 12 }}><input autoFocus className="erp-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Digite o código ou nome…" /></div>
      <div style={{ overflow: "auto", maxHeight: "52vh", padding: "0 12px 12px" }}>
        {loading && <div className="erp-grid-empty">Carregando cadastros…</div>}
        {!loading && filtered.length === 0 && <div className="erp-grid-empty">Nenhum cadastro encontrado.</div>}
        {filtered.map((option) => <button type="button" key={`${option.value}-${option.code}`} onClick={() => choose(option.value)} style={{ width: "100%", display: "flex", textAlign: "left", gap: 12, padding: "9px 10px", border: 0, borderBottom: "1px solid #edf2ed", background: "white", cursor: "pointer" }}><strong style={{ minWidth: 72 }}>{option.code}</strong><span>{option.label}{option.sub ? <small style={{ display: "block", color: "#66756b" }}>{option.sub}</small> : null}</span></button>)}
      </div>
    </div>
  </div>;
}
