// Aviso de vencimento do limite de crédito na lista da VCLI0500.
const { vencimentoDoCredito: v } = await import('../src/components/screens/cliente/formato.ts');
const hoje = new Date('2026-11-14T10:00:00');
const ok = (a, b) => { if (a !== b) throw new Error(`${a} != ${b}`); };
ok(v({}, hoje), null);
ok(v({ credit_limit_expires_at: '2026-11-13T00:00:00Z' }, hoje), 'vencido');
ok(v({ credit_limit_expires_at: '2026-11-14T00:00:00Z' }, hoje), 'vence 14/11/2026');
ok(v({ credit_limit_expires_at: '2026-12-14T00:00:00Z' }, hoje), 'vence 14/12/2026');
ok(v({ credit_limit_expires_at: '2027-01-30T00:00:00Z' }, hoje), null);
ok(v({ credit_limit_expires_at: '2027-01-30', credit_limit_expired: true }, hoje), 'vencido');
console.log('vencimento: ok');

// Explicação e decisão do limite (aba Crédito).
const f = await import('../src/components/screens/cliente/formato.ts');
ok(f.grupoDoFator({ points: 0, max_points: 0, blocking: true }), 'bloqueio');
ok(f.grupoDoFator({ points: -50, max_points: 0, blocking: false }), 'contra');
ok(f.grupoDoFator({ points: 40, max_points: 300, blocking: false }), 'contra');
ok(f.grupoDoFator({ points: 150, max_points: 300, blocking: false }), 'favor');
ok(f.grupoDoFator({ points: 0, max_points: 0, blocking: false }), 'info');
ok(f.grupoDoFator({ code: 'SEM_HISTORICO', points: 350, max_points: 350 }), 'info');
const base = { sugerido: 2000, maxSemAdmin: 2200, hardStop: false, isAdmin: false, motivo: '' };
ok(f.problemaDoLimite({ ...base, valor: 2000 }), null);
ok(f.problemaDoLimite({ ...base, valor: -1 }), 'Informe o limite (zero ou mais).');
ok(f.problemaDoLimite({ ...base, valor: 10.555 }), 'O limite tem no máximo 2 casas decimais.');
ok(f.problemaDoLimite({ ...base, valor: 10.55, motivo: 'garantia real apresentada' }), null);
ok(f.problemaDoLimite({ ...base, valor: 1500, motivo: 'curto' })?.startsWith('O valor é diferente'), true);
ok(f.problemaDoLimite({ ...base, valor: 2200, motivo: 'garantia real apresentada' }), null);
ok(f.problemaDoLimite({ ...base, valor: 2201, motivo: 'garantia real apresentada' })?.startsWith('Acima de'), true);
ok(f.problemaDoLimite({ ...base, isAdmin: true, valor: 99999, motivo: 'garantia real apresentada' }), null);
ok(f.problemaDoLimite({ ...base, sugerido: 0, maxSemAdmin: 0, hardStop: true, valor: 100, motivo: 'garantia real apresentada' })?.includes('bloqueio'), true);
ok(f.problemaDoLimite({ ...base, sugerido: 0, maxSemAdmin: 0, hardStop: true, valor: 0 }), null);
ok(f.comparadoAoRecomendado(2000, 2000), null);
ok(f.comparadoAoRecomendado(1600, 2000).replace(/\s/g, ' '), 'R$ 400,00 abaixo do recomendado (−20%)');
ok(f.comparadoAoRecomendado(2100, 2000).replace(/\s/g, ' '), 'R$ 100,00 acima do recomendado (+5%)');
ok(f.comparadoAoRecomendado(500, 0).replace(/\s/g, ' '), 'R$ 500,00 acima do recomendado');
ok(f.diasAte('2026-11-16', hoje), 2);
ok(f.diasAte('2026-11-13T03:00:00Z', hoje), -1);
console.log('decisão do limite: ok');
