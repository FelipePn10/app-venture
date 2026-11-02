import type { PreviaNFe, PreviaParteNFe } from "@/services/nfeService";
import { chaveEmGrupos, documentoComMascara } from "@/utils/documentoFiscal";

/**
 * A nota como ela sai: o layout do DANFE, preenchido com o documento que será
 * transmitido. Quem confere enxerga o que o cliente vai receber, com os mesmos
 * quadros e na mesma ordem do papel. Chave e protocolo só existem depois da
 * autorização, e a tarja lembra que esta folha não tem valor fiscal.
 */

type Dados = Record<string, unknown>;

const MODALIDADE_FRETE: Record<string, string> = {
  "0": "0 — Por conta do emitente",
  "1": "1 — Por conta do destinatário",
  "2": "2 — Por conta de terceiros",
  "3": "3 — Transporte próprio do emitente",
  "4": "4 — Transporte próprio do destinatário",
  "9": "9 — Sem frete",
};

function lerDocumento(payload: string): Dados {
  try {
    const v: unknown = JSON.parse(payload);
    return v && typeof v === "object" ? (v as Dados) : {};
  } catch { return {}; }
}

const txt = (v: unknown): string => (v === null || v === undefined ? "" : String(v).trim());
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const moeda = (v: unknown) => num(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qtd = (v: unknown) => num(v).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 4 });
const unit = (v: unknown) => num(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
const dataBR = (v?: unknown) => { const s = txt(v); return s ? s.slice(0, 10).split("-").reverse().join("/") : ""; };

const cepComMascara = (v?: string) => {
  const d = (v ?? "").replace(/\D/g, "");
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : (v ?? "");
};

/** Campo do DANFE: rótulo miúdo em cima, valor embaixo. Vazio obrigatório fica em vermelho. */
function Campo({ rotulo, valor, flex = 1, direita, exigido }: { rotulo: string; valor?: string; flex?: number; direita?: boolean; exigido?: boolean }): JSX.Element {
  const vazio = !valor;
  return (
    <div className={`danfe-campo${direita ? " direita" : ""}`} style={{ flex }}>
      <span className="danfe-rotulo">{rotulo}</span>
      <span className={`danfe-valor${vazio && exigido ? " falta" : ""}`}>{vazio ? (exigido ? "não informado" : " ") : valor}</span>
    </div>
  );
}

const enderecoLinha = (p: PreviaParteNFe) => [p.logradouro, p.numero, p.complemento].filter(Boolean).join(", ");

export function DanfePrevia({ previa }: { previa: PreviaNFe }): JSX.Element {
  const doc = lerDocumento(previa.payload_enviado);
  const itens = Array.isArray(doc.items) ? (doc.items as Dados[]) : [];
  const referenciadas = Array.isArray(doc.notas_referenciadas) ? (doc.notas_referenciadas as Dados[]) : [];
  const emit = previa.emitente;
  const dest = previa.destinatario;
  const t = previa.totais;
  const numero = previa.numero_nf > 0 ? String(previa.numero_nf).padStart(9, "0").replace(/(\d{3})(?=\d)/g, "$1.") : "a definir";
  const saida = txt(doc.tipo_documento) !== "0";
  const baseIcms = itens.reduce((s, i) => s + num(i.icms_base_calculo), 0);
  const outras = txt(doc.valor_outras_despesas);
  const infCpl = txt(doc.informacoes_adicionais_contribuinte);
  const infFisco = txt(doc.informacoes_adicionais_fisco);

  return (
    <div className="danfe-rolagem">
      <div className="danfe-folha" aria-label="Prévia da nota fiscal">
        <div className="danfe-tarja" aria-hidden="true">PRÉVIA — SEM VALOR FISCAL</div>

        <div className="danfe-canhoto">
          <Campo flex={5} rotulo="Recebemos de" valor={`${emit.nome} os produtos e/ou serviços constantes da nota fiscal eletrônica indicada ao lado`} />
          <div className="danfe-canhoto-nf"><strong>NF-e</strong><span>Nº {numero}</span><span>Série {previa.serie || "—"}</span></div>
        </div>
        <div className="danfe-linha">
          <Campo flex={1} rotulo="Data de recebimento" />
          <Campo flex={3} rotulo="Identificação e assinatura do recebedor" />
        </div>
        <div className="danfe-picote" />

        <div className="danfe-linha danfe-cabecalho">
          <div className="danfe-emitente">
            <strong className="danfe-razao">{emit.nome || <em className="falta">emitente sem nome</em>}</strong>
            <span>{enderecoLinha(emit)}</span>
            <span>{[emit.bairro, cepComMascara(emit.cep)].filter(Boolean).join(" — ")}</span>
            <span>{[emit.municipio, emit.uf].filter(Boolean).join(" / ")}</span>
            <span>{[emit.telefone && `Fone: ${emit.telefone}`, emit.email].filter(Boolean).join(" · ")}</span>
          </div>
          <div className="danfe-titulo">
            <strong>DANFE</strong>
            <span>Documento Auxiliar da<br />Nota Fiscal Eletrônica</span>
            <div className="danfe-es"><span>0 — Entrada<br />1 — Saída</span><b>{saida ? "1" : "0"}</b></div>
            <strong className="danfe-numero">Nº {numero}</strong>
            <span>Série {previa.serie || "—"} · Folha 1/1</span>
          </div>
          <div className="danfe-chave">
            <div className="danfe-codbarras" aria-hidden="true"><span>código de barras gerado na autorização</span></div>
            <Campo rotulo="Chave de acesso" valor="Gerada na autorização" />
            <p>Consulta de autenticidade no portal nacional da NF-e (www.nfe.fazenda.gov.br/portal) ou no site da SEFAZ autorizadora.</p>
          </div>
        </div>
        <div className="danfe-linha">
          <Campo flex={3} rotulo="Natureza da operação" valor={txt(doc.natureza_operacao) || previa.natureza_operacao} exigido />
          <Campo flex={2} rotulo="Protocolo de autorização de uso" valor="Gerado na autorização" />
        </div>
        <div className="danfe-linha">
          <Campo rotulo="Inscrição estadual" valor={emit.ie} exigido />
          <Campo rotulo="Insc. estadual do subst. tributário" valor={txt(doc.inscricao_estadual_st)} />
          <Campo rotulo="CNPJ" valor={documentoComMascara(emit.documento)} exigido />
        </div>

        <h4>Destinatário / remetente</h4>
        <div className="danfe-linha">
          <Campo flex={4} rotulo="Nome / razão social" valor={dest.nome} exigido />
          <Campo flex={2} rotulo="CNPJ / CPF" valor={documentoComMascara(dest.documento)} exigido />
          <Campo flex={1} rotulo="Data de emissão" valor={dataBR(txt(doc.data_emissao) || previa.data_emissao)} exigido />
        </div>
        <div className="danfe-linha">
          <Campo flex={4} rotulo="Endereço" valor={enderecoLinha(dest)} exigido />
          <Campo flex={2} rotulo="Bairro / distrito" valor={dest.bairro} exigido />
          <Campo flex={1} rotulo="CEP" valor={cepComMascara(dest.cep)} exigido />
          <Campo flex={1} rotulo="Data de saída" valor={dataBR(previa.data_saida)} />
        </div>
        <div className="danfe-linha">
          <Campo flex={3} rotulo="Município" valor={dest.municipio} exigido />
          <Campo flex={2} rotulo="Fone / fax" valor={dest.telefone} />
          <Campo flex={1} rotulo="UF" valor={dest.uf} exigido />
          <Campo flex={2} rotulo="Inscrição estadual" valor={dest.ie} />
        </div>

        {previa.pagamento.parcelas.length > 0 && (
          <>
            <h4>Fatura / duplicatas</h4>
            <div className="danfe-duplicatas">
              {previa.pagamento.parcelas.map((p) => (
                <div key={p.numero}>
                  <span>{String(p.numero).padStart(3, "0")}</span>
                  <span>{dataBR(p.vencimento)}</span>
                  <strong>{moeda(p.valor)}</strong>
                </div>
              ))}
            </div>
          </>
        )}

        <h4>Cálculo do imposto</h4>
        <div className="danfe-linha">
          <Campo direita rotulo="Base de cálc. do ICMS" valor={moeda(baseIcms)} />
          <Campo direita rotulo="Valor do ICMS" valor={moeda(t.valor_icms)} />
          <Campo direita rotulo="Base de cálc. do ICMS ST" valor={moeda(t.base_icms_st)} />
          <Campo direita rotulo="Valor do ICMS ST" valor={moeda(t.valor_icms_st)} />
          <Campo direita rotulo="Valor total dos produtos" valor={moeda(t.valor_produtos)} />
        </div>
        <div className="danfe-linha">
          <Campo direita rotulo="Valor do frete" valor={moeda(t.valor_frete)} />
          <Campo direita rotulo="Valor do seguro" valor={moeda(t.valor_seguro)} />
          <Campo direita rotulo="Desconto" valor={moeda(t.valor_desconto)} />
          <Campo direita rotulo="Outras despesas" valor={moeda(outras)} />
          <Campo direita rotulo="Valor do IPI" valor={moeda(t.valor_ipi)} />
          <Campo direita rotulo="Valor total da nota" valor={moeda(t.valor_total_nf)} />
        </div>

        <h4>Transportador / volumes transportados</h4>
        <div className="danfe-linha">
          <Campo flex={3} rotulo="Razão social" valor={txt(doc.nome_transportador)} />
          <Campo flex={2} rotulo="Frete por conta" valor={MODALIDADE_FRETE[txt(doc.modalidade_frete)] ?? ""} />
          <Campo rotulo="Placa do veículo" valor={txt(doc.veiculo_placa)} />
          <Campo flex={0.5} rotulo="UF" valor={txt(doc.veiculo_uf)} />
          <Campo flex={2} rotulo="CNPJ / CPF" valor={documentoComMascara(txt(doc.cnpj_transportador))} />
        </div>

        <h4>Dados dos produtos / serviços</h4>
        <table className="danfe-itens">
          <thead>
            <tr>
              <th>Código</th><th className="esq">Descrição do produto / serviço</th><th>NCM/SH</th><th>O/CST</th><th>CFOP</th><th>UN</th>
              <th className="dir">Quant.</th><th className="dir">V. unit.</th><th className="dir">V. total</th>
              <th className="dir">BC ICMS</th><th className="dir">V. ICMS</th><th className="dir">V. IPI</th><th className="dir">% ICMS</th><th className="dir">% IPI</th>
            </tr>
          </thead>
          <tbody>
            {itens.length === 0 && <tr><td colSpan={14} className="vazio">Esta nota ainda não tem itens.</td></tr>}
            {itens.map((i, idx) => (
              <tr key={idx}>
                <td>{txt(i.codigo_produto)}</td>
                <td className="esq">{txt(i.descricao)}</td>
                <td>{txt(i.codigo_ncm)}</td>
                <td>{`${txt(i.icms_origem)}${txt(i.icms_situacao_tributaria)}`}</td>
                <td>{txt(i.cfop)}</td>
                <td>{txt(i.unidade_comercial)}</td>
                <td className="dir">{qtd(i.quantidade_comercial)}</td>
                <td className="dir">{unit(i.valor_unitario_comercial)}</td>
                <td className="dir">{moeda(i.valor_bruto)}</td>
                <td className="dir">{moeda(i.icms_base_calculo)}</td>
                <td className="dir">{moeda(i.icms_valor)}</td>
                <td className="dir">{moeda(i.ipi_valor)}</td>
                <td className="dir">{qtd(i.icms_aliquota)}</td>
                <td className="dir">{qtd(i.ipi_aliquota)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h4>Dados adicionais</h4>
        <div className="danfe-linha danfe-adicionais">
          <div className="danfe-campo" style={{ flex: 3 }}>
            <span className="danfe-rotulo">Informações complementares</span>
            <span className="danfe-valor texto">{infCpl || " "}</span>
            {referenciadas.length > 0 && (
              <span className="danfe-valor texto">
                Notas referenciadas: {referenciadas.map((n) => chaveEmGrupos(txt(n.chave_nfe)) || txt(n.numero)).filter(Boolean).join("; ")}
              </span>
            )}
          </div>
          <div className="danfe-campo" style={{ flex: 1 }}>
            <span className="danfe-rotulo">Reservado ao fisco</span>
            <span className="danfe-valor texto">{infFisco || " "}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
