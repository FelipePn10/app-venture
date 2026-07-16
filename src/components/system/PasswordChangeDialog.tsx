import { FormEvent, useState } from 'react';
import { login } from '@/services/authService';
import { requestPasswordChange, completePasswordChange } from '@/services/passwordChangeService';

/**
 * Troca de senha a partir da tela de login. O backend exige autenticação, então
 * o fluxo usa e-mail + senha ATUAL para obter um token (sem logar no app) e:
 *  - Solicitar: cria a solicitação (um ADMIN precisa aprovar).
 *  - Concluir: após aprovada, define a nova senha (informando o nº da solicitação).
 * Ver docs/dev/troca-de-senha.md no backend.
 */

const LS_LAST_REQUEST = 'venture_pwd_change_request';

function readLastRequestId(email: string): string {
  try {
    const raw = localStorage.getItem(LS_LAST_REQUEST);
    if (!raw) return '';
    const map = JSON.parse(raw) as Record<string, string>;
    return map[email.trim().toLowerCase()] ?? '';
  } catch {
    return '';
  }
}
function saveLastRequestId(email: string, id: string): void {
  try {
    const raw = localStorage.getItem(LS_LAST_REQUEST);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    map[email.trim().toLowerCase()] = id;
    localStorage.setItem(LS_LAST_REQUEST, JSON.stringify(map));
  } catch {
    /* noop */
  }
}

