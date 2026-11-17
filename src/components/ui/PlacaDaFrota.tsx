import { useEffect, useId, useState } from "react";
import { getShippingCarrier, type CarrierVehicleDTO } from "@/services/shippingCarrierService";

/**
 * Placa do veículo com sugestão da frota da transportadora escolhida (VSUP0140).
 * Escolhida uma placa da frota, `onChange` devolve também o veículo, para a tela
 * trazer motorista e documento. Placa digitada fora da frota continua aceita:
 * veículo eventual não trava a expedição.
 */
export function PlacaDaFrota({ carrierId, value, onChange }: {
  carrierId?: number;
  value: string;
  onChange: (placa: string, veiculo?: CarrierVehicleDTO) => void;
}): JSX.Element {
  const lista = useId();
  const [frota, setFrota] = useState<CarrierVehicleDTO[]>([]);
  useEffect(() => {
    let vivo = true;
    if (!carrierId) { setFrota([]); return; }
    getShippingCarrier(carrierId)
      .then((c) => { if (vivo) setFrota((c.vehicles ?? []).filter((v) => v.is_active !== false)); })
      .catch(() => { if (vivo) setFrota([]); });
    return () => { vivo = false; };
  }, [carrierId]);
  const limpa = (p: string) => p.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return (
    <>
      <input className="erp-input" list={lista} value={value}
        placeholder={frota.length ? "Escolha da frota ou digite" : undefined}
        onChange={(e) => {
          const placa = e.target.value.toUpperCase();
          onChange(placa, frota.find((v) => limpa(v.plate) === limpa(placa)));
        }} />
      <datalist id={lista}>
        {frota.map((v) => <option key={v.plate} value={v.plate}>{[v.vehicle_type, v.driver_name].filter(Boolean).join(" · ")}</option>)}
      </datalist>
    </>
  );
}
