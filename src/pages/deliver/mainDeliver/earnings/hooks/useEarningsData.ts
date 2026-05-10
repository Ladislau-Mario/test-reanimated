import { useMemo } from 'react';
import { DayData, Goal, EarningsSummary } from '../types';

// ─── Paleta central ───────────────────────────────────────────────────────────
export const C = {
  bg:        '#080C10',
  surface:   '#0F1923',
  card:      '#141E2B',
  card2:     '#1A2535',
  border:    '#FFFFFF0D',
  border2:   '#FFFFFF18',
  blue:      '#3B7BFF',
  blueLight: '#6B9FFF',
  blueDim:   '#3B7BFF1A',
  green:     '#22D07A',
  greenDim:  '#22D07A18',
  red:       '#FF4D6A',
  redDim:    '#FF4D6A18',
  amber:     '#FFB830',
  amberDim:  '#FFB83018',
  cyan:      '#00D4FF',
  cyanDim:   '#00D4FF12',
  purple:    '#A855F7',
  purpleDim: '#A855F718',
  white:     '#FFFFFF',
  muted:     '#8899AA',
  muted2:    '#566070',
  sep:       '#FFFFFF08',
};

function buildHourly(): number[] {
  return Array.from({ length: 24 }, (_, h) => {
    const base = [0,0,0,0,0,0,0,180,420,580,780,900,1050,720,580,680,820,1250,1500,860,580,320,140,0];
    if (h < 7 || h > 22) return 0;
    return Math.max(0, base[h] + Math.round((Math.random() - 0.5) * 300));
  });
}

function buildDays(): DayData[] {
  const weekdays = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  return Array.from({ length: 9 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (8 - i));
    const deliveries = 12 + Math.floor(Math.random() * 55);
    const baseEarnings = deliveries * (280 + Math.floor(Math.random() * 180));
    return {
      day: d.getDate(),
      weekday: weekdays[d.getDay()],
      earnings: baseEarnings,
      deliveries,
      timeOnline: 150 + Math.floor(Math.random() * 280),
      hourlyData: buildHourly(),
    };
  });
}

// Singleton para não regenerar a cada render
let _daysCache: DayData[] | null = null;
export function getDaysData(): DayData[] {
  if (!_daysCache) _daysCache = buildDays();
  return _daysCache;
}

export const GOALS: Goal[] = [
  { label: 'Básico', tier: 'basic', targetKz: 8000,  targetDeliveries: 15, color: C.green,  bonusKz: 500  },
  { label: 'Pro',    tier: 'pro',   targetKz: 18000, targetDeliveries: 35, color: C.blue,   bonusKz: 1500 },
  { label: 'Ninja',  tier: 'ninja', targetKz: 30000, targetDeliveries: 56, color: C.amber,  bonusKz: 3000 },
];

export function useEarningsSummary(days: DayData[]): EarningsSummary {
  return useMemo(() => {
    const totalWeek = days.reduce((s, d) => s + d.earnings, 0);
    const totalDeliveries = days.reduce((s, d) => s + d.deliveries, 0);
    const bestDay = days.reduce((b, d) => d.earnings > b.earnings ? d : b, days[0]);
    return {
      totalWeek,
      totalDeliveries,
      bestDay,
      avgPerDay: Math.round(totalWeek / days.length),
      avgPerDelivery: totalDeliveries > 0 ? Math.round(totalWeek / totalDeliveries) : 0,
    };
  }, [days]);
}

export function fmtKz(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M Kz`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k Kz`;
  return `${n} Kz`;
}

export function fmtTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2,'0')}m`;
}
