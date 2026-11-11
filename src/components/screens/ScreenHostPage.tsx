import { useMemo, useEffect, lazy, Suspense } from "react";
import { useParams } from "react-router-dom";
import { getCurrentWindow } from "@tauri-apps/api/window";

/*
 * Cada tela é um `import()` próprio, não um import estático.
 *
 * Com 131 telas empacotadas juntas, abrir QUALQUER uma baixava e interpretava
 * as 131 — 2,8 MB de JavaScript antes do primeiro pixel, e o instalador do
 * desktop levava o pacote inteiro a cada atualização, mesmo quando só uma tela
 * mudou. Agora cada rotina vira um arquivo; abrir o cadastro de item não carrega
 * o fiscal, e a atualização baixa só o que mudou.
 *
 * O `SCREEN_REGISTRY` continua montando os elementos na carga do módulo: criar
 * `<Tela />` não dispara o import — quem dispara é renderizar, dentro do
 * `Suspense` lá embaixo.
 */
const Vent0800Page = lazy(() => import("./almoxarifado/Vent0800Page").then((m) => ({ default: m.Vent0800Page })));
const Vben0100Page = lazy(() => import("./beneficiamento/Vben0100Page").then((m) => ({ default: m.Vben0100Page })));
const Vben0200Page = lazy(() => import("./beneficiamento/Vben0200Page").then((m) => ({ default: m.Vben0200Page })));
const Vben0300Page = lazy(() => import("./beneficiamento/Vben0300Page").then((m) => ({ default: m.Vben0300Page })));

