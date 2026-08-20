import { useEffect, useMemo, useState } from 'react';
import { errMessage } from '@/services/fiscalShared';
import {
  deleteNotificationSubscription, enqueueNotificationTest, getNotificationAlert, getNotificationSettings,
  listNotificationDepartments, listNotificationEvents, listNotificationRecords, listNotificationSubscriptions, listNotificationUsers,
  retryNotificationDelivery, saveNotificationSettings, saveNotificationSubscription,
  type NotificationEvent, type NotificationRecord, type NotificationSettings,
  type NotificationDepartmentRecipient, type NotificationSubscription, type NotificationUserRecipient,
} from '@/services/notificationService';

type Tab = 'config' | 'subscriptions' | 'alerts' | 'history' | 'dead';
type Feedback = { type: 'success' | 'error' | 'info'; message: string } | null;

const DEFAULT_SETTINGS: NotificationSettings = { enabled: true, digest_time: '08:00', timezone: 'America/Sao_Paulo', retention_days: 365, max_attachment_bytes: 10485760, max_emails_per_minute: 60, fiscal_config_id: null };
const CADENCE_LABELS = { IMEDIATO: 'Imediato', RESUMO_DIARIO: 'Resumo diário', IMEDIATO_E_RESUMO_DIARIO: 'Imediato e resumo diário' } as const;
const STATE_LABELS: Record<string, string> = { PENDENTE: 'Pendente', PROCESSANDO: 'Processando', ENVIADO: 'Enviado', FALHOU: 'Falhou', DESCARTADO: 'Descartado', CANCELADO: 'Cancelado', ABERTO: 'Aberto', RESOLVIDO: 'Resolvido', IGNORADO: 'Ignorado' };

function value(row: NotificationRecord, key: string): string { const raw = row[key]; return raw == null || raw === '' ? '—' : String(raw); }
function date(value: unknown): string { if (!value) return '—'; const d = new Date(String(value)); return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString('pt-BR'); }
function maskEmail(value: unknown): string { const email = String(value ?? ''); const [name, domain] = email.split('@'); if (!domain) return email || '—'; return `${name.slice(0, 2)}***@${domain}`; }

