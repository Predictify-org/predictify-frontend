export type KpiMetric = {
  id: string;
  value: number;
  label: string;
  unit: string; 
  prefix?: string; 
  suffix?: string; 
  decimals?: number; 
  tooltip?: string;
};

export const kpis: KpiMetric[] = [
  {
    id: 'total-volume',
    value: 14.8,
    label: 'Total Volume',
    unit: 'M',
    prefix: '$',
    suffix: '+',
    decimals: 1,
    tooltip: 'The total value of all transactions processed on the platform.',
  },
  {
    id: 'active-users',
    value: 10000,
    label: 'Active Users',
    unit: '',
    suffix: '+',
    decimals: 0,
    tooltip: 'The number of unique users who have engaged with the platform recently.',
  },
  {
    id: 'markets-created',
    value: 1200,
    label: 'Markets Created',
    unit: '',
    suffix: '+',
    decimals: 0,
    tooltip: 'The total number of prediction markets or equivalent structures created.',
  },
  {
    id: 'uptime',
    value: 99.9,
    label: 'Uptime',
    unit: '%',
    suffix: '',
    decimals: 1,
    tooltip: 'The percentage of time the platform has been operational and accessible.',
  },
];