#!/usr/bin/env python3
"""
Gera PDFs enterprise do material de treinamento ERP Venture.

Uso:
    python3 _build/build.py            # gera HTML + tenta gerar PDF
    python3 _build/build.py --html     # só HTML (abra e use Ctrl+P → Salvar como PDF)

Sem dependências externas: parser markdown próprio + CSS de impressão A4.
Se encontrar chromium/chrome/edge no PATH, gera o .pdf automaticamente.
"""
import html as _html
import re
import shutil
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "_build" / "out"      # HTML intermediário
PDF_DIR = RAIZ / "pdf"               # entregáveis

# ─────────────────────────────────────────────────────────────────────────────
# Paleta oficial Venture ERP
# ─────────────────────────────────────────────────────────────────────────────
CSS = r"""
:root{
  --ink:#162e20; --ink-2:#1a3526; --ink-3:#14291d;
  --primary:#3e9654; --primary-dark:#2e7d43; --primary-soft:#e8f2e6;
  --bg:#f1f5ef; --paper:#ffffff;
  --border:#dfe9da; --border-2:#cfe0c8;
  --text:#1a2e22; --muted:#5c7266;
  --warn:#b45309; --warn-bg:#fdf6e7; --warn-bd:#f0d9a8;
  --star:#8a6d1f; --star-bg:#fbf7e8;
  --tip:#1f6f8a;  --tip-bg:#eaf4f8;  --tip-bd:#bcdce7;
  --say:#2e7d43;  --say-bg:#eef6ec;
}

@page{
  size:A4;
  margin:18mm 16mm 20mm 16mm;
}
@page:first{ margin:0; }

*{ box-sizing:border-box; }
html{ -webkit-print-color-adjust:exact; print-color-adjust:exact; }
body{
  margin:0; background:var(--paper); color:var(--text);
  font-family:Inter,"Segoe UI",system-ui,-apple-system,"Helvetica Neue",Arial,sans-serif;
  font-size:9.6pt; line-height:1.55;
  text-rendering:optimizeLegibility;
}

/* ── Capa ─────────────────────────────────────────────────────────────── */
.capa{
  height:297mm; width:100%; page-break-after:always; break-after:page;
  background:linear-gradient(150deg,var(--ink-2) 0%,var(--ink-3) 55%,#0f2117 100%);
  color:#fff; padding:26mm 20mm; display:flex; flex-direction:column;
  position:relative; overflow:hidden;
}
.capa::after{
  content:""; position:absolute; right:-70mm; bottom:-70mm;
  width:170mm; height:170mm; border-radius:50%;
  background:radial-gradient(circle,rgba(62,150,84,.28) 0%,rgba(62,150,84,0) 70%);
}
.capa-marca{
  font-size:11pt; font-weight:700; letter-spacing:.18em; text-transform:uppercase;
  color:#9fd3ad; display:flex; align-items:center; gap:9px;
}
.capa-marca::before{
  content:""; width:22px; height:3px; background:var(--primary); border-radius:2px;
}
.capa-dia{
  margin-top:auto; font-size:56pt; font-weight:800; line-height:.95;
  letter-spacing:-.03em; color:#fff;
}
.capa-dia small{ display:block; font-size:13pt; font-weight:600; letter-spacing:.16em;
  text-transform:uppercase; color:var(--primary); margin-bottom:6mm; }
.capa-titulo{
  font-size:23pt; font-weight:700; line-height:1.25; margin:7mm 0 0;
  max-width:135mm; color:#eaf3e9;
}
.capa-sub{ font-size:11.5pt; color:#9fb8a7; margin-top:4mm; max-width:130mm; line-height:1.5; }
.capa-regua{ height:3px; width:52mm; background:var(--primary); border-radius:2px; margin:9mm 0; }
.capa-meta{ display:flex; flex-wrap:wrap; gap:5mm 12mm; font-size:9.5pt; color:#b9cdc0; }
.capa-meta b{ display:block; color:#fff; font-size:11pt; font-weight:700; margin-top:1mm; }
.capa-rodape{
  margin-top:9mm; padding-top:5mm; border-top:1px solid rgba(255,255,255,.14);
  font-size:8.5pt; color:#8fa89a; display:flex; justify-content:space-between;
}

/* ── Corpo ────────────────────────────────────────────────────────────── */
.doc{ padding:0; }

h1,h2,h3,h4{ color:var(--ink); font-weight:700; line-height:1.25; break-after:avoid; }
h1{
  font-size:18pt; margin:0 0 6mm; padding:0 0 3.5mm;
  border-bottom:2.5px solid var(--primary); letter-spacing:-.015em;
}
/* Partes não forçam página nova: separador forte + folga generosa.
   break-after:avoid impede que o título fique órfão no pé da página. */
main > h1{
  margin-top:15mm; break-before:auto; break-after:avoid;
}
main > h1:first-child{ margin-top:0; }
main > hr + h1{ margin-top:9mm; }
/* títulos dentro de citação/destaque são ênfase, não seção */
blockquote h1, blockquote h2, blockquote h3, blockquote h4,
.callout h1, .callout h2, .callout h3, .callout h4{
  break-before:auto; border:0; padding:0; margin:0 0 2mm;
  font-size:11.5pt; color:var(--primary-dark); line-height:1.3;
}
h2{
  font-size:13.5pt; margin:9mm 0 3.5mm; padding-left:4mm;
  border-left:4px solid var(--primary); letter-spacing:-.01em;
}
h3{ font-size:11.2pt; margin:6.5mm 0 2.5mm; color:var(--primary-dark); }
h4{ font-size:10pt; margin:5mm 0 2mm; color:var(--ink); text-transform:none; }

p{ margin:0 0 2.6mm; orphans:3; widows:3; }
a{ color:var(--primary-dark); text-decoration:none; border-bottom:1px solid var(--border-2); }
strong{ font-weight:700; color:var(--ink); }
hr{ border:0; border-top:1px solid var(--border); margin:7mm 0; }

/* Listas */
ul,ol{ margin:0 0 3mm; padding-left:5.5mm; }
li{ margin:0 0 1.2mm; }
li::marker{ color:var(--primary); font-weight:700; }
ul.tarefas{ list-style:none; padding-left:0; }
ul.tarefas li{ padding-left:7mm; position:relative; }
ul.tarefas li::before{
  content:""; position:absolute; left:0; top:1.15mm;
  width:3.4mm; height:3.4mm; border:1.4px solid var(--border-2);
  border-radius:1px; background:#fff;
}

/* Código */
code{
  font-family:"JetBrains Mono","Cascadia Code",Consolas,"Liberation Mono",monospace;
  font-size:.87em; background:var(--bg); border:1px solid var(--border);
  border-radius:3px; padding:.4mm 1.3mm; color:var(--ink);
}
code.tela{
  background:var(--primary-soft); border-color:var(--border-2);
  color:var(--primary-dark); font-weight:600; letter-spacing:.02em;
}
pre{
  background:#f7faf6; border:1px solid var(--border); border-left:3px solid var(--primary);
  border-radius:4px; padding:3.5mm 4mm; margin:0 0 3.5mm; overflow:hidden;
  break-inside:avoid;
}
pre code{
  background:none; border:0; padding:0; font-size:8.1pt; line-height:1.42;
  white-space:pre; display:block; color:#26402f;
}

/* Tabelas */
table{
  width:100%; border-collapse:collapse; margin:0 0 4mm;
  font-size:8.7pt; break-inside:auto;
}
thead{ display:table-header-group; }
tr{ break-inside:avoid; }
th{
  background:var(--ink); color:#fff; font-weight:600; text-align:left;
  padding:2.1mm 2.4mm; border:1px solid var(--ink);
  font-size:8.4pt; letter-spacing:.01em;
}
/* nada dentro do cabeçalho pode voltar à cor escura do texto */
th strong, th em, th a, th code{
  color:#fff !important; background:none; border:0;
}
td{
  padding:1.9mm 2.4mm; border:1px solid var(--border);
  vertical-align:top;
}
tbody tr:nth-child(even) td{ background:var(--bg); }
td code{ font-size:.85em; }

/* tabela-ficha (sem cabeçalho): 1ª coluna vira rótulo */
table.ficha tbody tr td{ background:#fff; }
table.ficha tbody tr:nth-child(even) td{ background:var(--bg); }
table.ficha td:first-child{
  width:34%; font-weight:600; color:var(--ink);
  border-left:2.5px solid var(--primary);
}

/* Citações e destaques */
blockquote{
  margin:0 0 3.5mm; padding:3mm 4mm; background:var(--bg);
  border-left:3px solid var(--primary); border-radius:0 4px 4px 0;
  color:var(--ink); break-inside:avoid;
}
blockquote p:last-child{ margin-bottom:0; }
blockquote strong{ color:var(--primary-dark); }

.callout{
  margin:0 0 3.5mm; padding:2.8mm 3.5mm 2.8mm 4mm;
  border-radius:0 4px 4px 0; border-left:3px solid; break-inside:avoid;
  font-size:9.3pt;
}
.callout p{ margin:0; }
.callout p + p{ margin-top:1.5mm; }
.callout .rot{
  display:block; font-size:6.9pt; font-weight:700; letter-spacing:.14em;
  text-transform:uppercase; margin:0 0 1.4mm; font-style:normal;
}
.c-warn{ background:var(--warn-bg); border-color:var(--warn); }
.c-warn .rot{ color:var(--warn); }
.c-star{ background:var(--star-bg); border-color:var(--star); }
.c-star .rot{ color:var(--star); }
.c-tip { background:var(--tip-bg);  border-color:var(--tip); }
.c-tip .rot{ color:var(--tip); }
.c-exe { background:var(--primary-soft); border-color:var(--primary-dark); }
.c-exe .rot{ color:var(--primary-dark); }
.c-say {
  background:var(--say-bg); border-color:var(--say);
  font-style:italic; color:#22412e;
}
.c-say .rot{ color:var(--say); }

/* Índice */
.indice{ background:var(--bg); border:1px solid var(--border); border-radius:5px;
  padding:4mm 5mm; margin:0 0 5mm; break-inside:avoid; }
.indice table{ margin:0; font-size:9pt; }
.indice th{ background:none; color:var(--ink); border:0; border-bottom:1.5px solid var(--border-2); }
.indice td{ border:0; border-bottom:1px solid var(--border); background:none !important; }

/* Evita órfãos feios */
h2 + p, h3 + p, h2 + table, h3 + table, h2 + ul, h3 + ul{ break-before:avoid; }
"""