/** VNOT0100 — administração tenant-aware da central interna de alertas e e-mails. */
export function Vnot0100Page(): JSX.Element {
  const [tab, setTab] = useState<Tab>('config');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [events, setEvents] = useState<NotificationEvent[]>([]);
  const [subscriptions, setSubscriptions] = useState<NotificationSubscription[]>([]);
  const [users, setUsers] = useState<NotificationUserRecipient[]>([]);
  const [departments, setDepartments] = useState<NotificationDepartmentRecipient[]>([]);
  const [records, setRecords] = useState<NotificationRecord[]>([]);
  const [alertDetail, setAlertDetail] = useState<NotificationRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [form, setForm] = useState({ id: '', event_key: '', cadence: 'IMEDIATO', recipient_type: 'PAPEL' as 'PAPEL' | 'USUARIO' | 'DEPARTAMENTO', recipient_value: 'ADMIN', enabled: true, antecedencia_dias: '', quantidade_limite: '', valor_limite: '' });

  const selectedEvent = useMemo(() => events.find((item) => item.event_key === form.event_key), [events, form.event_key]);
  const eventByKey = useMemo(() => Object.fromEntries(events.map((item) => [item.event_key, item])), [events]);

  async function run(work: () => Promise<void>) {
    setBusy(true); setFeedback(null);
    try { await work(); } catch (error) { setFeedback({ type: 'error', message: errMessage(error, 'Não foi possível concluir a operação.') }); }
    finally { setBusy(false); }
  }

  async function loadBase() {
    const [catalog, currentSettings, currentSubscriptions, currentUsers, currentDepartments] = await Promise.all([listNotificationEvents(), getNotificationSettings(), listNotificationSubscriptions(), listNotificationUsers(), listNotificationDepartments()]);
    setEvents(catalog); setSettings(currentSettings); setSubscriptions(currentSubscriptions); setUsers(currentUsers); setDepartments(currentDepartments);
    if (!form.event_key && catalog[0]) setForm((current) => ({ ...current, event_key: catalog[0].event_key, cadence: catalog[0].allowed_cadences[0] ?? 'IMEDIATO' }));
  }

  // A carga inicial é executada uma vez; atualizações posteriores são explícitas.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void run(loadBase); }, []);

  async function loadRecords(nextTab: Tab) {
    setTab(nextTab);
    if (nextTab === 'alerts') await run(async () => setRecords(await listNotificationRecords('alerts')));
    if (nextTab === 'history') await run(async () => setRecords(await listNotificationRecords('deliveries')));
    if (nextTab === 'dead') await run(async () => setRecords(await listNotificationRecords('dead-letters')));
  }

  async function saveSettings() {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(settings.digest_time)) { setFeedback({ type: 'error', message: 'Informe o horário no formato HH:MM.' }); return; }
    await run(async () => { await saveNotificationSettings(settings); setFeedback({ type: 'success', message: 'Configuração da central salva.' }); });
  }

  async function saveSubscription() {
    if (!selectedEvent) { setFeedback({ type: 'error', message: 'Selecione um evento.' }); return; }
    if (selectedEvent.producer_status !== 'ATIVO') { setFeedback({ type: 'error', message: 'Este evento está reservado para uso futuro e ainda não possui monitoramento operacional.' }); return; }
    if (!form.recipient_value) { setFeedback({ type: 'error', message: 'Selecione um destinatário interno.' }); return; }
    const thresholds: Record<string, unknown> = {};
    if (form.antecedencia_dias) thresholds.antecedencia_dias = form.antecedencia_dias;
    if (form.quantidade_limite) thresholds.quantidade_limite = form.quantidade_limite;
    if (form.valor_limite) thresholds.valor_limite = form.valor_limite;
    if (!window.confirm(`Ativar o alerta “${selectedEvent.name}” para o destinatário interno selecionado?`)) return;
    await run(async () => {
      const recipient = form.recipient_type === 'USUARIO' ? { recipient_type: 'USUARIO' as const, user_id: form.recipient_value } : { recipient_type: form.recipient_type, recipient_key: form.recipient_value };
      await saveNotificationSubscription({ id: form.id || undefined, event_key: selectedEvent.event_key, event_version: selectedEvent.version, enabled: form.enabled, cadence: form.cadence as NotificationSubscription['cadence'], thresholds, recipients: [recipient] });
      setSubscriptions(await listNotificationSubscriptions());
      setForm((current) => ({ ...current, id: '' }));
      setFeedback({ type: 'success', message: 'Assinatura salva para os usuários internos do papel selecionado.' });
    });
  }

  const tabs: Array<[Tab, string]> = [['config', 'Configuração'], ['subscriptions', 'Assinaturas'], ['alerts', 'Alertas'], ['history', 'Histórico'], ['dead', 'Falhas esgotadas']];
  return <div className="erp-screen">
    <header className="erp-titlebar"><div className="erp-brand"><div className="erp-brand-logo">V</div></div><nav className="erp-crumbs"><span className="erp-crumb-mut">Cadastros &amp; Plataforma</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Central de Alertas</span><span className="erp-crumb-code">VNOT0100</span></nav><div className="erp-titlebar-spacer"/><span className="erp-titlebar-meta">{settings.enabled ? 'Central habilitada' : 'Central desabilitada'}</span></header>
    <div className="erp-toolbar"><div className="erp-tgroup"><button className="erp-btn erp-btn-dark" onClick={() => void run(loadBase)} disabled={busy}>{busy && <span className="erp-spin"/>}Atualizar</button></div></div>
    <div className="erp-content">
      {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
      <div className="erp-note"><strong>Comunicação segura:</strong> a central envia apenas para usuários internos. Senhas e configurações do servidor de e-mail ficam exclusivamente no backend.</div>
      <section className="erp-detail-panel"><div className="erp-tabs">{tabs.map(([key, label]) => <button key={key} className={`erp-tab ${tab === key ? 'active' : ''}`} onClick={() => void loadRecords(key)}>{label}</button>)}</div><div className="erp-detail-body">
        {tab === 'config' && <div className="erp-fieldset"><div className="erp-fieldset-head">Funcionamento da central</div><div className="erp-fieldset-body">
          <div className="erp-field erp-c3"><label className="erp-label">Central ativa</label><label className="erp-check"><input type="checkbox" checked={settings.enabled} onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}/> Habilitar alertas e e-mails</label></div>
          <div className="erp-field erp-c3"><label className="erp-label">Horário do resumo</label><input className="erp-input" type="time" value={settings.digest_time} onChange={(e) => setSettings({ ...settings, digest_time: e.target.value })}/></div>
          <div className="erp-field erp-c3"><label className="erp-label">Fuso horário</label><input className="erp-input" value={settings.timezone} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}/><span className="erp-field-hint">Ex.: America/Sao_Paulo</span></div>
          <div className="erp-field erp-c3"><label className="erp-label">Retenção (dias)</label><input className="erp-input num" type="number" min={30} max={3650} value={settings.retention_days} onChange={(e) => setSettings({ ...settings, retention_days: Number(e.target.value) })}/></div>
          <div className="erp-field erp-c3"><label className="erp-label">Limite por minuto</label><input className="erp-input num" type="number" min={1} max={1000} value={settings.max_emails_per_minute} onChange={(e) => setSettings({ ...settings, max_emails_per_minute: Number(e.target.value) })}/></div>
          <div className="erp-field erp-c3"><label className="erp-label">Limite de anexo (MiB)</label><input className="erp-input num" type="number" min={0} max={25} value={Math.round(settings.max_attachment_bytes / 1048576)} onChange={(e) => setSettings({ ...settings, max_attachment_bytes: Number(e.target.value) * 1048576 })}/></div>
          <div className="erp-field erp-c3"><label className="erp-label">Configuração fiscal</label><input className="erp-input num" type="number" value={settings.fiscal_config_id ?? ''} onChange={(e) => setSettings({ ...settings, fiscal_config_id: e.target.value ? Number(e.target.value) : null })}/><span className="erp-field-hint">Usada para logo e identidade visual.</span></div>
          <div className="erp-field erp-c12" style={{ flexDirection: 'row', gap: 8 }}><button className="erp-btn erp-btn-primary" onClick={() => void saveSettings()} disabled={busy}>Salvar configuração</button><button className="erp-btn" onClick={() => void run(async () => { await enqueueNotificationTest(); setFeedback({ type: 'info', message: 'E-mail de teste enfileirado. A entrega deve ser acompanhada no Histórico.' }); })} disabled={busy}>Enviar e-mail de teste</button></div>
        </div></div>}
        {tab === 'subscriptions' && <><div className="erp-fieldset"><div className="erp-fieldset-head">Nova assinatura interna</div><div className="erp-fieldset-body">
          <div className="erp-field erp-c6"><label className="erp-label erp-req">Evento</label><select className="erp-input" value={form.event_key} onChange={(e) => { const event = events.find((item) => item.event_key === e.target.value); setForm({ ...form, event_key: e.target.value, cadence: event?.allowed_cadences[0] ?? 'IMEDIATO' }); }}><option value="">Selecione…</option>{events.map((event) => <option key={`${event.event_key}-${event.version}`} value={event.event_key}>{event.producer_status === 'ATIVO' ? 'Ativo' : 'Futuro'} · {event.module} — {event.name}</option>)}</select>{selectedEvent && <span className="erp-field-hint">{selectedEvent.event_kind === 'PENDENCIA' ? 'Pendência recorrente' : 'Evento pontual'} · {selectedEvent.description} · {selectedEvent.producer_description}</span>}</div>
          <div className="erp-field erp-c3"><label className="erp-label erp-req">Cadência</label><select className="erp-input" value={form.cadence} onChange={(e) => setForm({ ...form, cadence: e.target.value })}>{(selectedEvent?.allowed_cadences ?? []).map((item) => <option key={item} value={item}>{CADENCE_LABELS[item]}</option>)}</select></div>
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Tipo de destinatário</label><select className="erp-input" value={form.recipient_type} onChange={(e) => { const type = e.target.value as typeof form.recipient_type; setForm({ ...form, recipient_type: type, recipient_value: type === 'PAPEL' ? 'ADMIN' : '' }); }}><option value="PAPEL">Papel</option><option value="USUARIO">Usuário</option><option value="DEPARTAMENTO">Departamento</option></select></div>
          <div className="erp-field erp-c4"><label className="erp-label erp-req">Destinatário interno</label><select className="erp-input" value={form.recipient_value} onChange={(e) => setForm({ ...form, recipient_value: e.target.value })}>{form.recipient_type === 'PAPEL' ? <><option value="ADMIN">Administradores</option><option value="USER">Usuários</option></> : form.recipient_type === 'USUARIO' ? <><option value="">Selecione…</option>{users.map((user) => <option key={user.id} value={user.id} disabled={!user.active}>{user.name} · {user.role}{user.active ? '' : ' (inativo)'}</option>)}</> : <><option value="">Selecione…</option>{departments.map((department) => <option key={department.code} value={department.code} disabled={!department.active}>{department.description}{department.active ? '' : ' (inativo)'}</option>)}</>}</select><span className="erp-field-hint">Não é permitido digitar e-mail externo.</span></div>
          <div className="erp-field erp-c3"><label className="erp-label">Antecedência (dias)</label><input className="erp-input num" type="number" min={0} value={form.antecedencia_dias} onChange={(e) => setForm({ ...form, antecedencia_dias: e.target.value })}/></div>
          <div className="erp-field erp-c3"><label className="erp-label">Limite de quantidade</label><input className="erp-input num" inputMode="decimal" value={form.quantidade_limite} onChange={(e) => setForm({ ...form, quantidade_limite: e.target.value })}/></div>
          <div className="erp-field erp-c3"><label className="erp-label">Limite de valor</label><input className="erp-input num" inputMode="decimal" value={form.valor_limite} onChange={(e) => setForm({ ...form, valor_limite: e.target.value })}/></div>
          <div className="erp-field erp-c3" style={{ justifyContent: 'flex-end' }}><button className="erp-btn erp-btn-primary" onClick={() => void saveSubscription()} disabled={busy || selectedEvent?.producer_status !== 'ATIVO'}>{form.id ? 'Salvar alteração' : 'Criar assinatura'}</button></div>
        </div></div><div className="erp-grid-wrap"><table className="erp-grid"><thead><tr><th>Evento</th><th>Cadência</th><th>Destinatários</th><th>Situação</th><th>Ações</th></tr></thead><tbody>{subscriptions.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhuma assinatura configurada.</td></tr>}{subscriptions.map((item) => <tr key={item.id}><td><strong>{eventByKey[item.event_key]?.name ?? item.event_key}</strong></td><td>{CADENCE_LABELS[item.cadence]}</td><td>{item.recipients.map((recipient) => recipient.recipient_key ?? users.find((user) => user.id === recipient.user_id)?.name ?? 'Usuário selecionado').join(', ')}</td><td>{item.enabled ? 'Ativa' : 'Inativa'}</td><td><div style={{ display: 'flex', gap: 5 }}><button className="erp-btn erp-btn-sm" onClick={() => { const recipient = item.recipients[0]; const thresholds = item.thresholds ?? {}; setForm({ id: item.id ?? '', event_key: item.event_key, cadence: item.cadence, recipient_type: recipient?.recipient_type ?? 'PAPEL', recipient_value: recipient?.user_id ?? recipient?.recipient_key ?? '', enabled: item.enabled, antecedencia_dias: String(thresholds.antecedencia_dias ?? ''), quantidade_limite: String(thresholds.quantidade_limite ?? ''), valor_limite: String(thresholds.valor_limite ?? '') }); }}>Editar</button><button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => item.id && window.confirm('Excluir esta assinatura?') && void run(async () => { await deleteNotificationSubscription(item.id!); setSubscriptions(await listNotificationSubscriptions()); })}>Excluir</button></div></td></tr>)}</tbody></table></div></>}
        {(tab === 'alerts' || tab === 'history' || tab === 'dead') && <div className="erp-grid-wrap"><table className="erp-grid"><thead><tr>{tab === 'alerts' ? <><th>Aberto em</th><th>Evento</th><th>Resumo</th><th>Severidade</th><th>Situação</th><th>Ações</th></> : tab === 'history' ? <><th>Criado em</th><th>Destinatário</th><th>Assunto</th><th>Tentativas</th><th>Situação</th><th>Ações</th></> : <><th>Data</th><th>Motivo</th><th>Detalhe seguro</th><th>Situação</th><th>Ações</th></>}</tr></thead><tbody>{records.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhum registro encontrado.</td></tr>}{records.map((row) => <tr key={value(row, 'id')}>{tab === 'alerts' ? <><td>{date(row.opened_at)}</td><td>{eventByKey[value(row, 'event_key')]?.name ?? value(row, 'event_key')}</td><td>{value(row, 'summary')}</td><td>{value(row, 'severity')}</td><td>{STATE_LABELS[value(row, 'state')] ?? value(row, 'state')}</td><td><button className="erp-btn erp-btn-sm" onClick={() => void run(async () => setAlertDetail(await getNotificationAlert(value(row, 'id'))))}>Ver detalhes</button></td></> : tab === 'history' ? <><td>{date(row.created_at)}</td><td>{maskEmail(row.recipient_email_snapshot)}</td><td>{value(row, 'subject_snapshot')}</td><td>{value(row, 'attempts')}</td><td>{STATE_LABELS[value(row, 'state')] ?? value(row, 'state')}</td><td>{['FALHOU', 'DESCARTADO'].includes(value(row, 'state')) && <button className="erp-btn erp-btn-sm" onClick={() => void run(async () => { await retryNotificationDelivery(value(row, 'id')); setRecords(await listNotificationRecords('deliveries')); setFeedback({ type: 'info', message: 'Reenvio enfileirado; a tentativa anterior foi preservada.' }); })}>Reenviar</button>}</td></> : <><td>{date(row.created_at)}</td><td>{value(row, 'reason_code')}</td><td>{value(row, 'sanitized_reason')}</td><td>{row.retried_at ? 'Reenvio solicitado' : 'Tentativas esgotadas'}</td><td><button className="erp-btn erp-btn-sm" onClick={() => void run(async () => { await retryNotificationDelivery(value(row, 'delivery_id')); setRecords(await listNotificationRecords('dead-letters')); })}>Reenviar</button></td></>}</tr>)}</tbody></table></div>}
      </div></section>
    </div>
    {alertDetail && <div className="erp-modal-backdrop" role="dialog" aria-modal="true" onMouseDown={(e) => { if (e.target === e.currentTarget) setAlertDetail(null); }}><div className="erp-modal" style={{ width: 'min(620px, 92vw)' }}><div className="erp-modal-head"><strong>Detalhes do alerta</strong><button className="erp-btn erp-btn-sm" onClick={() => setAlertDetail(null)}>Fechar</button></div><div className="erp-modal-body"><dl className="erp-audit-details">{Object.entries(alertDetail).filter(([key]) => !/(payload|mime|token|secret|password)/i.test(key)).map(([key, raw]) => <div key={key}><dt>{key.replace(/_/g, ' ')}</dt><dd>{key.endsWith('_at') ? date(raw) : String(raw ?? '—')}</dd></div>)}</dl></div></div></div>}
    <footer className="erp-statusbar"><div className="erp-status-item">Eventos: <strong>{events.length}</strong></div><div className="erp-status-item">Assinaturas: <strong>{subscriptions.length}</strong></div><div className="erp-status-spacer"/><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span></footer>
  </div>;
}
