import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { fetchReleaseNotes, getClientVersion, type ReleaseNote } from '@/services/versionService';

/** Novidades: o que cada atualização do app traz (GitHub Releases do desktop). */
export function ReleaseNotesDialog({ onClose }: { onClose: () => void }): JSX.Element {
  const [notes, setNotes] = useState<ReleaseNote[] | null>(null);
  const [current, setCurrent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void getClientVersion().then((v) => alive && setCurrent(v));
    fetchReleaseNotes()
      .then((list) => alive && setNotes(list))
      .catch((e) => alive && setError(e instanceof Error ? e.message : 'Não foi possível carregar as novidades.'));
    return () => {
      alive = false;
    };
  }, []);

  function fmtDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR');
  }

  return (
    <div className="rnd-overlay" role="dialog" aria-modal="true" aria-label="Novidades" onMouseDown={onClose}>
      <style>{`
        .rnd-overlay{position:fixed;inset:0;background:rgba(13,31,18,.55);display:flex;align-items:center;justify-content:center;z-index:1000;backdrop-filter:blur(2px);}
        .rnd-card{width:100%;max-width:560px;max-height:82vh;display:flex;flex-direction:column;background:#f7faf6;border:1px solid #cde0d4;border-radius:14px;box-shadow:0 20px 60px rgba(13,31,18,.35);overflow:hidden;font-family:'DM Sans',system-ui,sans-serif;}
        .rnd-head{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;background:#162e20;color:#dff0e2;}
        .rnd-head h3{margin:0;font-size:15px;font-weight:600;}
        .rnd-cur{font-size:11.5px;color:#9dc4a8;margin-top:2px;}
        .rnd-x{background:none;border:none;color:#9dc4a8;font-size:20px;cursor:pointer;line-height:1;}
        .rnd-body{padding:8px 18px 18px;overflow-y:auto;}
        .rnd-item{padding:16px 0;border-bottom:1px solid #e2ece4;}
        .rnd-item:last-child{border-bottom:none;}
        .rnd-ver{display:flex;align-items:baseline;gap:10px;}
        .rnd-tag{font-weight:700;color:#162e20;font-size:14px;}
        .rnd-title{font-size:12.5px;color:#4e7060;font-weight:500;}
        .rnd-badge{font-size:10px;font-weight:700;color:#1d6b37;background:#e3f3e8;border:1px solid #b7e0c2;border-radius:20px;padding:2px 8px;}
        .rnd-date{font-size:11px;color:#7a9c84;margin-left:auto;}
        .rnd-notes{font-size:13px;color:#33493b;line-height:1.6;margin-top:10px;}
        .rnd-notes h4{margin:14px 0 6px;font-size:12.5px;font-weight:700;color:#1d3a27;text-transform:uppercase;letter-spacing:.4px;}
        .rnd-notes h4:first-child{margin-top:0;}
        .rnd-notes p{margin:6px 0;}
        .rnd-notes ul{margin:6px 0;padding-left:2px;list-style:none;display:flex;flex-direction:column;gap:5px;}
        .rnd-notes li{position:relative;padding-left:18px;}
        .rnd-notes li::before{content:'';position:absolute;left:2px;top:8px;width:5px;height:5px;border-radius:50%;background:#3e9654;}
        .rnd-notes strong{color:#1d3a27;font-weight:600;}
        .rnd-empty,.rnd-err{font-size:13px;color:#6a8a74;padding:24px 0;text-align:center;}
        .rnd-loading{font-size:13px;color:#6a8a74;padding:24px 0;text-align:center;}
      `}</style>
      <div className="rnd-card" onMouseDown={(e) => e.stopPropagation()}>
        <div className="rnd-head">
          <div>
            <h3>Novidades</h3>
            {current && <div className="rnd-cur">Versão instalada: v{current}</div>}
          </div>
          <button className="rnd-x" onClick={onClose} aria-label="Fechar">×</button>
        </div>
        <div className="rnd-body">
          {error && <div className="rnd-err">{error}</div>}
          {!error && notes === null && <div className="rnd-loading">Carregando novidades…</div>}
          {!error && notes && notes.length === 0 && <div className="rnd-empty">Nenhuma versão publicada ainda.</div>}
          {!error &&
            notes?.map((n) => (
              <div className="rnd-item" key={n.version || n.name}>
                <div className="rnd-ver">
                  <span className="rnd-tag">v{n.version}</span>
                  {n.name && n.name !== `v${n.version}` && n.name !== n.version && <span className="rnd-title">{n.name}</span>}
                  {n.version === current && <span className="rnd-badge">ATUAL</span>}
                  <span className="rnd-date">{fmtDate(n.date)}</span>
                </div>
                {n.notes.trim() ? (
                  <div className="rnd-notes">{renderNotes(n.notes)}</div>
                ) : (
                  <div className="rnd-notes" style={{ color: '#8aa694' }}>Sem notas para esta versão.</div>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Converte o corpo (markdown) de uma release do GitHub em blocos limpos e
 * legíveis — sem `#`, `*` e `**` crus na tela. Trata títulos, listas e negrito;
 * ignora o rodapé automático ("Full Changelog") e links soltos.
 */
function renderNotes(md: string): ReactNode {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let list: ReactNode[] = [];
  let key = 0;

  const flushList = () => {
    if (list.length) {
      blocks.push(<ul key={`ul-${key++}`}>{list}</ul>);
      list = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    // Ignora o rodapé auto-gerado e linhas de só-link/só-hash.
    if (!trimmed) { flushList(); continue; }
    if (/^\*{0,2}full changelog\*{0,2}\s*:/i.test(trimmed)) continue;
    if (/^https?:\/\/\S+$/.test(trimmed)) continue;

    const heading = trimmed.match(/^#{1,6}\s+(.*)$/);
    if (heading) {
      flushList();
      blocks.push(<h4 key={`h-${key++}`}>{inline(heading[1])}</h4>);
      continue;
    }

    const bullet = trimmed.match(/^[-*+]\s+(.*)$/) || trimmed.match(/^\d+[.)]\s+(.*)$/);
    if (bullet) {
      list.push(<li key={`li-${key++}`}>{inline(bullet[1])}</li>);
      continue;
    }

    flushList();
    blocks.push(<p key={`p-${key++}`}>{inline(trimmed)}</p>);
  }
  flushList();

  return blocks.length ? blocks : <p>{md.trim()}</p>;
}

/** Formatação inline: **negrito**, `código`, [texto](url) → texto; remove `*`/`_` soltos. */
function inline(text: string): ReactNode {
  // Links [texto](url) → texto; remove URLs cruas mantendo o rótulo.
  let s = text.replace(/\[([^\]]+)\]\((?:[^)]+)\)/g, '$1');
  s = s.replace(/`([^`]+)`/g, '$1');

  const parts: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|__([^_]+)__/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) parts.push(<Fragment key={`t-${k++}`}>{clean(s.slice(last, m.index))}</Fragment>);
    parts.push(<strong key={`b-${k++}`}>{clean(m[1] ?? m[2] ?? '')}</strong>);
    last = m.index + m[0].length;
  }
  if (last < s.length) parts.push(<Fragment key={`t-${k++}`}>{clean(s.slice(last))}</Fragment>);
  return parts;
}

/** Remove marcadores de ênfase soltos que sobraram (`*`, `_`). */
function clean(text: string): string {
  return text.replace(/(\*|_)(?=\S)|(?<=\S)(\*|_)/g, '');
}