# ─────────────────────────────────────────────────────────────────────────────
# Markdown → HTML (subconjunto usado nos documentos)
# ─────────────────────────────────────────────────────────────────────────────
TELA_RE = re.compile(r"^V[A-Z]{2,4}\d{3,4}(?:ITE)?$")

# ── Emojis → tipografia ──────────────────────────────────────────────────────
# Alguns carregam significado (sim/não) e viram símbolos tipográficos sóbrios;
# o resto é decorativo e sai. Setas, caixas e bullets são preservados.
_SENT = {"✅": "\x01", "✔️": "\x01", "✔": "\x01",
         "❌": "\x02", "✖️": "\x02", "✗": "\x02", "✘": "\x02"}
_VOLTA = {"\x01": "✓", "\x02": "✗"}
EMOJI_RE = re.compile(
    "["
    "\U0001F000-\U0001FAFF"   # pictogramas
    "\U00002600-\U000027BF"   # símbolos diversos + dingbats
    "\U00002B00-\U00002BFF"   # estrelas e afins
    "\U0000FE00-\U0000FE0F"   # seletores de variação
    "\U0000200D"              # ZWJ
    "]+"
)


def sem_emoji(s: str) -> str:
    """Remove emoji sem mexer em espaçamento (diagramas ASCII dependem dele)."""
    for k, v in _SENT.items():
        s = s.replace(k, v)
    s = EMOJI_RE.sub("", s)
    for k, v in _VOLTA.items():
        s = s.replace(k, v)
    return s