const Vent0200Page = lazy(() => import("./engenharia/Vent0200Page").then((m) => ({ default: m.Vent0200Page })));
const Vent0210Page = lazy(() => import("./engenharia/Vent0210Page").then((m) => ({ default: m.Vent0210Page })));
const Vpme0102ItePage = lazy(() => import("./engenharia/Vpme0102ItePage").then((m) => ({ default: m.Vpme0102ItePage })));
const Vite0116Page = lazy(() => import("./engenharia/Vite0116Page").then((m) => ({ default: m.Vite0116Page })));
const Vctb0102Page = lazy(() => import("./contabilidade/Vctb0102Page").then((m) => ({ default: m.Vctb0102Page })));
const Vpla0102Page = lazy(() => import("./planejamento/Vpla0102Page").then((m) => ({ default: m.Vpla0102Page })));
const Vpla0310Page = lazy(() => import("./planejamento/Vpla0310Page").then((m) => ({ default: m.Vpla0310Page })));
const Vpre0201Page = lazy(() => import("./previsao/Vpre0201Page").then((m) => ({ default: m.Vpre0201Page })));
const Vatc0280Page = lazy(() => import("./assistencia/Vatc0280Page").then((m) => ({ default: m.Vatc0280Page })));
const Vatc0100Page = lazy(() => import("./assistencia/Vatc0100Page").then((m) => ({ default: m.Vatc0100Page })));
const Vatc0300Page = lazy(() => import("./assistencia/Vatc0300Page").then((m) => ({ default: m.Vatc0300Page })));
const Vvnd0710Page = lazy(() => import("./comercial/Vvnd0710Page").then((m) => ({ default: m.Vvnd0710Page })));
const Vvnd0700Page = lazy(() => import("./comercial/Vvnd0700Page").then((m) => ({ default: m.Vvnd0700Page })));
const Vent0250Page = lazy(() => import("./engenharia/Vent0250Page").then((m) => ({ default: m.Vent0250Page })));
const Vatc0310Page = lazy(() => import("./assistencia/Vatc0310Page").then((m) => ({ default: m.Vatc0310Page })));
const Vatc0320Page = lazy(() => import("./assistencia/Vatc0320Page").then((m) => ({ default: m.Vatc0320Page })));
const Vatc0400Page = lazy(() => import("./assistencia/Vatc0400Page").then((m) => ({ default: m.Vatc0400Page })));
const Vcli0500Page = lazy(() => import("./cliente/Vcli0500Page").then((m) => ({ default: m.Vcli0500Page })));
const Vcst0202Page = lazy(() => import("./custo/Vcst0202Page").then((m) => ({ default: m.Vcst0202Page })));
const Vpdv0108Page = lazy(() => import("./pdv/Vpdv0108Page").then((m) => ({ default: m.Vpdv0108Page })));
const Vpdv0111Page = lazy(() => import("./pdv/Vpdv0111Page").then((m) => ({ default: m.Vpdv0111Page })));
const Vvre0200Page = lazy(() => import("./pdv/Vvre0200Page").then((m) => ({ default: m.Vvre0200Page })));
const Vcon0200Page = lazy(() => import("./suprimento/Vcon0200Page").then((m) => ({ default: m.Vcon0200Page })));
const Vavr0200Page = lazy(() => import("./suprimento/Vavr0200Page").then((m) => ({ default: m.Vavr0200Page })));
const Vins0700Page = lazy(() => import("./inspecao/Vins0700Page").then((m) => ({ default: m.Vins0700Page })));
const Vins0800Page = lazy(() => import("./inspecao/Vins0800Page").then((m) => ({ default: m.Vins0800Page })));
const Vins0600Page = lazy(() => import("./inspecao/Vins0600Page").then((m) => ({ default: m.Vins0600Page })));
const Vins0500Page = lazy(() => import("./inspecao/Vins0500Page").then((m) => ({ default: m.Vins0500Page })));
const Vins0300Page = lazy(() => import("./inspecao/Vins0300Page").then((m) => ({ default: m.Vins0300Page })));
const Vins0110Page = lazy(() => import("./inspecao/Vins0110Page").then((m) => ({ default: m.Vins0110Page })));
const Vins0200Page = lazy(() => import("./inspecao/Vins0200Page").then((m) => ({ default: m.Vins0200Page })));
const Vavf0300Page = lazy(() => import("./inspecao/Vavf0300Page").then((m) => ({ default: m.Vavf0300Page })));
const Vimp0200Page = lazy(() => import("./importacao/Vimp0200Page").then((m) => ({ default: m.Vimp0200Page })));
const Vfin0100Page = lazy(() => import("./financeiro/Vfin0100Page").then((m) => ({ default: m.Vfin0100Page })));
const Vfin0110Page = lazy(() => import("./financeiro/Vfin0110Page").then((m) => ({ default: m.Vfin0110Page })));
const Vfin0120Page = lazy(() => import("./financeiro/Vfin0120Page").then((m) => ({ default: m.Vfin0120Page })));
const Vfin0200Page = lazy(() => import("./financeiro/Vfin0200Page").then((m) => ({ default: m.Vfin0200Page })));
const Vfin0210Page = lazy(() => import("./financeiro/Vfin0210Page").then((m) => ({ default: m.Vfin0210Page })));
const Vfin0300Page = lazy(() => import("./financeiro/Vfin0300Page").then((m) => ({ default: m.Vfin0300Page })));
const Vfin0400Page = lazy(() => import("./financeiro/Vfin0400Page").then((m) => ({ default: m.Vfin0400Page })));
const Vfin0500Page = lazy(() => import("./financeiro/Vfin0500Page").then((m) => ({ default: m.Vfin0500Page })));
// VFIN0600 e VFIN0620 eram rotinas genéricas de JSON. VFIN0620 aceitava qualquer
// arquivo e respondia sucesso; VFIN0600 exigia digitar o corpo da requisição à mão.
const Vfin0600Page = lazy(() => import("./financeiro/Vfin0600Page").then((m) => ({ default: m.Vfin0600Page })));
const Vfin0610Page = lazy(() => import("./financeiro/Vfin0610Page").then((m) => ({ default: m.Vfin0610Page })));
const Vfin0620Page = lazy(() => import("./financeiro/Vfin0620Page").then((m) => ({ default: m.Vfin0620Page })));
const Vfis0100Page = lazy(() => import("./fiscal/Vfis0100Page").then((m) => ({ default: m.Vfis0100Page })));
const Vfis0110Page = lazy(() => import("./fiscal/Vfis0110Page").then((m) => ({ default: m.Vfis0110Page })));
const Vfis0200Page = lazy(() => import("./fiscal/Vfis0200Page").then((m) => ({ default: m.Vfis0200Page })));
const Vfis0210Page = lazy(() => import("./fiscal/Vfis0210Page").then((m) => ({ default: m.Vfis0210Page })));
const Vfis0220Page = lazy(() => import("./fiscal/Vfis0220Page").then((m) => ({ default: m.Vfis0220Page })));
const Vfis0300Page = lazy(() => import("./fiscal/Vfis0300Page").then((m) => ({ default: m.Vfis0300Page })));
const Vfis0310Page = lazy(() => import("./fiscal/Vfis0310Page").then((m) => ({ default: m.Vfis0310Page })));
const Vfis0320Page = lazy(() => import("./fiscal/Vfis0320Page").then((m) => ({ default: m.Vfis0320Page })));
const Vfis0325Page = lazy(() => import("./fiscal/Vfis0325Page").then((m) => ({ default: m.Vfis0325Page })));
const Vfis0340Page = lazy(() => import("./fiscal/Vfis0340Page").then((m) => ({ default: m.Vfis0340Page })));
const Vfis0345Page = lazy(() => import("./fiscal/Vfis0345Page").then((m) => ({ default: m.Vfis0345Page })));
const Vfis0350Page = lazy(() => import("./fiscal/Vfis0350Page").then((m) => ({ default: m.Vfis0350Page })));
const Vfis0670Page = lazy(() => import("./fiscal/Vfis0670Page").then((m) => ({ default: m.Vfis0670Page })));
const Vfis0360Page = lazy(() => import("./fiscal/Vfis0360Page").then((m) => ({ default: m.Vfis0360Page })));
const Vfis0510Page = lazy(() => import("./fiscal/Vfis0510Page").then((m) => ({ default: m.Vfis0510Page })));
const Vfis0550Page = lazy(() => import("./fiscal/Vfis0550Page").then((m) => ({ default: m.Vfis0550Page })));
const Vfis0560Page = lazy(() => import("./fiscal/Vfis0560Page").then((m) => ({ default: m.Vfis0560Page })));
const Vfis0600Page = lazy(() => import("./fiscal/Vfis0600Page").then((m) => ({ default: m.Vfis0600Page })));
const Vemp0100Page = lazy(() => import("./cadastros/Vemp0100Page").then((m) => ({ default: m.Vemp0100Page })));
const Vfun0100Page = lazy(() => import("./cadastros/Vfun0100Page").then((m) => ({ default: m.Vfun0100Page })));
const Vloc0100Page = lazy(() => import("./cadastros/Vloc0100Page").then((m) => ({ default: m.Vloc0100Page })));
const Vcla0100Page = lazy(() => import("./cadastros/Vcla0100Page").then((m) => ({ default: m.Vcla0100Page })));
const Vcal0100Page = lazy(() => import("./cadastros/Vcal0100Page").then((m) => ({ default: m.Vcal0100Page })));
const Vctb0200Page = lazy(() => import("./contabilidade/Vctb0200Page").then((m) => ({ default: m.Vctb0200Page })));
const Vnfs0100Page = lazy(() => import("./fiscal/Vnfs0100Page").then((m) => ({ default: m.Vnfs0100Page })));
const Vexp0100Page = lazy(() => import("./almoxarifado/Vexp0100Page").then((m) => ({ default: m.Vexp0100Page })));
const Vvnd0100Page = lazy(() => import("./comercial/Vvnd0100Page").then((m) => ({ default: m.Vvnd0100Page })));
const Vvnd0200Page = lazy(() => import("./comercial/Vvnd0200Page").then((m) => ({ default: m.Vvnd0200Page })));
const Vvnd0300Page = lazy(() => import("./comercial/Vvnd0300Page").then((m) => ({ default: m.Vvnd0300Page })));
const Vvnd0400Page = lazy(() => import("./comercial/Vvnd0400Page").then((m) => ({ default: m.Vvnd0400Page })));
const Vvnd0500Page = lazy(() => import("./comercial/Vvnd0500Page").then((m) => ({ default: m.Vvnd0500Page })));
const Vsac0100Page = lazy(() => import("./comercial/Vsac0100Page").then((m) => ({ default: m.Vsac0100Page })));
const Vdpr0100Page = lazy(() => import("./comercial/Vdpr0100Page").then((m) => ({ default: m.Vdpr0100Page })));
const Vpro0900Page = lazy(() => import("./producao/Vpro0900Page").then((m) => ({ default: m.Vpro0900Page })));
const Vpro1000Page = lazy(() => import("./producao/Vpro1000Page").then((m) => ({ default: m.Vpro1000Page })));
const RoteiroFabricacaoPage = lazy(() => import("./engenharia/RoteiroFabricacaoPage").then((m) => ({ default: m.RoteiroFabricacaoPage })));
const Vpro0200Page = lazy(() => import("./producao/Vpro0200Page").then((m) => ({ default: m.Vpro0200Page })));
const Vpro0210Page = lazy(() => import("./producao/Vpro0210Page").then((m) => ({ default: m.Vpro0210Page })));
const Vpro0500Page = lazy(() => import("./producao/Vpro0500Page").then((m) => ({ default: m.Vpro0500Page })));
const Vcus0100Page = lazy(() => import("./custo/Vcus0100Page").then((m) => ({ default: m.Vcus0100Page })));
import { Vcus0200Page } from "@/components/screens/custo/Vcus0200Page";
const Vest0100Page = lazy(() => import("./almoxarifado/Vest0100Page").then((m) => ({ default: m.Vest0100Page })));
const Vcut0100Page = lazy(() => import("./producao/Vcut0100Page").then((m) => ({ default: m.Vcut0100Page })));
const Vmrp0100Page = lazy(() => import("./planejamento/Vmrp0100Page").then((m) => ({ default: m.Vmrp0100Page })));
const Vsup0500Page = lazy(() => import("./suprimento/Vsup0500Page").then((m) => ({ default: m.Vsup0500Page })));
const Vpdc0200Page = lazy(() => import("./suprimento/Vpdc0200Page").then((m) => ({ default: m.Vpdc0200Page })));
const Vsup0110Page = lazy(() => import("./suprimento/Vsup0110Page").then((m) => ({ default: m.Vsup0110Page })));
const Vsup0120Page = lazy(() => import("./suprimento/Vsup0120Page").then((m) => ({ default: m.Vsup0120Page })));
const Vsup0130Page = lazy(() => import("./suprimento/Vsup0130Page").then((m) => ({ default: m.Vsup0130Page })));
const Vsup0140Page = lazy(() => import("./suprimento/Vsup0140Page").then((m) => ({ default: m.Vsup0140Page })));
const Vsup0300Page = lazy(() => import("./suprimento/Vsup0300Page").then((m) => ({ default: m.Vsup0300Page })));
const Vsup0400Page = lazy(() => import("./suprimento/Vsup0400Page").then((m) => ({ default: m.Vsup0400Page })));
const Vest0200Page = lazy(() => import("./almoxarifado/Vest0200Page").then((m) => ({ default: m.Vest0200Page })));
const Vest0150Page = lazy(() => import("./almoxarifado/Vest0150Page").then((m) => ({ default: m.Vest0150Page })));
const Vpro1200Page = lazy(() => import("./producao/Vpro1200Page").then((m) => ({ default: m.Vpro1200Page })));
const Vmaq0200Page = lazy(() => import("./engenharia/Vmaq0200Page").then((m) => ({ default: m.Vmaq0200Page })));
const Vpct0100Page = lazy(() => import("./suprimento/Vpct0100Page").then((m) => ({ default: m.Vpct0100Page })));
const Vdes0100Page = lazy(() => import("./engenharia/Vdes0100Page").then((m) => ({ default: m.Vdes0100Page })));
const Vtps0100Page = lazy(() => import("./suprimento/Vtps0100Page").then((m) => ({ default: m.Vtps0100Page })));
const Vcfg0100Page = lazy(() => import("./engenharia/Vcfg0100Page").then((m) => ({ default: m.Vcfg0100Page })));
const Vpln0100Page = lazy(() => import("./planejamento/Vpln0100Page").then((m) => ({ default: m.Vpln0100Page })));
const Vlot0100Page = lazy(() => import("./almoxarifado/Vlot0100Page").then((m) => ({ default: m.Vlot0100Page })));
const Vaud0100Page = lazy(() => import("./cadastros/Vaud0100Page").then((m) => ({ default: m.Vaud0100Page })));
const Vadm0200Page = lazy(() => import("./cadastros/Vadm0200Page").then((m) => ({ default: m.Vadm0200Page })));
const Vapr0100Page = lazy(() => import("./cadastros/Vapr0100Page").then((m) => ({ default: m.Vapr0100Page })));
const Vsec0100Page = lazy(() => import("./cadastros/Vsec0100Page").then((m) => ({ default: m.Vsec0100Page })));
const Vnot0100Page = lazy(() => import("./cadastros/Vnot0100Page").then((m) => ({ default: m.Vnot0100Page })));
const Vest0500Page = lazy(() => import("./almoxarifado/Vest0500Page").then((m) => ({ default: m.Vest0500Page })));
import { WindowControls } from "@/components/window/WindowControls";
const OperationalRoutinePage = lazy(() => import("./OperationalRoutinePage").then((m) => ({ default: m.OperationalRoutinePage })));
import { EntityLookupAssist } from "@/components/ui/EntityLookupAssist";
// Catálogo de dados, não componente: continua import estático.
import { OPERATIONAL_ROUTINES } from "./operationalRoutines";

