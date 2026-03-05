export function formatMoney(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(2)} €`;
}