def esc(s: str) -> str:
    return _html.escape(sem_emoji(s), quote=False)


def inline(txt: str) -> str:
    """Formatação inline: código, negrito, itálico, links."""
    partes, buf, i = [], [], 0
    # 1) protege trechos de código
    trechos = []

    def guarda(m):
        trechos.append(m.group(1))
        return f"\x00{len(trechos)-1}\x00"

    txt = re.sub(r"`([^`]+)`", guarda, txt)
    txt = esc(txt)
    txt = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', txt)
    txt = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", txt)
    txt = re.sub(r"(?<![\w*])\*([^*\n]+)\*(?![\w*])", r"<em>\1</em>", txt)

    def devolve(m):
        c = trechos[int(m.group(1))]
        cls = " class=\"tela\"" if TELA_RE.match(c) else ""
        return f"<code{cls}>{esc(c)}</code>"

    return re.sub(r"\x00(\d+)\x00", devolve, txt)


def split_celulas(linha: str):
    """Divide uma linha de tabela respeitando crases."""
    linha = linha.strip()
    if linha.startswith("|"):
        linha = linha[1:]
    if linha.endswith("|"):
        linha = linha[:-1]
    out, atual, cra = [], [], False
    for ch in linha:
        if ch == "`":
            cra = not cra
        if ch == "|" and not cra:
            out.append("".join(atual)); atual = []
        else:
            atual.append(ch)
    out.append("".join(atual))
    return [c.strip() for c in out]


