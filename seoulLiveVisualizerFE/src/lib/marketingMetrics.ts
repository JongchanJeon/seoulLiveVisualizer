export type MetricKey = "opportunity" | "density" | "traffic" | "commercial" | "youth";
export type ScoreWeightKey = "crowd" | "youth" | "transit" | "commercial" | "forecast";
export type ScoreWeights = Record<ScoreWeightKey, number>;

export type PopulationData = {
  congest_lvl?: string;
  congest_msg?: string;
  ppltn_min?: number;
  ppltn_max?: number;
  fcst_ppltn_min?: number;
  fcst_ppltn_max?: number;
  ppltn_time?: string;
  maleRate?: number;
  femaleRate?: number;
  maleCount?: number;
  femaleCount?: number;
  male_ppltn_rate?: number;
  female_ppltn_rate?: number;
  male_count?: number;
  female_count?: number;
  ppltn_rate_10?: number;
  ppltn_rate_20?: number;
  ppltn_rate_30?: number;
  ppltn_rate_40?: number;
  ppltn_rate_50?: number;
  ppltn_rate_60?: number;
  ppltn_rate_70?: number;
};

export type PopulationForecast = {
  ppltn_time: string;
  ppltn_min?: number;
  ppltn_max?: number;
  fcst_ppltn_min?: number;
  fcst_ppltn_max?: number;
};

export type RawPlace = {
  place_id: number;
  area_cd?: string;
  area_nm?: string;
  gu_name?: string;
  dong_name?: string;
  lat?: number | string | null;
  lng?: number | string | null;
  population?: PopulationData | null;
  population_forecast?: PopulationForecast[];
  transit?: {
    sub_ppltn_max?: number;
    bus_ppltn_max?: number;
  } | null;
  commercial?: {
    area_sh_payment_cnt?: number;
  } | null;
};

export type MarketingMetrics = {
  opportunityScore: number;
  crowdScore: number;
  crowdFitScore: number;
  transitScore: number;
  commercialScore: number;
  youthScore: number;
  forecastScore: number;
  forecastMax: number;
  forecastGrowthRate: number;
  youthRate: number;
  transitMax: number;
  commercialMax: number;
  riskPenalty: number;
  scoreBreakdown: Array<{
    label: string;
    value: number;
    weight: number;
    contribution: number;
    help: string;
  }>;
};

export type MarketingPlace = RawPlace & {
  area_nm: string;
  gu_name?: string;
  dong_name?: string;
  lat: number;
  lng: number;
  marketing: MarketingMetrics;
};

type PoiMeta = {
  name: string;
  guName: string;
  dongName?: string;
  lat: number;
  lng: number;
};

export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = {
  crowd: 28,
  youth: 24,
  transit: 22,
  commercial: 18,
  forecast: 8,
};

const POI_META: Record<string, PoiMeta> = {
  POI001: { name: '강남 MICE 관광특구', guName: '강남구', dongName: '삼성동', lat: 37.5116, lng: 127.0596 },
  POI003: { name: '명동 관광특구', guName: '중구', dongName: '명동', lat: 37.5635, lng: 126.9816 },
  POI004: { name: '이태원 관광특구', guName: '용산구', dongName: '이태원동', lat: 37.5345, lng: 126.9946 },
  POI005: { name: '잠실 관광특구', guName: '송파구', dongName: '잠실동', lat: 37.5133, lng: 127.1001 },
  POI006: { name: '종로·청계 관광특구', guName: '종로구', dongName: '관철동', lat: 37.5693, lng: 126.9860 },
  POI007: { name: '홍대 관광특구', guName: '마포구', dongName: '서교동', lat: 37.5568, lng: 126.9242 },
  POI009: { name: '광화문·덕수궁', guName: '종로구', dongName: '세종로', lat: 37.5704, lng: 126.9769 },
  POI014: { name: '강남역', guName: '강남구', dongName: '역삼동', lat: 37.4979, lng: 127.0276 },
  POI107: { name: '성수역', guName: '성동구', dongName: '성수동', lat: 37.5482, lng: 127.0304 },
  POI108: { name: '이촌한강공원', guName: '용산구', dongName: '이촌동', lat: 37.5172, lng: 126.9707 },
  POI110: { name: '잠실한강공원', guName: '송파구', dongName: '잠실동', lat: 37.5207, lng: 127.0877 },
  POI111: { name: '잠원한강공원', guName: '서초구', dongName: '잠원동', lat: 37.5205, lng: 127.0128 },
};

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