/**
 * Rotinas retiradas do catálogo. Elas saíram da busca e do menu, mas um código
 * antigo ainda pode chegar aqui por link ou memória do usuário — então a tela
 * explica para onde a função foi, em vez de dizer que não existe.
 */
const SCREEN_REGISTRY: Record<string, JSX.Element> = {
  ...Object.fromEntries(Object.entries(OPERATIONAL_ROUTINES).map(([code, routine]) => [code, <OperationalRoutinePage key={code} routine={routine} />])),
  // Plataforma / novos
  VPCT0100: <Vpct0100Page />,
  VDES0100: <Vdes0100Page />,
  VTPS0100: <Vtps0100Page />,
  VCFG0100: <Vcfg0100Page />,
  VPLN0100: <Vpln0100Page />,
  VLOT0100: <Vlot0100Page />,
  VAUD0100: <Vaud0100Page />,
  VSEC0100: <Vsec0100Page />,
  VNOT0100: <Vnot0100Page />,
  VEST0500: <Vest0500Page />,
  // Engenharia
  VPME0102ITE: <Vpme0102ItePage />,
  VENT0200: <Vent0200Page />,
  VENT0210: <Vent0210Page />,
  VITE0116: <Vite0116Page />,
  // Comercial
  // Almoxarifado
  VENT0800: <Vent0800Page />,
  // Contabilidade
  VCTB0102: <Vctb0102Page />,
  // Planejamento
  VPLA0102: <Vpla0102Page />,
  VPLA0310: <Vpla0310Page />,
  VPRE0201: <Vpre0201Page />,
  // Assistência Técnica
  VATC0280: <Vatc0280Page />,
  VATC0100: <Vatc0100Page />,
  VATC0300: <Vatc0300Page />,
  VATC0310: <Vatc0310Page />,
  VENT0250: <Vent0250Page />,
  VVND0700: <Vvnd0700Page />,
  VVND0710: <Vvnd0710Page />,
  VATC0320: <Vatc0320Page />,
  VATC0400: <Vatc0400Page />,
  // Cliente
  VCLI0500: <Vcli0500Page />,

  // Vendas & Expedição (novas)
  VEXP0100: <Vexp0100Page />,
  VVND0100: <Vvnd0100Page />,
  VVND0200: <Vvnd0200Page />,
  VVND0300: <Vvnd0300Page />,
  VVND0400: <Vvnd0400Page />,
  VVND0500: <Vvnd0500Page />,
  VSAC0100: <Vsac0100Page />,
  VDPR0100: <Vdpr0100Page />,
  VPRO0900: <Vpro0900Page />,
  VPRO1000: <Vpro1000Page />,
  VENT0202: <RoteiroFabricacaoPage />,
  VPRO0200: <Vpro0200Page />,
  VPRO0210: <Vpro0210Page />,
  VPRO0500: <Vpro0500Page />,
  VCUS0100: <Vcus0100Page />,
  VCUS0200: <Vcus0200Page />,
  VEST0100: <Vest0100Page />,
  VEST0150: <Vest0150Page />,
  VEST0200: <Vest0200Page />,
  VCUT0100: <Vcut0100Page />,
  VMRP0100: <Vmrp0100Page />,
  VSUP0500: <Vsup0500Page />,
  VSUP0110: <Vsup0110Page />,
  VSUP0120: <Vsup0120Page />,
  VSUP0130: <Vsup0130Page />,
  VSUP0140: <Vsup0140Page />,
  VBEN0100: <Vben0100Page />,
  VBEN0200: <Vben0200Page />,
  VBEN0300: <Vben0300Page />,
  VPDC0200: <Vpdc0200Page />,
  VSUP0300: <Vsup0300Page />,
  VSUP0400: <Vsup0400Page />,
  VMAQ0200: <Vmaq0200Page />,
  VPRO1200: <Vpro1200Page />,

  // Cadastros & Plataforma (novas)
  VEMP0100: <Vemp0100Page />,
  VFUN0100: <Vfun0100Page />,
  VLOC0100: <Vloc0100Page />,
  VCLA0100: <Vcla0100Page />,
  VCAL0100: <Vcal0100Page />,
  VCTB0200: <Vctb0200Page />,
  VNFS0100: <Vnfs0100Page />,

  // Fiscal & Financeiro
  VFIN0100: <Vfin0100Page />,
  VFIN0110: <Vfin0110Page />,
  VFIN0120: <Vfin0120Page />,
  VFIN0200: <Vfin0200Page />,
  VFIN0210: <Vfin0210Page />,
  VFIN0300: <Vfin0300Page />,
  VFIN0400: <Vfin0400Page />,
  VFIN0500: <Vfin0500Page />,
  VFIN0600: <Vfin0600Page />,
  VFIN0610: <Vfin0610Page />,
  VFIN0620: <Vfin0620Page />,
  VFIS0100: <Vfis0100Page />,
  VFIS0110: <Vfis0110Page />,
  VFIS0200: <Vfis0200Page />,
  VFIS0210: <Vfis0210Page />,
  VFIS0220: <Vfis0220Page />,
  VFIS0300: <Vfis0300Page />,
  VFIS0310: <Vfis0310Page />,
  VFIS0320: <Vfis0320Page />,
  VFIS0325: <Vfis0325Page />,
  VFIS0340: <Vfis0340Page />,
  VFIS0345: <Vfis0345Page />,
  VFIS0350: <Vfis0350Page />,
  VFIS0670: <Vfis0670Page />,
  VADM0200: <Vadm0200Page />,
  VAPR0100: <Vapr0100Page />,
  VFIS0360: <Vfis0360Page />,
  VFIS0510: <Vfis0510Page />,
  VFIS0550: <Vfis0550Page />,
  VFIS0560: <Vfis0560Page />,
  VFIS0600: <Vfis0600Page />,
  // Custos
  VCST0202: <Vcst0202Page />,
  // PDV
  VPDV0108: <Vpdv0108Page />,
  VPDV0111: <Vpdv0111Page />,
  VVRE0200: <Vvre0200Page />,
  // Manutenção
  // Suprimento
  // Código legado direcionado à implementação real de Pedido de Compra.
  VCON0200: <Vcon0200Page />,
  VAVR0200: <Vavr0200Page />,
  // Inspeção
  VINS0700: <Vins0700Page />,
  VINS0800: <Vins0800Page />,
  VINS0600: <Vins0600Page />,
  VINS0500: <Vins0500Page />,
  VINS0300: <Vins0300Page />,
  VINS0110: <Vins0110Page />,
  VINS0200: <Vins0200Page />,
  VAVF0300: <Vavf0300Page />,
  VIMP0200: <Vimp0200Page />,
};