def alinhamento(sep: str):
    res = []
    for c in split_celulas(sep):
        e, d = c.startswith(":"), c.endswith(":")
        res.append("center" if e and d else "right" if d else "left")
    return res


CALLOUTS = [("⚠️", "c-warn", "Atenção"), ("⚠", "c-warn", "Atenção"),
            ("⭐", "c-star", "Ponto-chave"), ("💡", "c-tip", "Dica"),
            ("🗣", "c-say", "Fala do instrutor"), ("🎯", "c-exe", "Exercício")]


def classe_callout(txt: str):
    """Devolve (classe, rótulo) a partir do marcador no início do bloco."""
    limpo = re.sub(r"^\s*(?:>\s*)?(?:#+\s*)?", "", txt)
    for marca, cls, rot in CALLOUTS:
        if limpo.startswith(marca):
            return cls, rot
    return None, None


def remover_titulo_generico_callout(txt: str) -> str:
    """Evita imprimir "ATENÇÃO" e, logo abaixo, outro "Atenção" redundante."""
    return re.sub(
        r"^\s*(?:#{1,6}\s*)?(?:\*\*|__)?Aten[cç][aã]o(?:\*\*|__)?\s*$",
        "",
        txt,
        flags=re.IGNORECASE,
    )


def md_para_html(md: str) -> str:
    linhas = md.split("\n")
    out, i, n = [], 0, len(linhas)
    primeiro_h1 = True

    while i < n:
        ln = linhas[i]

        # bloco de código
        if ln.lstrip().startswith("```"):
            i += 1
            corpo = []
            while i < n and not linhas[i].lstrip().startswith("```"):
                corpo.append(linhas[i]); i += 1
            i += 1
            out.append("<pre><code>" + esc("\n".join(corpo)) + "</code></pre>")
            continue

        # tabela
        if ln.startswith("|") and i + 1 < n and re.match(r"^\|[\s:|-]+\|?\s*$", linhas[i + 1]):
            cab = split_celulas(ln)
            al = alinhamento(linhas[i + 1])
            i += 2
            corpo = []
            while i < n and linhas[i].startswith("|"):
                corpo.append(split_celulas(linhas[i])); i += 1
            trs = []
            for row in corpo:
                tds = "".join(
                    f'<td style="text-align:{al[k] if k < len(al) else "left"}">{inline(c)}</td>'
                    for k, c in enumerate(row)
                )
                trs.append(f"<tr>{tds}</tr>")
            # cabeçalho todo vazio → tabela de atributos, sem faixa escura
            if any(c.strip() for c in cab):
                th = "".join(
                    f'<th style="text-align:{al[k] if k < len(al) else "left"}">{inline(c)}</th>'
                    for k, c in enumerate(cab)
                )
                out.append(f"<table><thead><tr>{th}</tr></thead>"
                           f"<tbody>{''.join(trs)}</tbody></table>")
            else:
                out.append(f'<table class="ficha"><tbody>{"".join(trs)}</tbody></table>')
            continue

        # regra horizontal
        if re.match(r"^-{3,}\s*$", ln):
            out.append("<hr>"); i += 1; continue

        # título
        m = re.match(r"^(#{1,6})\s+(.*)$", ln)
        if m:
            nivel = min(len(m.group(1)), 4)
            texto = m.group(2).strip()
            attr = ""
            if nivel == 1 and primeiro_h1:
                attr = ' class="primeiro"'
                primeiro_h1 = False
            out.append(f"<h{nivel}{attr}>{inline(texto)}</h{nivel}>")
            i += 1
            continue

        # citação (agrupa linhas consecutivas)
        if ln.startswith(">"):
            bloco = []
            while i < n and linhas[i].startswith(">"):
                bloco.append(re.sub(r"^>\s?", "", linhas[i])); i += 1
            cls, rot = classe_callout(bloco[0]) if bloco else (None, None)
            if cls:
                # tira o marcador antes de recursar, senão o bloco interno
                # é reclassificado e sai uma caixa dentro da outra
                bloco[0] = re.sub(r"^(\s*(?:#+\s*)?)(?:⚠️|⚠|⭐|💡|🗣|🎯)\s*",
                                  r"\1", bloco[0])
                if cls == "c-warn":
                    bloco[0] = remover_titulo_generico_callout(bloco[0])
            interno = md_para_html("\n".join(bloco))
            if cls:
                out.append(f'<div class="callout {cls}">'
                           f'<span class="rot">{rot}</span>{interno}</div>')
            else:
                out.append(f"<blockquote>{interno}</blockquote>")
            continue

        # listas
        if re.match(r"^\s*[-*]\s+", ln) or re.match(r"^\s*\d+\.\s+", ln):
            ordenada = bool(re.match(r"^\s*\d+\.\s+", ln))
            itens, tarefa = [], False
            while i < n and (re.match(r"^\s*[-*]\s+", linhas[i]) or re.match(r"^\s*\d+\.\s+", linhas[i])):
                t = re.sub(r"^\s*(?:[-*]|\d+\.)\s+", "", linhas[i])
                mt = re.match(r"^\[([ xX])\]\s*(.*)$", t)
                if mt:
                    tarefa = True
                    t = mt.group(2)
                itens.append(f"<li>{inline(t)}</li>")
                i += 1
            tag = "ol" if ordenada else "ul"
            cls = ' class="tarefas"' if tarefa else ""
            out.append(f"<{tag}{cls}>{''.join(itens)}</{tag}>")
            continue

        # linha em branco
        if not ln.strip():
            i += 1; continue

        # parágrafo
        bloco = []
        while i < n and linhas[i].strip() and not re.match(
            r"^(#{1,6}\s|\||>|```|-{3,}\s*$|\s*[-*]\s+|\s*\d+\.\s+)", linhas[i]
        ):
            bloco.append(linhas[i]); i += 1
        cls, rot = classe_callout(bloco[0]) if bloco else (None, None)
        aviso_generico = False
        if cls == "c-warn" and bloco:
            sem_marcador = re.sub(r"^\s*(?:⚠️|⚠)\s*", "", bloco[0])
            if remover_titulo_generico_callout(sem_marcador) == "":
                bloco[0] = ""
                aviso_generico = True
        texto = "<br>".join(inline(b.rstrip()) for b in bloco)
        if cls:
            # se logo abaixo vier uma citação, ela faz parte do mesmo destaque
            # (padrão "🗣 Fala (x):" seguido da fala entre aspas)
            extra = ""
            if i < n and linhas[i].startswith(">"):
                cit = []
                while i < n and linhas[i].startswith(">"):
                    cit.append(re.sub(r"^>\s?", "", linhas[i])); i += 1
                extra = md_para_html("\n".join(cit))
            if aviso_generico and i < n and re.match(r"^\s*[-*]\s+", linhas[i]):
                itens = []
                while i < n and re.match(r"^\s*[-*]\s+", linhas[i]):
                    item = re.sub(r"^\s*[-*]\s+", "", linhas[i])
                    i += 1
                    continuacao = []
                    while (i < n and linhas[i].strip()
                           and not re.match(r"^\s*[-*]\s+", linhas[i])
                           and not re.match(r"^(#{1,6}\s|\||>|```|-{3,}\s*$)", linhas[i])):
                        continuacao.append(linhas[i].strip())
                        i += 1
                    conteudo = " ".join([item, *continuacao])
                    itens.append(f"<li>{inline(conteudo)}</li>")
                extra += f"<ul>{''.join(itens)}</ul>"
            corpo = f"<p>{texto}</p>" if texto.strip() else ""
            out.append(f'<div class="callout {cls}">'
                       f'<span class="rot">{rot}</span>{corpo}{extra}</div>')
        else:
            out.append(f"<p>{texto}</p>")

    return "\n".join(out)


