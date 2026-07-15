import { useCallback, useEffect, useState } from 'react';
import { httpClient } from '@/services/httpClient';
import { useAuthStore } from '@/store/authStore';

interface UpdateStatus {
  state: 'idle' | 'queued' | 'running' | 'succeeded' | 'failed' | 'rolled_back';
  latest_version?: string;
  target_version?: string;
  update_available: boolean;
  progress: number;
  message?: string;
}

export function BackendUpdateBanner(): JSX.Element | null {
  const role = useAuthStore((state) => state.user?.role);
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const shouldPoll = status ? ['queued', 'running'].includes(status.state) : false;

  const load = useCallback(async () => {
    if (role !== 'ADMIN') return;
    try {
      const response = await httpClient.get<UpdateStatus>('/api/system/update/status');
      setStatus(response.data);
    } catch {
      // O painel principal continua disponível; o endpoint permanece restrito a ADMIN.
    }
  }, [role]);

  useEffect(() => {
    void load();
    if (!shouldPoll) return undefined;
    const timer = window.setInterval(() => void load(), 3000);
    return () => window.clearInterval(timer);
  }, [load, shouldPoll]);

  if (role !== 'ADMIN' || !status || (!status.update_available && !['queued', 'running', 'failed', 'rolled_back'].includes(status.state))) return null;

  async function requestUpdate(): Promise<void> {
    if (!status?.latest_version) return;
    setSubmitting(true);
    try {
      const response = await httpClient.post<UpdateStatus>('/api/system/update', { version: status.latest_version });
      setStatus(response.data);
    } finally {
      setSubmitting(false);
    }
  }

  const active = ['queued', 'running'].includes(status.state);
  return (
    <aside className="backend-update" role="status">
      <div>
        <strong>{active ? `Atualizando backend — ${status.progress}%` : `Atualização disponível (v${status.latest_version})`}</strong>
        <span>{status.message ?? 'Backup, migrations, health-check e rollback serão executados automaticamente.'}</span>
      </div>
      {!active && status.update_available && <button type="button" onClick={() => void requestUpdate()} disabled={submitting}>{submitting ? 'Solicitando…' : 'Atualizar servidor'}</button>}
    </aside>
  );
}
