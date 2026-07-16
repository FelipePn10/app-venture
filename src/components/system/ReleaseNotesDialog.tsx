import { useEffect, useState } from 'react';
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
        .rnd-item{padding:14px 0;border-bottom:1px solid #e2ece4;}
        .rnd-item:last-child{border-bottom:none;}
        .rnd-ver{display:flex;align-items:baseline;gap:10px;}
        .rnd-tag{font-weight:700;color:#162e20;font-size:14px;}
        .rnd-badge{font-size:10px;font-weight:700;color:#1d6b37;background:#e3f3e8;border:1px solid #b7e0c2;border-radius:20px;padding:2px 8px;}
        .rnd-date{font-size:11px;color:#7a9c84;margin-left:auto;}
        .rnd-notes{white-space:pre-wrap;font-size:12.5px;color:#33493b;line-height:1.55;margin-top:8px;}
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
                  {n.version === current && <span className="rnd-badge">ATUAL</span>}
                  <span className="rnd-date">{fmtDate(n.date)}</span>
                </div>
                {n.notes ? (
                  <div className="rnd-notes">{n.notes}</div>
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
