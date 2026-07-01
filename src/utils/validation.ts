/**
 * Brazilian document (CPF / CNPJ) check-digit validation.
 *
 * Accepts values with or without punctuation. Detects the document type by the
 * number of digits: 11 → CPF, 14 → CNPJ. Returns false for anything else.
 */

function onlyDigits(value: string): string {
  return (value ?? '').replace(/\D/g, '');
}

/** Validates an 11-digit CPF by its two check digits. */
export function validateCPF(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;
  // Reject sequences of identical digits (000..., 111..., etc.) — pass the
  // arithmetic but are never valid documents.
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digits = cpf.split('').map(Number);

  const calcCheck = (count: number): number => {
    let sum = 0;
    for (let i = 0; i < count; i++) {
      sum += digits[i] * (count + 1 - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return calcCheck(9) === digits[9] && calcCheck(10) === digits[10];
}

/** Validates a 14-digit CNPJ by its two check digits. */
export function validateCNPJ(value: string): boolean {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const digits = cnpj.split('').map(Number);

  const calcCheck = (count: number): number => {
    // Weights run 2..9 cycling, applied from right to left.
    let weight = 2;
    let sum = 0;
    for (let i = count - 1; i >= 0; i--) {
      sum += digits[i] * weight;
      weight = weight === 9 ? 2 : weight + 1;
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  return calcCheck(12) === digits[12] && calcCheck(13) === digits[13];
}

/**
 * Validates a value as either a CPF or a CNPJ, auto-detecting by length.
 * Used by Cliente / Fornecedor / NF-e screens for the document field.
 */
export function validateCNPJOrCPF(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length === 11) return validateCPF(digits);
  if (digits.length === 14) return validateCNPJ(digits);
  return false;
}