const toNumber = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const normalizeWeights = (weights: ScoreWeights) => {
  const safeWeights: ScoreWeights = {
    crowd: Math.max(0, toNumber(weights.crowd)),
    youth: Math.max(0, toNumber(weights.youth)),
    transit: Math.max(0, toNumber(weights.transit)),
    commercial: Math.max(0, toNumber(weights.commercial)),
    forecast: Math.max(0, toNumber(weights.forecast)),
  };
  const total = Object.values(safeWeights).reduce((sum, value) => sum + value, 0);
  const base = total > 0 ? safeWeights : DEFAULT_SCORE_WEIGHTS;
  const baseTotal = Object.values(base).reduce((sum, value) => sum + value, 0) || 1;

  return {
    crowd: (base.crowd / baseTotal) * 100,
    youth: (base.youth / baseTotal) * 100,
    transit: (base.transit / baseTotal) * 100,
    commercial: (base.commercial / baseTotal) * 100,
    forecast: (base.forecast / baseTotal) * 100,
  };
};

const congestionPenalty = (level?: string) => {
  if (!level) return 6;
  if (level.includes("붐빔")) return level.includes("약간") ? 14 : 24;
  if (level.includes("보통")) return 6;
  if (level.includes("여유")) return 0;
  return 8;
};

const getForecastMax = (place: RawPlace) => {
  const forecastValues = (place.population_forecast || [])
    .map((item) => toNumber(item.fcst_ppltn_max || item.ppltn_max))
    .filter((value) => value > 0);

  if (forecastValues.length > 0) return Math.max(...forecastValues);
  return toNumber(place.population?.fcst_ppltn_max);
};

export function normalizePlace(place: RawPlace) {
  const meta = place.area_cd ? POI_META[place.area_cd] : undefined;

  return {
    ...place,
    area_nm: meta?.name || place.area_nm || "이름 없음",
    gu_name: meta?.guName || place.gu_name,
    dong_name: meta?.dongName || place.dong_name,
    lat: toNumber(meta?.lat ?? place.lat),
    lng: toNumber(meta?.lng ?? place.lng),
  };
}

export function getMetricRawValue(place: MarketingPlace | RawPlace, metric: MetricKey) {
  const populationMax = toNumber(place.population?.ppltn_max);
  const transitMax = toNumber(place.transit?.sub_ppltn_max) + toNumber(place.transit?.bus_ppltn_max);
  const commercialMax = toNumber(place.commercial?.area_sh_payment_cnt);
  const youthRate = toNumber(place.population?.ppltn_rate_20) + toNumber(place.population?.ppltn_rate_30);
  const marketing = "marketing" in place ? place.marketing : undefined;

  if (metric === "density") return populationMax;
  if (metric === "traffic") return transitMax;
  if (metric === "commercial") return commercialMax;
  if (metric === "youth") return youthRate;
  return toNumber(marketing?.opportunityScore);
}

export function getMetricLabel(metric: MetricKey) {
  if (metric === "density") return "실시간 인구";
  if (metric === "traffic") return "교통 접근성";
  if (metric === "commercial") return "결제 건수";
  if (metric === "youth") return "2030 비중";
  return "행사 추천점수";
}

export function formatMetricValue(place: MarketingPlace, metric: MetricKey) {
  const value = getMetricRawValue(place, metric);
  if (metric === "commercial") return `${Math.round(value).toLocaleString()}건`;
  if (metric === "youth") return `${value.toFixed(1)}%`;
  if (metric === "opportunity") return `${value.toFixed(0)}점`;
  return `${Math.round(value).toLocaleString()}명`;
}