function errText(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

type Tab = 'request' | 'complete';

export function PasswordChangeDialog({ onClose }: { onClose: () => void }): JSX.Element {
  const [tab, setTab] = useState<Tab>('request');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [reason, setReason] = useState('');
  const [requestId, setRequestId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function switchTab(next: Tab): void {
    setTab(next);
    setError(null);
    setSuccess(null);
    if (next === 'complete' && email) setRequestId((id) => id || readLastRequestId(email));
  }

  async function authenticate(): Promise<string> {
    const res = await login({ email, password: currentPassword });
    if (!res.token) throw new Error('Não foi possível autenticar com a senha atual.');
    return res.token;
  }

  async function onRequest(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    if (!email.trim() || !currentPassword) {
      setError('Informe e-mail e senha atual.');
      return;
    }
    setBusy(true);
    try {
      const token = await authenticate();
      const created = await requestPasswordChange(reason.trim(), token);
      const id = String(created.id ?? created.request_id ?? '');
      if (id) {
        saveLastRequestId(email, id);
        setRequestId(id);
      }
      setSuccess(
        `Solicitação${id ? ` #${id}` : ''} registrada. Um administrador precisa aprovar (expira em 15 min). ` +
          'Depois volte na aba "Concluir" para definir a nova senha.',
      );
    } catch (e) {
      setError(errText(e, 'Falha ao solicitar a troca de senha.'));
    } finally {
      setBusy(false);
    }
  }

  async function onComplete(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    if (!email.trim() || !currentPassword || !requestId.trim()) {
      setError('Informe e-mail, senha atual e o nº da solicitação aprovada.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('A nova senha e a confirmação não coincidem.');
      return;
    }
    setBusy(true);
    try {
      const token = await authenticate();
      await completePasswordChange(requestId.trim(), currentPassword, newPassword, confirmPassword, token);
      setSuccess('Senha alterada com sucesso. Faça login com a nova senha.');
    } catch (e) {
      setError(errText(e, 'Falha ao concluir a troca. Verifique a aprovação e a política de senha.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pcd-overlay" role="dialog" aria-modal="true" aria-label="Trocar senha" onMouseDown={onClose}>
      <style>{`
        .pcd-overlay{position:fixed;inset:0;background:rgba(13,31,18,.55);display:flex;align-items:center;justify-content:center;z-index:1000;backdrop-filter:blur(2px);}
        .pcd-card{width:100%;max-width:440px;background:#f7faf6;border:1px solid #cde0d4;border-radius:14px;box-shadow:0 20px 60px rgba(13,31,18,.35);overflow:hidden;font-family:'DM Sans',system-ui,sans-serif;}
        .pcd-head{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;background:#162e20;color:#dff0e2;}
        .pcd-head h3{margin:0;font-size:15px;font-weight:600;}
        .pcd-x{background:none;border:none;color:#9dc4a8;font-size:20px;cursor:pointer;line-height:1;}
        .pcd-tabs{display:flex;gap:4px;padding:12px 18px 0;}
        .pcd-tab{flex:1;padding:9px;border:none;background:#e6efe7;color:#3a5e47;border-radius:8px 8px 0 0;font-weight:600;font-size:12.5px;cursor:pointer;}
        .pcd-tab.active{background:#fff;color:#162e20;box-shadow:inset 0 -2px 0 #3e9654;}
        .pcd-body{padding:16px 18px 20px;}
        .pcd-label{display:block;font-size:11px;font-weight:600;letter-spacing:.4px;text-transform:uppercase;color:#3a5e47;margin:10px 0 5px;}
        .pcd-input{width:100%;height:42px;border:1.5px solid #cde0d4;border-radius:9px;padding:0 12px;font-size:13.5px;color:#162e20;background:#fff;outline:none;}
        .pcd-input:focus{border-color:#3e9654;box-shadow:0 0 0 3px rgba(62,150,84,.13);}
        textarea.pcd-input{height:60px;padding:8px 12px;resize:vertical;}
        .pcd-hint{font-size:11px;color:#6a8a74;margin-top:8px;line-height:1.5;}
        .pcd-btn{width:100%;height:46px;margin-top:16px;border:none;border-radius:10px;background:#162e20;color:#dff0e2;font-weight:600;font-size:13.5px;cursor:pointer;}
        .pcd-btn:disabled{opacity:.6;cursor:not-allowed;}
        .pcd-msg{margin-top:14px;padding:10px 12px;border-radius:8px;font-size:12.5px;line-height:1.5;}
        .pcd-err{background:#fff5f5;border:1px solid #fcc;color:#b91c1c;}
        .pcd-ok{background:#f0f9f2;border:1px solid #b7e0c2;color:#1d6b37;}
      `}</style>
      <div className="pcd-card" onMouseDown={(e) => e.stopPropagation()}>
        <div className="pcd-head">
          <h3>Trocar senha</h3>
          <button className="pcd-x" onClick={onClose} aria-label="Fechar">×</button>
        </div>
        <div className="pcd-tabs">
          <button className={`pcd-tab${tab === 'request' ? ' active' : ''}`} onClick={() => switchTab('request')} type="button">
            1. Solicitar
          </button>
          <button className={`pcd-tab${tab === 'complete' ? ' active' : ''}`} onClick={() => switchTab('complete')} type="button">
            2. Concluir
          </button>
        </div>

        {tab === 'request' ? (
          <form className="pcd-body" onSubmit={onRequest}>
            <label className="pcd-label">E-mail</label>
            <input className="pcd-input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com" />
            <label className="pcd-label">Senha atual</label>
            <input className="pcd-input" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            <label className="pcd-label">Motivo (opcional)</label>
            <textarea className="pcd-input" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Ex.: primeira troca, senha comprometida…" />
            <button className="pcd-btn" type="submit" disabled={busy}>{busy ? 'Enviando…' : 'Enviar solicitação'}</button>
            <p className="pcd-hint">Um administrador da sua empresa precisa aprovar. A aprovação expira em 15 minutos e é de uso único.</p>
          </form>
        ) : (
          <form className="pcd-body" onSubmit={onComplete}>
            <label className="pcd-label">E-mail</label>
            <input className="pcd-input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => setRequestId((id) => id || readLastRequestId(email))} placeholder="voce@empresa.com" />
            <label className="pcd-label">Senha atual</label>
            <input className="pcd-input" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            <label className="pcd-label">Nº da solicitação aprovada</label>
            <input className="pcd-input" inputMode="numeric" value={requestId} onChange={(e) => setRequestId(e.target.value)} placeholder="ex.: 12" />
            <label className="pcd-label">Nova senha</label>
            <input className="pcd-input" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <label className="pcd-label">Confirmar nova senha</label>
            <input className="pcd-input" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            <button className="pcd-btn" type="submit" disabled={busy}>{busy ? 'Concluindo…' : 'Concluir troca'}</button>
            <p className="pcd-hint">A nova senha deve ter 12–128 caracteres, com maiúscula, minúscula, número e caractere especial, e ser diferente da atual.</p>
          </form>
        )}

        {error && <div className="pcd-body" style={{ paddingTop: 0 }}><div className="pcd-msg pcd-err" role="alert">{error}</div></div>}
        {success && <div className="pcd-body" style={{ paddingTop: 0 }}><div className="pcd-msg pcd-ok">{success}</div></div>}
      </div>
    </div>
  );
}