# ─────────────────────────────────────────────────────────────────────────────
# Documentos
# ─────────────────────────────────────────────────────────────────────────────
DIAS = {
    "dia-1-fundacao": ("DIA 1", "Fundação",
                       "Cadastros, Parametrização, Plataforma e Engenharia"),
    "dia-2-suprimentos-estoque": ("DIA 2", "Abastecimento",
                                  "Suprimentos, Compras, Recebimento, Inspeção, Estoque e Importação"),
    "dia-3-pcp-producao": ("DIA 3", "Coração Industrial",
                           "PCP (MRP → CRP → APS), Chão de Fábrica, Qualidade e Manutenção"),
    "dia-4-comercial-fiscal-financeiro": ("DIA 4", "Giro & Retaguarda",
                                          "Comercial, Expedição, Custo, Fiscal, Financeiro e Contabilidade"),
}
TIPOS = {
    "manual-instrutor": ("Manual do Instrutor", "Documento de condução"),
    "apostila-participante": ("Apostila do Participante", "Material do aluno"),
    "roteiro-cronometrado": ("Roteiro Cronometrado", "Agenda de bolso"),
}


def capa(dia_lbl, tema, subtitulo, tipo_lbl, tipo_sub, extra=""):
    return f"""
<section class="capa">
  <div class="capa-marca">Venture ERP · Treinamento</div>
  <div class="capa-dia"><small>{esc(tipo_lbl)}</small>{esc(dia_lbl)}</div>
  <div class="capa-titulo">{esc(tema)}</div>
  <div class="capa-sub">{esc(subtitulo)}</div>
  <div class="capa-regua"></div>
  <div class="capa-meta">
    <div>Documento<b>{esc(tipo_sub)}</b></div>
    <div>Carga horária<b>4 horas</b></div>
    <div>Segmento<b>Indústria Metalúrgica</b></div>
    {extra}
  </div>
  <div class="capa-rodape">
    <span>Programa de 16 horas · 4 dias</span><span>Uso interno</span>
  </div>
</section>"""


