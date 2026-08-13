import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

export function Code128Barcode({ value }: { value: string }): JSX.Element {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!ref.current || !value) return;
    JsBarcode(ref.current, value, { format: 'CODE128', displayValue: true, height: 72, margin: 12, fontSize: 13 });
  }, [value]);
  return <svg ref={ref} role="img" aria-label={`Código de barras ${value}`} style={{ maxWidth: '100%', background: '#fff' }} />;
}