export function ScreenHostPage(): JSX.Element {
  const { code } = useParams<{ code: string }>();

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (e.clientY > 52) return;
      if (
        (e.target as HTMLElement).closest("button, input, select, a, textarea")
      )
        return;
      if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) { try { void getCurrentWindow().startDragging(); } catch { /* not in Tauri */ } }
    }
    window.addEventListener("mousedown", onMouseDown, true);
    return () => window.removeEventListener("mousedown", onMouseDown, true);
  }, []);

  const screen = useMemo(() => {
    if (code && code in SCREEN_REGISTRY) {
      return SCREEN_REGISTRY[code];
    }
    return (
      <main className="screen-layout">
        <header>
          <h1>{code ?? "Tela não encontrada"}</h1>
          <p>Esta tela não existe no sistema. Procure a rotina pelo nome no menu.</p>
        </header>
      </main>
    );
  }, [code]);

  return (
    <div className="screen-host" style={{ position: "relative" }}>
      {/* A tela chega por `import()`: o intervalo entre abrir a janela e o
          arquivo carregar precisa dizer que está carregando, senão a janela
          pisca vazia e parece que a rotina não existe. */}
      <Suspense fallback={
        <div className="screen-host-carregando">
          <span className="erp-spin" />
          <span>Abrindo {code ?? "a rotina"}…</span>
        </div>
      }>
        {screen}
      </Suspense>
      <EntityLookupAssist />

      <span className="screen-host-routine-code" aria-label={`Rotina ${code ?? "desconhecida"}`}>
        {code ?? "—"}
      </span>

      {/* Window controls pinned to top-right */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "52px",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
        }}
      >
        <WindowControls />
      </div>
    </div>
  );
}