def monta(titulo, capa_html, corpo_html):
    return f"""<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>{esc(titulo)}</title>
<style>{CSS}</style>
</head><body>
{capa_html}
<main class="doc">
{corpo_html}
</main>
</body></html>"""


def navegador():
    import os
    # 1) navegador no PATH
    for c in ("chromium", "chromium-browser", "google-chrome", "google-chrome-stable",
              "microsoft-edge", "brave-browser"):
        p = shutil.which(c)
        if p:
            return p
    # 2) Chromium baixado pelo Playwright (usado pelos testes do projeto)
    cache = Path(os.path.expanduser("~/.cache/ms-playwright"))
    if cache.exists():
        for padrao in ("chromium-*/chrome-linux*/chrome",
                       "chromium_headless_shell-*/chrome-headless-shell-linux*/chrome-headless-shell"):
            achados = sorted(cache.glob(padrao))
            if achados:
                return str(achados[-1])
    return None


_LOG = []


def log(msg=""):
    _LOG.append(str(msg))
    print(msg)


def main():
    so_html = "--html" in sys.argv
    SAIDA.mkdir(parents=True, exist_ok=True)
    nav = None if so_html else navegador()
    log(f"navegador: {nav or 'nenhum'}")

    PDF_DIR.mkdir(parents=True, exist_ok=True)
    alvos = []
    readme = RAIZ / "README.md"
    if readme.exists():
        alvos.append((readme, "00-visao-geral", "00 — Visão Geral do Programa",
                      "VISÃO GERAL", "Programa de Treinamento",
                      "Estrutura, método e cobertura dos 4 dias",
                      "Guia do Programa", "Documento-mestre"))
    for pasta, (dia_lbl, tema, sub) in DIAS.items():
        n = dia_lbl.split()[-1]
        subpasta = f"Dia {n} — {tema}"
        for arq, (tipo_lbl, tipo_sub) in TIPOS.items():
            p = RAIZ / pasta / f"{arq}.md"
            if p.exists():
                alvos.append((p, f"{pasta}__{arq}",
                              f"{subpasta}/Dia {n} — {tipo_lbl}",
                              dia_lbl, tema, sub, tipo_lbl, tipo_sub))

    gerados = []
    for src, slug, nome_pdf, dia_lbl, tema, sub, tipo_lbl, tipo_sub in alvos:
        md = src.read_text(encoding="utf-8")
        # remove o H1 inicial (já está na capa)
        md = re.sub(r"\A#\s+[^\n]*\n", "", md)
        corpo = md_para_html(md)
        titulo = f"{dia_lbl} — {tema} · {tipo_lbl}"
        htm = monta(titulo, capa(dia_lbl, tema, sub, tipo_lbl, tipo_sub), corpo)
        fh = SAIDA / f"{slug}.html"
        fh.write_text(htm, encoding="utf-8")
        gerados.append(fh)
        log(f"  HTML  {fh.name}")

        if nav:
            fp = PDF_DIR / f"{nome_pdf}.pdf"
            fp.parent.mkdir(parents=True, exist_ok=True)
            if fp.exists():
                fp.unlink()
            cmd = [nav, "--headless=new", "--disable-gpu", "--no-sandbox",
                   "--virtual-time-budget=8000", "--no-pdf-header-footer",
                   f"--print-to-pdf={fp}", fh.as_uri()]
            r = subprocess.run(cmd, capture_output=True, timeout=180)
            if fp.exists() and fp.stat().st_size > 0:
                log(f"  PDF   {fp.name}  ({fp.stat().st_size//1024} KB)")
            else:
                log(f"  !! PDF falhou {fh.name}: {r.stderr.decode(errors='replace')[:300]}")

    log(f"\n{len(gerados)} documento(s) em {SAIDA}")
    if not nav and not so_html:
        log("\nNenhum navegador headless encontrado.")
        log("Abra os HTML no navegador e use Ctrl+P → 'Salvar como PDF'")
        log("→ marque 'Gráficos de plano de fundo'.")
    (SAIDA.parent / "build.log").write_text("\n".join(_LOG), encoding="utf-8")


if __name__ == "__main__":
    main()
