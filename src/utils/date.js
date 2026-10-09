// Datas do app são strings 'AAAA-MM-DD' no fuso local.
// new Date('AAAA-MM-DD') interpreta como UTC (no Brasil vira o dia anterior às 21h)
// e toISOString() converte para UTC, então use sempre estes helpers.

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export const parseLocalDate = (value) => {
  if (value instanceof Date) return new Date(value.getTime());
  const match = typeof value === 'string' && value.match(DATE_ONLY);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  return new Date(value);
};

export const toDateString = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const todayString = () => toDateString(new Date());

// Soma meses mantendo o dia, limitado ao último dia do mês (31/01 + 1 = 28/02).
export const addMonths = (date, months) => {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), lastDay));
  return target;
};

export const formatDateBR = (value) => parseLocalDate(value).toLocaleDateString('pt-BR');
