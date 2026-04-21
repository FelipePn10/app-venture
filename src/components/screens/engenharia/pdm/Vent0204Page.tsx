import { useState, useCallback } from "react";
import { ScreenLayout } from "@/components/layout/ScreenLayout";
import { Card, CardHeader, CardTitle, CardBody, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

// ─── Types ─────────────────────────────────────────────────────────────

interface FormGrupo {
  codigo: string;
  descricao: string;
  empresa: string;
}

const formInicial: FormGrupo = {
  codigo: "",
  descricao: "",
  empresa: "",
};

// ─── Component ─────────────────────────────────────────────────────────

export function Vent0204Page(): JSX.Element {
  const [form, setForm] = useState<FormGrupo>(formInicial);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormGrupo, string>>>({});

  const setField = useCallback(<K extends keyof FormGrupo>(key: K, value: FormGrupo[K]) => {
    setForm((p) => ({ ...p, [key]: value }));
    setErrors((p) => ({ ...p, [key]: undefined }));
  }, []);

  function validate(): boolean {
    const e: Partial<Record<keyof FormGrupo, string>> = {};
    if (!form.codigo.trim()) e.codigo = "Código obrigatório";
    if (!form.descricao.trim()) e.descricao = "Descrição obrigatória";
    if (!form.empresa.trim()) e.empresa = "Empresa obrigatória";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSalvar() {
    if (!validate()) return;
    setIsSaving(true);
    setFeedback(null);
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      setFeedback({ type: "success", message: "Grupo salvo com sucesso!" });
      setTimeout(() => setFeedback(null), 4000);
    }, 700);
  }

  function handleLimpar() {
    setForm(formInicial);
    setErrors({});
    setFeedback(null);
  }

  const errCount = Object.keys(errors).length;

  const actions = [
    {
      label: "Salvar",
      variant: "primary" as const,
      onClick: handleSalvar,
      icon: (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: "Limpar",
      variant: "ghost" as const,
      onClick: handleLimpar,
      icon: (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: "Excluir",
      variant: "danger" as const,
      onClick: () => {},
      icon: (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9a1 1 0 001 1h6a1 1 0 001-1l1-9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
  ];

  return (
    <ScreenLayout
      title="Cadastro de Grupo"
      screenCode="VENT0204"
      actions={actions}
      showNav={true}
    >
      {/* Feedback Toast */}
      {feedback && (
        <div
          style={{
            marginBottom: "20px",
            padding: "14px 18px",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "13px",
            fontWeight: 500,
            animation: "fadeInUp 200ms ease-out",
            background: feedback.type === "success" ? "#dcfce7" : "#fee2e2",
            color: feedback.type === "success" ? "#166534" : "#991b1b",
            border: feedback.type === "success" ? "1px solid #86efac" : "1px solid #fca5a5",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            {feedback.type === "success" ? (
              <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <>
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 5v3.5M8 10.5h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </>
            )}
          </svg>
          {feedback.message}
        </div>
      )}

      {/* Error Summary */}
      {errCount > 0 && (
        <div
          style={{
            marginBottom: "20px",
            padding: "12px 16px",
            background: "#fee2e2",
            border: "1px solid #fca5a5",
            borderLeft: "4px solid #ef4444",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "13px",
            color: "#991b1b",
            animation: "fadeInUp 200ms ease-out",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 5v3.5M8 10.5h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span>
            <strong>{errCount} campo(s)</strong> obrigatório(s) não preenchido(s)
          </span>
        </div>
      )}

      {/* Main Form Card */}
      <Card>
        <CardHeader>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                background: "rgba(93, 168, 93, 0.1)",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#3d7a3d",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="4" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M5 4V3a3 3 0 016 0v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <CardTitle>Dados do Grupo</CardTitle>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                Informações básicas do cadastro
              </div>
            </div>
          </div>
          <Badge variant={errCount > 0 ? "error" : "neutral"}>
            {errCount > 0 ? `${errCount} erro(s)` : "Novo registro"}
          </Badge>
        </CardHeader>

        <CardBody>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "200px 1fr",
              gap: "24px",
            }}
          >
            {/* Código */}
            <Input
              label="Código *"
              placeholder="GRP001"
              value={form.codigo}
              onChange={(e) => setField("codigo", e.target.value.toUpperCase())}
              maxLength={20}
              error={errors.codigo}
              helperText={!errors.codigo ? "Identificador único do grupo" : undefined}
            />

            {/* Empresa */}
            <div style={{ display: "flex", gap: "8px" }}>
              <div style={{ flex: 1 }}>
                <Input
                  label="Empresa *"
                  placeholder="Código da empresa"
                  value={form.empresa}
                  onChange={(e) => setField("empresa", e.target.value)}
                  maxLength={10}
                  error={errors.empresa}
                  helperText={!errors.empresa ? "Empresa vinculada ao grupo" : undefined}
                />
              </div>
              <Button
                variant="secondary"
                size="sm"
                style={{ marginTop: "22px", height: "40px" }}
                leftIcon={
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                }
              >
                Buscar
              </Button>
            </div>
          </div>

          {/* Descrição */}
          <div style={{ marginTop: "20px" }}>
            <Input
              label="Descrição *"
              placeholder="Ex: Matérias-primas metálicas"
              value={form.descricao}
              onChange={(e) => setField("descricao", e.target.value)}
              maxLength={100}
              error={errors.descricao}
              helperText={!errors.descricao ? "Nome completo e descritivo do grupo" : undefined}
            />
          </div>
        </CardBody>

        <CardFooter>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
            <div style={{ fontSize: "12px", color: "#64748b" }}>
              Campos marcados com <span style={{ color: "#ef4444" }}>*</span> são obrigatórios
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <Button variant="ghost" onClick={handleLimpar}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleSalvar} isLoading={isSaving}>
                Salvar
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>

      {/* Additional Info Card */}
      <Card style={{ marginTop: "20px" }}>
        <CardHeader>
          <CardTitle subtitle="Informações técnicas">Dados do Sistema</CardTitle>
        </CardHeader>
        <CardBody>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "20px",
            }}
          >
            {[
              { label: "Criado em", value: "—" },
              { label: "Última alteração", value: "—" },
              { label: "Usuário", value: "—" },
            ].map((item) => (
              <div key={item.label}>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: "4px",
                  }}
                >
                  {item.label}
                </div>
                <div style={{ fontSize: "14px", color: "#334155", fontWeight: 500 }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Keyframes */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </ScreenLayout>
  );
}
