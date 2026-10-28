import { FormEvent, useEffect, useMemo, useState } from 'react';
import { login } from '@/services/authService';
import {
  type SolicitacaoTrocaSenha,
  REGRAS_SENHA, SITUACAO_TROCA_SENHA,
  completePasswordChange, myPasswordChangeRequests, requestPasswordChange, solicitacaoAtiva,
} from '@/services/passwordChangeService';
import { errMessage } from '@/services/fiscalShared';

/**
 * Troca de senha a partir da tela de login. A API exige autenticação, então o
 * usuário confirma e-mail e senha ATUAL (o token fica só na memória do diálogo,
 * sem entrar no sistema) e o diálogo mostra o passo em que a troca está:
 * solicitar, aguardar a aprovação do administrador ou definir a nova senha.
 * Nenhum número ou identificador de solicitação é pedido ao usuário.
 */

// Versões anteriores guardavam o identificador da solicitação no navegador.
const LS_ANTIGO = 'venture_pwd_change_request';

const dataHora = (s?: string) => (s ? new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');

export function PasswordChangeDialog({ onClose }: { onClose: () => void }): JSX.Element {
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [minhas, setMinhas] = useState<SolicitacaoTrocaSenha[]>([]);
  const [reason, setReason] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agora, setAgora] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [concluida, setConcluida] = useState(false);

  useEffect(() => {
    try { localStorage.removeItem(LS_ANTIGO); } catch { /* sem armazenamento local */ }
  }, []);

  const ativa = solicitacaoAtiva(minhas);
  const ultima = minhas[0];
  const expiraEm = ativa?.status === 'APPROVED' && ativa.expires_at ? new Date(ativa.expires_at).getTime() : 0;
  useEffect(() => {
    if (!expiraEm) return undefined;
    const t = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [expiraEm]);
  const restante = Math.max(0, expiraEm - agora);
  const regras = useMemo(() => [
    ...REGRAS_SENHA.map((r) => ({ rotulo: r.rotulo, ok: r.ok(newPassword) })),
    { rotulo: 'Diferente da senha atual', ok: newPassword !== '' && newPassword !== currentPassword },
    { rotulo: 'Confirmação igual', ok: confirmPassword !== '' && confirmPassword === newPassword },
  ], [newPassword, confirmPassword, currentPassword]);

  async function executar(fn: () => Promise<void>, falha: string): Promise<void> {
    setBusy(true); setError(null); setSuccess(null);
    try { await fn(); } catch (e) {
      const m = errMessage(e, falha);
      setError(m.charAt(0).toUpperCase() + m.slice(1));
    } finally { setBusy(false); }
  }

  async function consultar(t: string): Promise<void> {
    setMinhas(await myPasswordChangeRequests(t));
  }

  const entrar = (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !currentPassword) { setError('Informe o e-mail e a senha atual.'); return; }
    void executar(async () => {
      const res = await login({ email: email.trim(), password: currentPassword });
      if (!res.token) throw new Error('Não foi possível confirmar a senha atual.');
      setToken(res.token);
      await consultar(res.token);
    }, 'E-mail ou senha atual incorretos.');
  };

  const solicitar = (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    void executar(async () => {
      await requestPasswordChange(reason.trim(), token);
      setReason('');
      await consultar(token);
      setSuccess('Solicitação registrada. Peça a um administrador da empresa para aprovar e depois clique em "Verificar aprovação".');
    }, 'Não foi possível registrar a solicitação.');
  };

  const concluir = (event: FormEvent) => {
    event.preventDefault();
    if (!token || !ativa) return;
    void executar(async () => {
      await completePasswordChange(ativa.id, currentPassword, newPassword, confirmPassword, token);
      setToken(null); setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setConcluida(true);
      setSuccess('Senha alterada. Entre com a nova senha.');
    }, 'Não foi possível trocar a senha.');
  };

  const verificar = () => { if (token) void executar(() => consultar(token), 'Não foi possível consultar a solicitação.'); };

  const mmss = `${String(Math.floor(Math.ceil(restante / 1000) / 60)).padStart(2, '0')}:${String(Math.ceil(restante / 1000) % 60).padStart(2, '0')}`;

  return (
    <div className="pcd-overlay" role="dialog" aria-modal="true" aria-label="Trocar senha" onMouseDown={onClose}>
      <style>{`
        .pcd-overlay{position:fixed;inset:0;background:rgba(13,31,18,.55);display:flex;align-items:center;justify-content:center;z-index:1000;backdrop-filter:blur(2px);}
        .pcd-card{width:100%;max-width:460px;background:#f7faf6;border:1px solid #cde0d4;border-radius:14px;box-shadow:0 20px 60px rgba(13,31,18,.35);overflow:hidden;font-family:'DM Sans',system-ui,sans-serif;}
        .pcd-head{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;background:#162e20;color:#dff0e2;}
        .pcd-head h3{margin:0;font-size:15px;font-weight:600;}
        .pcd-x{background:none;border:none;color:#9dc4a8;font-size:20px;cursor:pointer;line-height:1;}
        .pcd-steps{display:flex;gap:6px;padding:12px 18px 0;font-size:11px;font-weight:600;color:#6a8a74;}
        .pcd-step{flex:1;padding:6px 0;border-bottom:2px solid #dbe8de;text-align:center;}
        .pcd-step.on{color:#162e20;border-color:#3e9654;}
        .pcd-body{padding:16px 18px 20px;}
        .pcd-label{display:block;font-size:11px;font-weight:600;letter-spacing:.4px;text-transform:uppercase;color:#3a5e47;margin:10px 0 5px;}
        .pcd-input{width:100%;height:42px;border:1.5px solid #cde0d4;border-radius:9px;padding:0 12px;font-size:13.5px;color:#162e20;background:#fff;outline:none;box-sizing:border-box;}
        .pcd-input:focus{border-color:#3e9654;box-shadow:0 0 0 3px rgba(62,150,84,.13);}
        .pcd-input:disabled{background:#eef4ef;color:#5b7a65;}
        .pcd-hint{font-size:11.5px;color:#6a8a74;margin-top:10px;line-height:1.5;}
        .pcd-state{padding:10px 12px;border-radius:9px;background:#fff;border:1px solid #cde0d4;font-size:12.5px;color:#162e20;line-height:1.55;}
        .pcd-state strong{font-weight:600;}
        .pcd-rules{list-style:none;margin:10px 0 0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:3px 10px;font-size:11.5px;}
        .pcd-rules li{color:#8aa392;} .pcd-rules li.ok{color:#1d6b37;}
        .pcd-btn{width:100%;height:46px;margin-top:16px;border:none;border-radius:10px;background:#162e20;color:#dff0e2;font-weight:600;font-size:13.5px;cursor:pointer;}
        .pcd-btn.sec{background:#e6efe7;color:#162e20;}
        .pcd-btn:disabled{opacity:.6;cursor:not-allowed;}
        .pcd-msg{margin-top:14px;padding:10px 12px;border-radius:8px;font-size:12.5px;line-height:1.5;}
        .pcd-err{background:#fff5f5;border:1px solid #fcc;color:#b91c1c;}
        .pcd-ok{background:#f0f9f2;border:1px solid #b7e0c2;color:#1d6b37;}
      `}</style>
      <div className="pcd-card" onMouseDown={(e) => e.stopPropagation()}>
        <div className="pcd-head">
          <h3>Trocar senha</h3>
          <button className="pcd-x" onClick={onClose} aria-label="Fechar" type="button">×</button>
        </div>
        <div className="pcd-steps" aria-hidden="true">
          <span className={`pcd-step${!ativa ? ' on' : ''}`}>1. Solicitar</span>
          <span className={`pcd-step${ativa?.status === 'PENDING' ? ' on' : ''}`}>2. Aprovação</span>
          <span className={`pcd-step${ativa?.status === 'APPROVED' || concluida ? ' on' : ''}`}>3. Nova senha</span>
        </div>

        {!token && !concluida && (
          <form className="pcd-body" onSubmit={entrar}>
            <label className="pcd-label">E-mail</label>
            <input className="pcd-input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com" />
            <label className="pcd-label">Senha atual</label>
            <input className="pcd-input" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            <button className="pcd-btn" type="submit" disabled={busy}>{busy ? 'Verificando…' : 'Continuar'}</button>
            <p className="pcd-hint">A troca passa pela aprovação de um administrador da sua empresa. A aprovação vale 15 minutos e uma única vez.</p>
          </form>
        )}

        {token && !ativa && (
          <form className="pcd-body" onSubmit={solicitar}>
            {ultima && (
              <div className="pcd-state">
                Última solicitação ({dataHora(ultima.created_at)}): <strong>{SITUACAO_TROCA_SENHA[ultima.status]?.rotulo}</strong>
                {ultima.status === 'REJECTED' && ultima.rejection_reason ? ` — ${ultima.rejection_reason}` : ''}
                {ultima.status === 'EXPIRED' ? ' — a aprovação não foi usada no prazo' : ''}.
              </div>
            )}
            <label className="pcd-label">Motivo (opcional)</label>
            <input className="pcd-input" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: primeira troca, suspeita de que a senha foi vista" />
            <button className="pcd-btn" type="submit" disabled={busy}>{busy ? 'Enviando…' : 'Solicitar troca de senha'}</button>
          </form>
        )}

        {token && ativa?.status === 'PENDING' && (
          <div className="pcd-body">
            <div className="pcd-state">
              <strong>Aguardando aprovação</strong> desde {dataHora(ativa.created_at)}. Um administrador da empresa precisa aprovar a troca.
            </div>
            <button className="pcd-btn sec" type="button" onClick={verificar} disabled={busy}>{busy ? 'Consultando…' : 'Verificar aprovação'}</button>
          </div>
        )}

        {token && ativa?.status === 'APPROVED' && (
          <form className="pcd-body" onSubmit={concluir}>
            {restante > 0 ? (
              <div className="pcd-state">
                <strong>Aprovada</strong> por {ativa.approved_by_name ?? 'administrador'}. Defina a nova senha em <strong>{mmss}</strong>.
              </div>
            ) : (
              <div className="pcd-state">A aprovação expirou sem uso. Clique em <strong>Verificar aprovação</strong> e solicite de novo.</div>
            )}
            <label className="pcd-label">Nova senha</label>
            <input className="pcd-input" type="password" autoComplete="new-password" maxLength={128} value={newPassword} disabled={restante <= 0} onChange={(e) => setNewPassword(e.target.value)} />
            <label className="pcd-label">Confirmar nova senha</label>
            <input className="pcd-input" type="password" autoComplete="new-password" maxLength={128} value={confirmPassword} disabled={restante <= 0} onChange={(e) => setConfirmPassword(e.target.value)} />
            <ul className="pcd-rules" aria-label="Requisitos da nova senha">
              {regras.map((r) => <li key={r.rotulo} className={r.ok ? 'ok' : ''}>{r.ok ? '✓' : '○'} {r.rotulo}</li>)}
            </ul>
            {restante > 0
              ? <button className="pcd-btn" type="submit" disabled={busy || !regras.every((r) => r.ok)}>{busy ? 'Trocando…' : 'Trocar senha'}</button>
              : <button className="pcd-btn sec" type="button" onClick={verificar} disabled={busy}>Verificar aprovação</button>}
          </form>
        )}

        {concluida && (
          <div className="pcd-body">
            <button className="pcd-btn" type="button" onClick={onClose}>Voltar ao login</button>
          </div>
        )}

        {error && <div className="pcd-body" style={{ paddingTop: 0 }}><div className="pcd-msg pcd-err" role="alert">{error}</div></div>}
        {success && <div className="pcd-body" style={{ paddingTop: 0 }}><div className="pcd-msg pcd-ok">{success}</div></div>}
      </div>
    </div>
  );
}