export function enrichPlaces(places: RawPlace[], weights: ScoreWeights = DEFAULT_SCORE_WEIGHTS): MarketingPlace[] {
  const normalized = places.map(normalizePlace);
  const maxPopulation = Math.max(...normalized.map((place) => toNumber(place.population?.ppltn_max)), 1);
  const maxTransit = Math.max(...normalized.map((place) => toNumber(place.transit?.sub_ppltn_max) + toNumber(place.transit?.bus_ppltn_max)), 1);
  const maxCommercial = Math.max(...normalized.map((place) => toNumber(place.commercial?.area_sh_payment_cnt)), 1);
  const scoreWeights = normalizeWeights(weights);

  return normalized.map((place) => {
    const populationMax = toNumber(place.population?.ppltn_max);
    const forecastMax = getForecastMax(place);
    const transitMax = toNumber(place.transit?.sub_ppltn_max) + toNumber(place.transit?.bus_ppltn_max);
    const commercialMax = toNumber(place.commercial?.area_sh_payment_cnt);
    const youthRate = toNumber(place.population?.ppltn_rate_20) + toNumber(place.population?.ppltn_rate_30);
    const crowdScore = clamp((populationMax / maxPopulation) * 100);
    const crowdFitScore = crowdScore > 85 ? clamp(100 - (crowdScore - 85) * 1.8) : crowdScore;
    const transitScore = clamp((transitMax / maxTransit) * 100);
    const commercialScore = clamp((commercialMax / maxCommercial) * 100);
    const youthScore = clamp(youthRate * 1.45);
    const forecastGrowthRate = populationMax > 0 && forecastMax > 0
      ? ((forecastMax - populationMax) / populationMax) * 100
      : 0;
    const forecastScore = forecastMax > 0 ? clamp(forecastGrowthRate + 50) : 50;
    const riskPenalty = congestionPenalty(place.population?.congest_lvl);
    const crowdContribution = crowdFitScore * (scoreWeights.crowd / 100);
    const youthContribution = youthScore * (scoreWeights.youth / 100);
    const transitContribution = transitScore * (scoreWeights.transit / 100);
    const commercialContribution = commercialScore * (scoreWeights.commercial / 100);
    const forecastContribution = forecastScore * (scoreWeights.forecast / 100);
    const opportunityScore = clamp(
      crowdContribution +
      youthContribution +
      transitContribution +
      commercialContribution +
      forecastContribution -
      riskPenalty
    );

    return {
      ...place,
      marketing: {
        opportunityScore,
        crowdScore,
        crowdFitScore,
        transitScore,
        commercialScore,
        youthScore,
        forecastScore,
        forecastMax,
        forecastGrowthRate,
        youthRate,
        transitMax,
        commercialMax,
        riskPenalty,
        scoreBreakdown: [
          {
            label: "집객 적정성",
            value: crowdFitScore,
            weight: scoreWeights.crowd,
            contribution: crowdContribution,
            help: "현재 인구가 충분하되 과밀하면 감점합니다.",
          },
          {
            label: "2030 타깃성",
            value: youthScore,
            weight: scoreWeights.youth,
            contribution: youthContribution,
            help: "20대와 30대 비중을 팝업·행사 타깃 적합도로 환산합니다.",
          },
          {
            label: "교통 접근성",
            value: transitScore,
            weight: scoreWeights.transit,
            contribution: transitContribution,
            help: "지하철과 버스 승하차 규모를 후보지 간 상대 점수로 비교합니다.",
          },
          {
            label: "결제 건수",
            value: commercialScore,
            weight: scoreWeights.commercial,
            contribution: commercialContribution,
            help: "현장 구매 전환 가능성을 카드 결제 건수로 봅니다.",
          },
          {
            label: "예측 성장성",
            value: forecastScore,
            weight: scoreWeights.forecast,
            contribution: forecastContribution,
            help: "미래 예측 인구가 현재보다 증가하면 가산합니다.",
          },
        ],
      },
    };
  });
}

export function getRecommendationTier(score: number) {
  if (score >= 76) return { label: "최우선 후보", color: "#0f766e" };
  if (score >= 60) return { label: "검토 추천", color: "#2563eb" };
  if (score >= 42) return { label: "조건부 후보", color: "#d97706" };
  return { label: "관찰 필요", color: "#64748b" };
}

export function getEventAdvice(place: MarketingPlace) {
  const score = place.marketing.opportunityScore;
  const youthRate = place.marketing.youthRate;
  const transitScore = place.marketing.transitScore;
  const commercialScore = place.marketing.commercialScore;
  const congestion = place.population?.congest_lvl || "정보 없음";
  const messages = [];

  if (score >= 76) messages.push("팝업스토어 또는 브랜드 체험존 우선 검토");
  else if (score >= 60) messages.push("소규모 오프라인 프로모션에 적합");
  else messages.push("추가 시간대 데이터를 보고 운영 여부 판단");

  if (youthRate >= 45) messages.push("2030 타깃 캠페인 반응 기대");
  if (transitScore >= 65) messages.push("대중교통 유입형 집객 전략 추천");
  if (commercialScore >= 65) messages.push("현장 구매 전환 이벤트와 궁합이 좋음");
  if (congestion.includes("붐빔")) messages.push("혼잡 관리 인력과 대기 동선 확보 필요");

  return messages.slice(0, 4);
}
