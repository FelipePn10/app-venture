/* eslint-disable react-refresh/only-export-components -- as funções confirmar e pedirTexto montam estes componentes aqui mesmo. */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";

/**
 * Diálogos em tela, no lugar de `window.confirm` e `window.prompt`.
 *
 * Os do navegador não cabem explicação, não têm a cara do sistema e, no Tauri,
 * aparecem como uma caixa cinza do sistema operacional. Estes respondem por
 * Promise, então o código que os chama continua lendo em sequência:
 * `if (!(await confirmar({ ... }))) return;`
 */

type Tom = "aviso" | "perigo" | "neutro";

export interface ConfirmarOpcoes {
  titulo: string;
  mensagem: string;
  /** O registro afetado, em destaque para conferência. */
  assunto?: string;
  rotulo?: string;
  rotuloVoltar?: string;
  tom?: Tom;
}

export interface PedirTextoOpcoes {
  titulo: string;
  mensagem?: string;
  assunto?: string;
  rotulo: string;
  valorInicial?: string;
  minimo?: number;
  maximo?: number;
  multilinha?: boolean;
  dica?: string;
  tipo?: "text" | "number";
  /** Campo pode ficar vazio: a resposta é "" e não cancelamento. */
  opcional?: boolean;
  rotuloConfirmar?: string;
  rotuloVoltar?: string;
  tom?: Tom;
}

/** Monta o diálogo fora da árvore da tela: abre por cima de qualquer modal. */
function abrir<T>(render: (responder: (valor: T) => void) => ReactNode): Promise<T> {
  return new Promise<T>((resolve) => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const devolverFoco = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    root.render(render((valor) => {
      root.unmount();
      host.remove();
      devolverFoco?.focus();
      resolve(valor);
    }));
  });
}

function Moldura({ titulo, tom, onVoltar, children }: { titulo: string; tom: Tom; onVoltar: () => void; children: ReactNode }): JSX.Element {
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onVoltar(); } };
    window.addEventListener("keydown", aoTeclar, true);
    return () => window.removeEventListener("keydown", aoTeclar, true);
  }, [onVoltar]);

  return (
    <div className="erp-modal-backdrop erp-dialogo-backdrop" role="presentation"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onVoltar(); }}>
      <div className={`erp-modal erp-confirm-dialog erp-dialogo erp-dialogo-${tom}`} role="alertdialog" aria-modal="true" aria-label={titulo}>
        <div className="erp-modal-head"><strong>{titulo}</strong></div>
        {children}
      </div>
    </div>
  );
}

function classeConfirmar(tom: Tom): string {
  return tom === "perigo" ? "erp-btn erp-btn-danger" : "erp-btn erp-btn-primary";
}

function Confirmacao({ opcoes, responder }: { opcoes: ConfirmarOpcoes; responder: (ok: boolean) => void }): JSX.Element {
  const { titulo, mensagem, assunto, rotulo = "Confirmar", rotuloVoltar = "Voltar", tom = "aviso" } = opcoes;
  const botao = useRef<HTMLButtonElement>(null);
  useEffect(() => { botao.current?.focus(); }, []);
  return (
    <Moldura titulo={titulo} tom={tom} onVoltar={() => responder(false)}>
      <div className="erp-modal-body">
        <p className="erp-dialogo-texto">{mensagem}</p>
        {assunto && <div className="erp-dialogo-assunto">{assunto}</div>}
      </div>
      <div className="erp-modal-actions">
        <button className="erp-btn" onClick={() => responder(false)}>{rotuloVoltar}</button>
        <button ref={botao} className={classeConfirmar(tom)} onClick={() => responder(true)}>{rotulo}</button>
      </div>
    </Moldura>
  );
}

function PedidoDeTexto({ opcoes, responder }: { opcoes: PedirTextoOpcoes; responder: (texto: string | null) => void }): JSX.Element {
  const { titulo, mensagem, assunto, rotulo, valorInicial = "", minimo = 0, maximo, multilinha, dica, tipo = "text", opcional, rotuloConfirmar = "Confirmar", rotuloVoltar = "Voltar", tom = "neutro" } = opcoes;
  const [texto, setTexto] = useState(valorInicial);
  const campo = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  useEffect(() => { campo.current?.focus(); campo.current?.select(); }, []);

  const tamanho = [...texto.trim()].length;
  const piso = opcional ? 0 : Math.max(minimo, 1);
  const curto = tamanho < piso || (opcional && tamanho > 0 && tamanho < minimo);
  const pode = !curto && (maximo === undefined || tamanho <= maximo);
  const enviar = () => { if (pode) responder(texto.trim()); };

  return (
    <Moldura titulo={titulo} tom={tom} onVoltar={() => responder(null)}>
      <form onSubmit={(e) => { e.preventDefault(); enviar(); }}>
        <div className="erp-modal-body">
          {mensagem && <p className="erp-dialogo-texto">{mensagem}</p>}
          {assunto && <div className="erp-dialogo-assunto">{assunto}</div>}
          <div className="erp-field">
            <label className={`erp-label${opcional ? "" : " erp-req"}`} htmlFor="erp-dialogo-campo">{rotulo}</label>
            {multilinha
              ? <textarea id="erp-dialogo-campo" ref={campo} className="erp-input erp-dialogo-area" rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} />
              : <input id="erp-dialogo-campo" ref={campo} className={`erp-input${tipo === "number" ? " num" : ""}`} type={tipo} step={tipo === "number" ? "any" : undefined} value={texto} onChange={(e) => setTexto(e.target.value)} />}
            <div className="erp-dialogo-rodape">
              <span className="erp-field-hint">{dica}</span>
              {(minimo > 0 || maximo !== undefined) && (
                <span className={`erp-field-hint erp-dialogo-contador${tamanho > 0 && !pode ? " fora" : ""}`}>
                  {maximo !== undefined ? `${tamanho} de ${maximo}` : `${tamanho} caracteres`}{minimo > 0 ? ` · mínimo ${minimo}` : ""}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="erp-modal-actions">
          <button type="button" className="erp-btn" onClick={() => responder(null)}>{rotuloVoltar}</button>
          <button type="submit" className={classeConfirmar(tom)} disabled={!pode}>{rotuloConfirmar}</button>
        </div>
      </form>
    </Moldura>
  );
}

/** Pergunta sim/não. Responde `false` também no Esc e no clique fora. */
export function confirmar(opcoes: ConfirmarOpcoes): Promise<boolean> {
  return abrir<boolean>((responder) => <Confirmacao opcoes={opcoes} responder={responder} />);
}

/** Pede um texto. Responde `null` se a pessoa desistir. */
export function pedirTexto(opcoes: PedirTextoOpcoes): Promise<string | null> {
  return abrir<string | null>((responder) => <PedidoDeTexto opcoes={opcoes} responder={responder} />);
}
