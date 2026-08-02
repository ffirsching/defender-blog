export function normalizeText(value?: string | null): string | undefined {
  if (!value) return undefined;
  return value.replace(/\s+/g, ' ').trim();
}

export function normalizePrice(value?: string | null): number | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/[^0-9.]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function normalizeYear(value?: string | null): number | undefined {
  if (!value) return undefined;
  const match = value.match(/(\d{4})/);
  if (match) {
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  const parsed = Number(value.replace(/[^0-9]/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function normalizeMileage(value?: string | null): number | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/[^0-9]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
}
