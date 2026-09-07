import { useCallback, useState } from "react";
import { ExportButton } from "@/components/ui/ExportButton";
import { ConjuntosTab } from "./configurador/ConjuntosTab";
import { PerguntasTab } from "./configurador/PerguntasTab";
import { PerguntasDoItemTab } from "./configurador/PerguntasDoItemTab";
import { GerarMascaraTab } from "./configurador/GerarMascaraTab";
import { RestricoesTab } from "./configurador/RestricoesTab";

/**
 * VCFG0100 — Configurador de Produto (PDM).
 *
 * A tela segue a ordem em que o cadastro precisa ser feito, da esquerda para a
 * direita, porque cada etapa depende da anterior:
 *
 *   respostas → perguntas → perguntas do item → restrições → máscara
 *
 * É o mesmo caminho do FoccoERP (FENG0101 → 0102 → 0107 → 0116), com duas
 * diferenças que valem para movelaria e metalúrgica: a máscara se monta na
 * tela enquanto o usuário responde, e a restrição é escrita como frase — "SE a
 * COR for igual a PRETO ENTÃO a PROFUNDIDADE é inválida" — em vez de códigos
 * numa grade.
 */
type Feedback = { type: "success" | "error"; message: string } | null;
type Aba = "conjuntos" | "perguntas" | "item" | "mascara" | "restricoes";

const ABAS: { id: Aba; label: string; passo: string }[] = [
  { id: "conjuntos", label: "Respostas", passo: "1" },
  { id: "perguntas", label: "Perguntas", passo: "2" },
  { id: "item", label: "Perguntas do item", passo: "3" },
  { id: "restricoes", label: "Restrições", passo: "4" },
  { id: "mascara", label: "Configurar e gerar", passo: "5" },
];

export function Vcfg0100Page(): JSX.Element {
  const [aba, setAba] = useState<Aba>("conjuntos");
  const [feedback, setFeedback] = useState<Feedback>(null);
  // O item escolhido acompanha o usuário entre as abas 3, 4 e 5: é sempre o
  // mesmo produto sendo configurado.
  const [itemCode, setItemCode] = useState("");

  const aviso = useCallback((type: "success" | "error", message: string) => {
    setFeedback({ type, message });
  }, []);

  return (
    <div className="erp-screen">
      <style>{CFGW_STYLES}</style>

      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Engenharia</span><span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Configurador de Produto</span>
          <span className="erp-crumb-code">VCFG0100</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">
          {itemCode ? `item ${itemCode}` : "respostas · perguntas · restrições · máscara"}
        </span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          {ABAS.map((a) => (
            <button key={a.id} className={`erp-btn ${aba === a.id ? "erp-btn-primary" : ""}`} onClick={() => setAba(a.id)}>
              <span className="cfgw-step">{a.passo}</span>{a.label}
            </button>
          ))}
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup">
          <ExportButton title="VCFG0100 — Configurador de Produto" filename="vcfg0100" />
        </div>
      </div>

      <div className="erp-content">
        {feedback && (
          <div className={`erp-feedback ${feedback.type}`}>
            {feedback.message}
            <button className="erp-btn erp-btn-sm" style={{ marginLeft: "auto" }} onClick={() => setFeedback(null)}>Fechar</button>
          </div>
        )}

        {aba === "conjuntos" && <ConjuntosTab aviso={aviso} />}
        {aba === "perguntas" && <PerguntasTab aviso={aviso} />}
        {aba === "item" && <PerguntasDoItemTab aviso={aviso} itemCode={itemCode} onItemChange={setItemCode} />}
        {aba === "restricoes" && <RestricoesTab aviso={aviso} itemCode={itemCode} onItemChange={setItemCode} />}
        {aba === "mascara" && <GerarMascaraTab aviso={aviso} itemCode={itemCode} onItemChange={setItemCode} />}
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">
          A configuração também abre pelo botão <strong>Configurador</strong> da Estrutura de Produto (VENT0210),
          onde a máscara já sai aplicada na estrutura e nas fórmulas de quantidade.
        </div>
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

const CFGW_STYLES = `
.cfgw-step { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; margin-right: 6px; border-radius: 50%; background: rgba(0,0,0,.08); font-size: 10px; font-weight: 700; }
.erp-btn-primary .cfgw-step { background: rgba(255,255,255,.22); }
.cfgw-inline { display: flex; gap: 6px; align-items: center; padding: 8px; }
.cfgw-inline .erp-input { flex: 1; min-width: 0; }
.cfgw-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.cfgw-rowactions { display: flex; gap: 4px; white-space: nowrap; }
.cfgw-hint { display: block; font-size: 10.5px; color: #7a9a84; line-height: 1.4; margin-top: 3px; }
.cfgw-checks { display: flex; flex-wrap: wrap; gap: 6px 14px; padding-top: 4px; }
.cfgw-chip { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px; color: #1e6030; background: #f0f6ec; border: 1px solid #dbe8d5; border-radius: 5px; padding: 1px 6px; }
.cfgw-chip.big { font-size: 14px; padding: 3px 9px; }
.cfgw-preview { display: block; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12.5px; color: #1e6030; background: #f0f6ec; border: 1px solid #dbe8d5; border-radius: 7px; padding: 8px 11px; overflow-wrap: anywhere; }
.cfgw-preview.big { font-size: 17px; letter-spacing: .5px; padding: 12px 14px; }
.cfgw-flags { display: flex; flex-wrap: wrap; gap: 4px; }
.cfgw-flags span { font-size: 10px; text-transform: uppercase; letter-spacing: .3px; background: #eef5ea; border: 1px solid #c4dfc8; border-radius: 9px; padding: 1px 6px; color: #1e6030; }
.cfgw-clause { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.cfgw-clause .erp-input { flex: 1; min-width: 130px; }
.cfgw-clause .cfgw-op { flex: 0 0 150px; }
.cfgw-clause .cfgw-conn { flex: 0 0 70px; }
.cfgw-keyword { min-width: 52px; font-size: 11px; font-weight: 700; letter-spacing: .5px; color: #2f7d47; }
.cfgw-rule code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: #f0f6ec; border-radius: 4px; padding: 0 4px; }
.cfgw-sugestoes { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; margin-top: 5px; }
.erp-input-sm { height: 26px; font-size: 11.5px; padding: 0 6px; }
`;
