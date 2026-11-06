import { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';

export function Code128Barcode({ value }: { value: string }): JSX.Element {
  const ref = useRef<SVGSVGElement>(null);
  const [semDesenho, setSemDesenho] = useState(false);
  useEffect(() => {
    if (!ref.current || !value) return;
    // Código com acento não cabe no CODE128: sem o desenho, o texto abaixo identifica.
    try { JsBarcode(ref.current, value, { format: 'CODE128', displayValue: true, height: 72, margin: 12, fontSize: 13 }); setSemDesenho(false); } catch { setSemDesenho(true); }
  }, [value]);
  return (<>
    <svg ref={ref} role="img" aria-label={`Código de barras ${value}`} style={{ maxWidth: '100%', background: '#fff', display: semDesenho ? 'none' : undefined }} />
    {semDesenho && <div style={{ fontWeight: 600 }}>{value}</div>}
  </>);
}
