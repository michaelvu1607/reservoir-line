export type MonthPoint = {
  t: string;
  m: number;
};

export type LakePoint = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  /** NASA class: 1 is ≤ −4σ, 8 is ≥ +4σ, 0 is unscored. */
  status: number;
  date: string;
};

export type LakeDetail = LakePoint & {
  displayName: string;
  about: string | null;
  note: string | null;
  latestM: number | null;
  latestDate: string | null;
  meanM: number | null;
  minM: number | null;
  maxM: number | null;
  highYear: number | null;
  highYearM: number | null;
  series: MonthPoint[];
  stale: boolean;
};

export type WaterReport = {
  generatedAt: string;
  source: string;
  catalogDate: string | null;
  imagineConfigured: boolean;
  lakes: LakePoint[];
  ranked: LakeDetail[];
  warnings: string[];
};
