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

const Vent0200Page = lazy(() => import("./engenharia/Vent0200Page").then((m) => ({ default: m.Vent0200Page })));
const Vent0210Page = lazy(() => import("./engenharia/Vent0210Page").then((m) => ({ default: m.Vent0210Page })));
const Vent0108Page = lazy(() => import("./engenharia/Vent0108Page").then((m) => ({ default: m.Vent0108Page })));
const Vpme0102Page = lazy(() => import("./engenharia/Vpme0102Page").then((m) => ({ default: m.Vpme0102Page })));
const Vpme0102ItePage = lazy(() => import("./engenharia/Vpme0102ItePage").then((m) => ({ default: m.Vpme0102ItePage })));
const Vite0114Page = lazy(() => import("./engenharia/Vite0114Page").then((m) => ({ default: m.Vite0114Page })));
const Vite0115Page = lazy(() => import("./engenharia/Vite0115Page").then((m) => ({ default: m.Vite0115Page })));
const Vite0116Page = lazy(() => import("./engenharia/Vite0116Page").then((m) => ({ default: m.Vite0116Page })));
const Vctb0102Page = lazy(() => import("./contabilidade/Vctb0102Page").then((m) => ({ default: m.Vctb0102Page })));
const Vutl0555Page = lazy(() => import("./contabilidade/Vutl0555Page").then((m) => ({ default: m.Vutl0555Page })));
const Vpla0102Page = lazy(() => import("./planejamento/Vpla0102Page").then((m) => ({ default: m.Vpla0102Page })));
const Vpre0101Page = lazy(() => import("./previsao/Vpre0101Page").then((m) => ({ default: m.Vpre0101Page })));
const Vpre0102Page = lazy(() => import("./previsao/Vpre0102Page").then((m) => ({ default: m.Vpre0102Page })));
const Vpre0201Page = lazy(() => import("./previsao/Vpre0201Page").then((m) => ({ default: m.Vpre0201Page })));
const Vpre0251Page = lazy(() => import("./previsao/Vpre0251Page").then((m) => ({ default: m.Vpre0251Page })));
const Vpre0301Page = lazy(() => import("./previsao/Vpre0301Page").then((m) => ({ default: m.Vpre0301Page })));
const Vatc0280Page = lazy(() => import("./assistencia/Vatc0280Page").then((m) => ({ default: m.Vatc0280Page })));
const Vatc0480Page = lazy(() => import("./assistencia/Vatc0480Page").then((m) => ({ default: m.Vatc0480Page })));
const Vatc0380Page = lazy(() => import("./assistencia/Vatc0380Page").then((m) => ({ default: m.Vatc0380Page })));
const Vsac0200Page = lazy(() => import("./assistencia/Vsac0200Page").then((m) => ({ default: m.Vsac0200Page })));
const Vcli0500Page = lazy(() => import("./cliente/Vcli0500Page").then((m) => ({ default: m.Vcli0500Page })));
const Vcli0510Page = lazy(() => import("./cliente/Vcli0510Page").then((m) => ({ default: m.Vcli0510Page })));
const Vcli0520Page = lazy(() => import("./cliente/Vcli0520Page").then((m) => ({ default: m.Vcli0520Page })));
const Vcli0530Page = lazy(() => import("./cliente/Vcli0530Page").then((m) => ({ default: m.Vcli0530Page })));
const Vcst0202Page = lazy(() => import("./custo/Vcst0202Page").then((m) => ({ default: m.Vcst0202Page })));
const Vpdv0108Page = lazy(() => import("./pdv/Vpdv0108Page").then((m) => ({ default: m.Vpdv0108Page })));
const Vpdv0111Page = lazy(() => import("./pdv/Vpdv0111Page").then((m) => ({ default: m.Vpdv0111Page })));
const Vvre0200Page = lazy(() => import("./pdv/Vvre0200Page").then((m) => ({ default: m.Vvre0200Page })));
const Vre0203Page = lazy(() => import("./pdv/Vre0203Page").then((m) => ({ default: m.Vre0203Page })));
const Vcon0200Page = lazy(() => import("./suprimento/Vcon0200Page").then((m) => ({ default: m.Vcon0200Page })));
const Vcon0400Page = lazy(() => import("./suprimento/Vcon0400Page").then((m) => ({ default: m.Vcon0400Page })));
const Vcon0202Page = lazy(() => import("./suprimento/Vcon0202Page").then((m) => ({ default: m.Vcon0202Page })));
const Vavr0200Page = lazy(() => import("./suprimento/Vavr0200Page").then((m) => ({ default: m.Vavr0200Page })));
const Vins0106Page = lazy(() => import("./inspecao/Vins0106Page").then((m) => ({ default: m.Vins0106Page })));
const Vins0200Page = lazy(() => import("./inspecao/Vins0200Page").then((m) => ({ default: m.Vins0200Page })));
const Vins0201Page = lazy(() => import("./inspecao/Vins0201Page").then((m) => ({ default: m.Vins0201Page })));
const Vins0313Page = lazy(() => import("./inspecao/Vins0313Page").then((m) => ({ default: m.Vins0313Page })));
const Vins0400Page = lazy(() => import("./inspecao/Vins0400Page").then((m) => ({ default: m.Vins0400Page })));
const Vavf0101Page = lazy(() => import("./inspecao/Vavf0101Page").then((m) => ({ default: m.Vavf0101Page })));
const Vavf0204Page = lazy(() => import("./inspecao/Vavf0204Page").then((m) => ({ default: m.Vavf0204Page })));
const Vimp0101Page = lazy(() => import("./importacao/Vimp0101Page").then((m) => ({ default: m.Vimp0101Page })));
const Vimp0200Page = lazy(() => import("./importacao/Vimp0200Page").then((m) => ({ default: m.Vimp0200Page })));
const Vfin0100Page = lazy(() => import("./financeiro/Vfin0100Page").then((m) => ({ default: m.Vfin0100Page })));
const Vfin0110Page = lazy(() => import("./financeiro/Vfin0110Page").then((m) => ({ default: m.Vfin0110Page })));
const Vfin0120Page = lazy(() => import("./financeiro/Vfin0120Page").then((m) => ({ default: m.Vfin0120Page })));
const Vfin0130Page = lazy(() => import("./financeiro/Vfin0130Page").then((m) => ({ default: m.Vfin0130Page })));
const Vfin0200Page = lazy(() => import("./financeiro/Vfin0200Page").then((m) => ({ default: m.Vfin0200Page })));
const Vfin0210Page = lazy(() => import("./financeiro/Vfin0210Page").then((m) => ({ default: m.Vfin0210Page })));
const Vfin0300Page = lazy(() => import("./financeiro/Vfin0300Page").then((m) => ({ default: m.Vfin0300Page })));
const Vfin0400Page = lazy(() => import("./financeiro/Vfin0400Page").then((m) => ({ default: m.Vfin0400Page })));
const Vfin0500Page = lazy(() => import("./financeiro/Vfin0500Page").then((m) => ({ default: m.Vfin0500Page })));
const Vfis0100Page = lazy(() => import("./fiscal/Vfis0100Page").then((m) => ({ default: m.Vfis0100Page })));
const Vfis0110Page = lazy(() => import("./fiscal/Vfis0110Page").then((m) => ({ default: m.Vfis0110Page })));
const Vfis0200Page = lazy(() => import("./fiscal/Vfis0200Page").then((m) => ({ default: m.Vfis0200Page })));
const Vfis0210Page = lazy(() => import("./fiscal/Vfis0210Page").then((m) => ({ default: m.Vfis0210Page })));
const Vfis0220Page = lazy(() => import("./fiscal/Vfis0220Page").then((m) => ({ default: m.Vfis0220Page })));
const Vfis0300Page = lazy(() => import("./fiscal/Vfis0300Page").then((m) => ({ default: m.Vfis0300Page })));
const Vfis0310Page = lazy(() => import("./fiscal/Vfis0310Page").then((m) => ({ default: m.Vfis0310Page })));
const Vfis0320Page = lazy(() => import("./fiscal/Vfis0320Page").then((m) => ({ default: m.Vfis0320Page })));
const Vfis0330Page = lazy(() => import("./fiscal/Vfis0330Page").then((m) => ({ default: m.Vfis0330Page })));
const Vfis0340Page = lazy(() => import("./fiscal/Vfis0340Page").then((m) => ({ default: m.Vfis0340Page })));
const Vfis0350Page = lazy(() => import("./fiscal/Vfis0350Page").then((m) => ({ default: m.Vfis0350Page })));
const Vfis0360Page = lazy(() => import("./fiscal/Vfis0360Page").then((m) => ({ default: m.Vfis0360Page })));
const Vfis0500Page = lazy(() => import("./fiscal/Vfis0500Page").then((m) => ({ default: m.Vfis0500Page })));
const Vfis0510Page = lazy(() => import("./fiscal/Vfis0510Page").then((m) => ({ default: m.Vfis0510Page })));
const Vfis0520Page = lazy(() => import("./fiscal/Vfis0520Page").then((m) => ({ default: m.Vfis0520Page })));
const Vfis0530Page = lazy(() => import("./fiscal/Vfis0530Page").then((m) => ({ default: m.Vfis0530Page })));
const Vfis0540Page = lazy(() => import("./fiscal/Vfis0540Page").then((m) => ({ default: m.Vfis0540Page })));
const Vfis0550Page = lazy(() => import("./fiscal/Vfis0550Page").then((m) => ({ default: m.Vfis0550Page })));
const Vfis0560Page = lazy(() => import("./fiscal/Vfis0560Page").then((m) => ({ default: m.Vfis0560Page })));
const Vemp0100Page = lazy(() => import("./cadastros/Vemp0100Page").then((m) => ({ default: m.Vemp0100Page })));
const Vfun0100Page = lazy(() => import("./cadastros/Vfun0100Page").then((m) => ({ default: m.Vfun0100Page })));
const Vloc0100Page = lazy(() => import("./cadastros/Vloc0100Page").then((m) => ({ default: m.Vloc0100Page })));
const Vcla0100Page = lazy(() => import("./cadastros/Vcla0100Page").then((m) => ({ default: m.Vcla0100Page })));
const Vcal0100Page = lazy(() => import("./cadastros/Vcal0100Page").then((m) => ({ default: m.Vcal0100Page })));
const Vpri0100Page = lazy(() => import("./cadastros/Vpri0100Page").then((m) => ({ default: m.Vpri0100Page })));
const Vctb0200Page = lazy(() => import("./contabilidade/Vctb0200Page").then((m) => ({ default: m.Vctb0200Page })));
const Vnfs0100Page = lazy(() => import("./fiscal/Vnfs0100Page").then((m) => ({ default: m.Vnfs0100Page })));
const Vexp0100Page = lazy(() => import("./almoxarifado/Vexp0100Page").then((m) => ({ default: m.Vexp0100Page })));
const Vvnd0100Page = lazy(() => import("./comercial/Vvnd0100Page").then((m) => ({ default: m.Vvnd0100Page })));
const Vvnd0200Page = lazy(() => import("./comercial/Vvnd0200Page").then((m) => ({ default: m.Vvnd0200Page })));
const Vvnd0300Page = lazy(() => import("./comercial/Vvnd0300Page").then((m) => ({ default: m.Vvnd0300Page })));
const Vvnd0310Page = lazy(() => import("./comercial/Vvnd0310Page").then((m) => ({ default: m.Vvnd0310Page })));
const Vvnd0400Page = lazy(() => import("./comercial/Vvnd0400Page").then((m) => ({ default: m.Vvnd0400Page })));
const Vvnd0500Page = lazy(() => import("./comercial/Vvnd0500Page").then((m) => ({ default: m.Vvnd0500Page })));
const Vsac0100Page = lazy(() => import("./comercial/Vsac0100Page").then((m) => ({ default: m.Vsac0100Page })));
const Vdpr0100Page = lazy(() => import("./comercial/Vdpr0100Page").then((m) => ({ default: m.Vdpr0100Page })));
const Vpro0900Page = lazy(() => import("./producao/Vpro0900Page").then((m) => ({ default: m.Vpro0900Page })));
const Vpro1000Page = lazy(() => import("./producao/Vpro1000Page").then((m) => ({ default: m.Vpro1000Page })));
const RoteiroFabricacaoPage = lazy(() => import("./engenharia/RoteiroFabricacaoPage").then((m) => ({ default: m.RoteiroFabricacaoPage })));
const Vpro0200Page = lazy(() => import("./producao/Vpro0200Page").then((m) => ({ default: m.Vpro0200Page })));
const Vpro0210Page = lazy(() => import("./producao/Vpro0210Page").then((m) => ({ default: m.Vpro0210Page })));
const Vpro0300Page = lazy(() => import("./producao/Vpro0300Page").then((m) => ({ default: m.Vpro0300Page })));
const Vpro0400Page = lazy(() => import("./producao/Vpro0400Page").then((m) => ({ default: m.Vpro0400Page })));
const Vpro0500Page = lazy(() => import("./producao/Vpro0500Page").then((m) => ({ default: m.Vpro0500Page })));
const Vpro0600Page = lazy(() => import("./producao/Vpro0600Page").then((m) => ({ default: m.Vpro0600Page })));
const Vpro0700Page = lazy(() => import("./producao/Vpro0700Page").then((m) => ({ default: m.Vpro0700Page })));
const Vpro0800Page = lazy(() => import("./producao/Vpro0800Page").then((m) => ({ default: m.Vpro0800Page })));
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
const Vsup0200Page = lazy(() => import("./suprimento/Vsup0200Page").then((m) => ({ default: m.Vsup0200Page })));
const Vsup0300Page = lazy(() => import("./suprimento/Vsup0300Page").then((m) => ({ default: m.Vsup0300Page })));
const Vsup0400Page = lazy(() => import("./suprimento/Vsup0400Page").then((m) => ({ default: m.Vsup0400Page })));
const Vitm0100Page = lazy(() => import("./engenharia/Vitm0100Page").then((m) => ({ default: m.Vitm0100Page })));
const Vest0200Page = lazy(() => import("./almoxarifado/Vest0200Page").then((m) => ({ default: m.Vest0200Page })));
const Vmaq0101Page = lazy(() => import("./engenharia/Vmaq0101Page").then((m) => ({ default: m.Vmaq0101Page })));
const Vpro1200Page = lazy(() => import("./producao/Vpro1200Page").then((m) => ({ default: m.Vpro1200Page })));
const Vmaq0200Page = lazy(() => import("./engenharia/Vmaq0200Page").then((m) => ({ default: m.Vmaq0200Page })));
const Vexr0100Page = lazy(() => import("./comercial/Vexr0100Page").then((m) => ({ default: m.Vexr0100Page })));
const Vpct0100Page = lazy(() => import("./suprimento/Vpct0100Page").then((m) => ({ default: m.Vpct0100Page })));
const Vdes0100Page = lazy(() => import("./engenharia/Vdes0100Page").then((m) => ({ default: m.Vdes0100Page })));
const Vtps0100Page = lazy(() => import("./suprimento/Vtps0100Page").then((m) => ({ default: m.Vtps0100Page })));
const Vcfg0100Page = lazy(() => import("./engenharia/Vcfg0100Page").then((m) => ({ default: m.Vcfg0100Page })));
const Vpln0100Page = lazy(() => import("./planejamento/Vpln0100Page").then((m) => ({ default: m.Vpln0100Page })));
const Vres0100Page = lazy(() => import("./producao/Vres0100Page").then((m) => ({ default: m.Vres0100Page })));
const Vbom0100Page = lazy(() => import("./engenharia/Vbom0100Page").then((m) => ({ default: m.Vbom0100Page })));
const Vlot0100Page = lazy(() => import("./almoxarifado/Vlot0100Page").then((m) => ({ default: m.Vlot0100Page })));
const Vaud0100Page = lazy(() => import("./cadastros/Vaud0100Page").then((m) => ({ default: m.Vaud0100Page })));
const Vusr0100Page = lazy(() => import("./cadastros/Vusr0100Page").then((m) => ({ default: m.Vusr0100Page })));
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
const RETIRED_SCREENS: Record<string, { title: string; reason: string; replacement: string; replacementTitle: string }> = {
  VCON0100: {
    title: "Tipos de Contratos",
    reason: "O ERP não mantém tipos de contrato como cadastro separado: o próprio contrato já descreve situação, vigência, moeda e índice de reajuste.",
    replacement: "VCON0200",
    replacementTitle: "Cadastro de Contratos de Fornecedores",
  },
  VSUP0510: {
    title: "Apoio de Fornecedores",
    reason: "Os cadastros de apoio (tipos de fornecedor, tipos de contato e parâmetros de compras) foram unificados no cadastro de fornecedor, no botão Cadastros de apoio.",
    replacement: "VSUP0500",
    replacementTitle: "Cadastro de Fornecedores",
  },
  VPRO0100: {
    title: "Roteiro de Fabricação",
    reason: "O roteiro de fabricação era mantido em duas telas sobre os mesmos dados; ficou centralizado na engenharia, com operações, precedências, recursos, ferramentas e lead time.",
    replacement: "VENT0202",
    replacementTitle: "Roteiro de Fabricação por Item",
  },
};

const SCREEN_REGISTRY: Record<string, JSX.Element> = {
  ...Object.fromEntries(Object.entries(OPERATIONAL_ROUTINES).map(([code, routine]) => [code, <OperationalRoutinePage key={code} routine={routine} />])),
  // Plataforma / novos
  VPCT0100: <Vpct0100Page />,
  VDES0100: <Vdes0100Page />,
  VTPS0100: <Vtps0100Page />,
  VCFG0100: <Vcfg0100Page />,
  VPLN0100: <Vpln0100Page />,
  VRES0100: <Vres0100Page />,
  VBOM0100: <Vbom0100Page />,
  VLOT0100: <Vlot0100Page />,
  VAUD0100: <Vaud0100Page />,
  VUSR0100: <Vusr0100Page />,
  VNOT0100: <Vnot0100Page />,
  VEST0500: <Vest0500Page />,
  // Engenharia
  VENT0108: <Vent0108Page />,
  VPME0102: <Vpme0102Page />,
  VPME0102ITE: <Vpme0102ItePage />,
  VENT0200: <Vent0200Page />,
  VENT0210: <Vent0210Page />,
  VITE0114: <Vite0114Page />,
  VITE0115: <Vite0115Page />,
  VITE0116: <Vite0116Page />,
  // Comercial
  // Almoxarifado
  VENT0800: <Vent0800Page />,
  // Contabilidade
  VCTB0102: <Vctb0102Page />,
  VUTL0555: <Vutl0555Page />,
  // Planejamento
  VPLA0102: <Vpla0102Page />,
  VPRE0101: <Vpre0101Page />,
  VPRE0102: <Vpre0102Page />,
  VPRE0201: <Vpre0201Page />,
  VPRE0251: <Vpre0251Page />,
  VPRE0301: <Vpre0301Page />,
  // Assistência Técnica
  VATC0280: <Vatc0280Page />,
  VATC0480: <Vatc0480Page />,
  VATC0380: <Vatc0380Page />,
  VSAC0200: <Vsac0200Page />,
  // Cliente
  VCLI0500: <Vcli0500Page />,
  VCLI0510: <Vcli0510Page />,
  VCLI0520: <Vcli0520Page />,
  VCLI0530: <Vcli0530Page />,

  // Vendas & Expedição (novas)
  VEXP0100: <Vexp0100Page />,
  VVND0100: <Vvnd0100Page />,
  VVND0200: <Vvnd0200Page />,
  VVND0300: <Vvnd0300Page />,
  VVND0310: <Vvnd0310Page />,
  VVND0400: <Vvnd0400Page />,
  VVND0500: <Vvnd0500Page />,
  VSAC0100: <Vsac0100Page />,
  VDPR0100: <Vdpr0100Page />,
  VPRO0900: <Vpro0900Page />,
  VPRO1000: <Vpro1000Page />,
  VENT0115: <RoteiroFabricacaoPage code="VENT0115" />,
  VENT0202: <RoteiroFabricacaoPage code="VENT0202" />,
  VPRO0200: <Vpro0200Page />,
  VPRO0210: <Vpro0210Page />,
  VPRO0300: <Vpro0300Page />,
  VPRO0400: <Vpro0400Page />,
  VPRO0500: <Vpro0500Page />,
  VPRO0600: <Vpro0600Page />,
  VPRO0700: <Vpro0700Page />,
  VPRO0800: <Vpro0800Page />,
  VCUS0100: <Vcus0100Page />,
  VCUS0200: <Vcus0200Page />,
  VEST0100: <Vest0100Page />,
  VEST0200: <Vest0200Page />,
  VCUT0100: <Vcut0100Page />,
  VMRP0100: <Vmrp0100Page />,
  VSUP0500: <Vsup0500Page />,
  VSUP0110: <Vsup0110Page />,
  VSUP0120: <Vsup0120Page />,
  VSUP0130: <Vsup0130Page />,
  VSUP0200: <Vsup0200Page />,
  VPDC0200: <Vpdc0200Page />,
  VSUP0300: <Vsup0300Page />,
  VSUP0400: <Vsup0400Page />,
  VITM0100: <Vitm0100Page />,
  VMAQ0101: <Vmaq0101Page />,
  VMAQ0200: <Vmaq0200Page />,
  VPRO1200: <Vpro1200Page />,
  VEXR0100: <Vexr0100Page />,

  // Cadastros & Plataforma (novas)
  VEMP0100: <Vemp0100Page />,
  VFUN0100: <Vfun0100Page />,
  VLOC0100: <Vloc0100Page />,
  VCLA0100: <Vcla0100Page />,
  VCAL0100: <Vcal0100Page />,
  VPRI0100: <Vpri0100Page />,
  VCTB0200: <Vctb0200Page />,
  VNFS0100: <Vnfs0100Page />,

  // Fiscal & Financeiro
  VFIN0100: <Vfin0100Page />,
  VFIN0110: <Vfin0110Page />,
  VFIN0120: <Vfin0120Page />,
  VFIN0130: <Vfin0130Page />,
  VFIN0200: <Vfin0200Page />,
  VFIN0210: <Vfin0210Page />,
  VFIN0300: <Vfin0300Page />,
  VFIN0400: <Vfin0400Page />,
  VFIN0500: <Vfin0500Page />,
  VFIS0100: <Vfis0100Page />,
  VFIS0110: <Vfis0110Page />,
  VFIS0200: <Vfis0200Page />,
  VFIS0210: <Vfis0210Page />,
  VFIS0220: <Vfis0220Page />,
  VFIS0300: <Vfis0300Page />,
  VFIS0310: <Vfis0310Page />,
  VFIS0320: <Vfis0320Page />,
  VFIS0330: <Vfis0330Page />,
  VFIS0340: <Vfis0340Page />,
  VFIS0350: <Vfis0350Page />,
  VFIS0360: <Vfis0360Page />,
  VFIS0500: <Vfis0500Page />,
  VFIS0510: <Vfis0510Page />,
  VFIS0520: <Vfis0520Page />,
  VFIS0530: <Vfis0530Page />,
  VFIS0540: <Vfis0540Page />,
  VFIS0550: <Vfis0550Page />,
  VFIS0560: <Vfis0560Page />,
  // Custos
  VCST0202: <Vcst0202Page />,
  // PDV
  VPDV0108: <Vpdv0108Page />,
  VPDV0111: <Vpdv0111Page />,
  VVRE0200: <Vvre0200Page />,
  VRE0203: <Vre0203Page />,
  // Manutenção
  // Suprimento
  // Código legado direcionado à implementação real de Pedido de Compra.
  VCON0200: <Vcon0200Page />,
  VCON0400: <Vcon0400Page />,
  VCON0202: <Vcon0202Page />,
  VAVR0200: <Vavr0200Page />,
  // Inspeção
  VINS0106: <Vins0106Page />,
  VINS0200: <Vins0200Page />,
  VINS0201: <Vins0201Page />,
  VINS0313: <Vins0313Page />,
  VINS0400: <Vins0400Page />,
  VAVF0101: <Vavf0101Page />,
  VAVF0204: <Vavf0204Page />,
  VIMP0101: <Vimp0101Page />,
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
    // Rotina aposentada: em vez de "não implementada", diz para onde ela foi.
    const retired = code ? RETIRED_SCREENS[code] : undefined;
    if (retired) {
      return (
        <div className="erp-screen">
          <header className="erp-titlebar">
            <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
            <nav className="erp-crumbs">
              <span className="erp-crumb-mut">Rotina unificada</span>
              <span className="erp-crumb-sep">›</span>
              <span className="erp-crumb-cur">{retired.title}</span>
              <span className="erp-crumb-code">{code}</span>
            </nav>
            <div className="erp-titlebar-spacer" />
          </header>
          <div className="erp-content" style={{ flex: 1 }}>
            <section className="erp-detail-panel">
              <div className="erp-tabs"><button className="erp-tab active">Esta rotina mudou de lugar</button></div>
              <div className="erp-detail-body">
                <div className="erp-feedback info">{retired.reason}</div>
                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">Onde fazer isso agora</div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c12">
                      <table className="erp-grid">
                        <thead><tr><th style={{ width: 120 }}>Rotina</th><th>Função</th></tr></thead>
                        <tbody>
                          <tr>
                            <td style={{ fontWeight: 600 }}>{retired.replacement}</td>
                            <td>{retired.replacementTitle}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
          <footer className="erp-statusbar">
            <div className="erp-status-item">Substituída por: <strong>{retired.replacement}</strong></div>
            <div className="erp-status-spacer" />
            <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
          </footer>
        </div>
      );
    }
    return (
      <main className="screen-layout">
        <header>
          <h1>{code ?? "Tela não encontrada"}</h1>
          <p>Tela ainda não implementada.</p>
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
