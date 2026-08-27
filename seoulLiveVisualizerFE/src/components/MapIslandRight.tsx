import { AlertTriangle, CreditCard, MapPin, Target, Train, TrendingUp, Users, X } from "lucide-react";
import type { ReactNode } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { DemographicsBarChart } from "./DemographicsBarChart";
import { TrendLineChart } from "./TrendLineChart";
import { getEventAdvice, getRecommendationTier, type MarketingPlace, type PopulationForecast } from "../lib/marketingMetrics";

type HistoryData = {
  population_history?: Array<{ ppltn_time: string; ppltn_max: number }>;
  population_forecast?: PopulationForecast[];
  transit_history?: Array<{ traffic_time?: string; sub_ppltn_max?: number; bus_ppltn_max?: number }>;
};

interface IslandProps {
  placeName: string;
  realtimeData: MarketingPlace;
  historyData: HistoryData | null;
  onClose: () => void;
}

const GENDER_COLORS = {
  male: "#2563eb",
  female: "#c026d3",
};

const toFiniteNumber = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

function getGenderRatio(population: MarketingPlace["population"]) {
  const maleRate = toFiniteNumber(population?.maleRate ?? population?.male_ppltn_rate);
  const femaleRate = toFiniteNumber(population?.femaleRate ?? population?.female_ppltn_rate);
  const rateTotal = maleRate + femaleRate;

  if (rateTotal > 0) {
    return {
      hasData: true,
      maleRate: (maleRate / rateTotal) * 100,
      femaleRate: (femaleRate / rateTotal) * 100,
    };
  }

  const maleCount = toFiniteNumber(population?.maleCount ?? population?.male_count);
  const femaleCount = toFiniteNumber(population?.femaleCount ?? population?.female_count);
  const countTotal = maleCount + femaleCount;

  if (countTotal > 0) {
    return {
      hasData: true,
      maleRate: (maleCount / countTotal) * 100,
      femaleRate: (femaleCount / countTotal) * 100,
    };
  }

  return { hasData: false, maleRate: 0, femaleRate: 0 };
}

export function MapIslandRight({ realtimeData, historyData, onClose }: IslandProps) {
  if (!realtimeData) return null;

  const genderRatio = getGenderRatio(realtimeData.population);
  const score = realtimeData.marketing?.opportunityScore || 0;
  const tier = getRecommendationTier(score);
  const genderData = [
    { name: "남성", value: genderRatio.maleRate, color: GENDER_COLORS.male },
    { name: "여성", value: genderRatio.femaleRate, color: GENDER_COLORS.female },
  ];
  const advice = getEventAdvice(realtimeData);
  const syncedPopulationHistory = historyData?.population_history || [];
  const populationHistory = syncedPopulationHistory.length > 0
    ? syncedPopulationHistory
    : realtimeData.population?.ppltn_max
      ? [{
          ppltn_time: realtimeData.population.ppltn_time || new Date().toISOString(),
          ppltn_max: realtimeData.population.ppltn_max,
        }]
      : [];
  const backendForecastHistory = historyData?.population_forecast || realtimeData.population_forecast || [];
  const forecastHistory = backendForecastHistory.length > 0
    ? backendForecastHistory
    : realtimeData.population?.fcst_ppltn_max
      ? [{
          ppltn_time: new Date(new Date(realtimeData.population.ppltn_time || Date.now()).getTime() + 60 * 60 * 1000).toISOString(),
          fcst_ppltn_min: realtimeData.population.fcst_ppltn_min,
          fcst_ppltn_max: realtimeData.population.fcst_ppltn_max,
        }]
      : [];
  const syncedTransitHistory = historyData?.transit_history || [];
  const transitHistory = syncedTransitHistory.length > 0
    ? syncedTransitHistory
    : realtimeData.transit?.sub_ppltn_max || realtimeData.transit?.bus_ppltn_max
      ? [{
          traffic_time: realtimeData.population?.ppltn_time || new Date().toISOString(),
          sub_ppltn_max: realtimeData.transit?.sub_ppltn_max,
          bus_ppltn_max: realtimeData.transit?.bus_ppltn_max,
        }]
      : [];
  const forecastMax = realtimeData.marketing?.forecastMax || 0;
  const forecastGrowthRate = realtimeData.marketing?.forecastGrowthRate || 0;
  const peakForecast = forecastHistory.reduce<PopulationForecast | undefined>((best, item) => {
    const bestValue = best?.fcst_ppltn_max || best?.ppltn_max || 0;
    const itemValue = item.fcst_ppltn_max || item.ppltn_max || 0;
    return itemValue > bestValue ? item : best;
  }, undefined);
  const forecastTime = peakForecast?.ppltn_time
    ? new Date(peakForecast.ppltn_time).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false })
    : "다음 시간대";

  return (
    <div className="detail-panel">
      <div className="detail-header">
        <div>
          <p className="eyebrow">Candidate Detail</p>
          <h2>
            <MapPin size={18} />
            {realtimeData.area_nm}
          </h2>
          <span>{realtimeData.gu_name || "서울"} {realtimeData.dong_name || ""}</span>
        </div>
        <button onClick={onClose} className="icon-button" aria-label="상세 패널 닫기">
          <X size={18} />
        </button>
      </div>

      <div className="detail-scroll">
        <section className="score-card">
          <div>
            <span style={{ color: tier.color }}>{tier.label}</span>
            <strong>{Math.round(score)}점</strong>
            <p>집객력, 2030 타깃성, 교통 접근성, 결제 건수를 종합한 행사 후보지 점수입니다.</p>
          </div>
          <div className="score-ring" style={{ background: `conic-gradient(${tier.color} ${score * 3.6}deg, #e5e7eb 0deg)` }}>
            <i>{Math.round(score)}</i>
          </div>
        </section>

        <section className="kpi-row">
          <Kpi icon={<Users size={16} />} label="최대 인구" value={`${(realtimeData.population?.ppltn_max || 0).toLocaleString()}명`} />
          <Kpi icon={<TrendingUp size={16} />} label="예측 인구" value={forecastMax > 0 ? `${forecastMax.toLocaleString()}명` : "정보 없음"} />
          <Kpi icon={<Train size={16} />} label="교통 유입" value={`${(realtimeData.marketing?.transitMax || 0).toLocaleString()}명`} />
          <Kpi icon={<CreditCard size={16} />} label="결제 건수" value={`${(realtimeData.marketing?.commercialMax || 0).toLocaleString()}건`} />
          <Kpi icon={<AlertTriangle size={16} />} label="혼잡도" value={realtimeData.population?.congest_lvl || "정보 없음"} />
        </section>

        <section className="detail-card">
          <h3><TrendingUp size={16} /> 미래 인구 예측</h3>
          {forecastHistory.length > 0 ? (
            <>
              <div className="forecast-summary">
                <div>
                  <span>{forecastTime} 기준</span>
                  <strong>{forecastMax.toLocaleString()}명</strong>
                </div>
                <b className={forecastGrowthRate >= 0 ? "is-up" : "is-down"}>
                  {forecastGrowthRate >= 0 ? "+" : ""}{forecastGrowthRate.toFixed(1)}%
                </b>
              </div>
              <div className="forecast-timeline">
                {forecastHistory.slice(0, 6).map((forecast) => {
                  const value = forecast.fcst_ppltn_max || forecast.ppltn_max || 0;
                  const label = new Date(forecast.ppltn_time).toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  });

                  return (
                    <div key={`${forecast.ppltn_time}-${value}`}>
                      <span>{label}</span>
                      <i><em style={{ width: `${Math.max(8, Math.min(100, forecastMax ? (value / forecastMax) * 100 : 0))}%` }} /></i>
                      <strong>{value.toLocaleString()}명</strong>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="empty-state compact">예측 인구 데이터가 아직 없습니다.</div>
          )}
        </section>

        <section className="detail-card">
          <h3><Target size={16} /> 운영 인사이트</h3>
          <div className="advice-list">
            {advice.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          {realtimeData.population?.congest_msg && (
            <p className="congestion-copy">{realtimeData.population.congest_msg}</p>
          )}
        </section>

        <section className="detail-card split-card">
          <h3><Users size={16} /> 남녀 비율</h3>
          {genderRatio.hasData ? (
            <div className="gender-chart">
              <div className="gender-donut">
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderData}
                    innerRadius={34}
                    outerRadius={58}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="#ffffff"
                    strokeWidth={2}
                  >
                    {genderData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(value: number | string) => [`${Number(value).toFixed(1)}%`, "비율"]} />
                </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="gender-legend">
                {genderData.map((item, index) => (
                  <p key={item.name}>
                    <i style={{ background: item.color }} />
                    <span>{index === 0 ? "남성" : "여성"}</span>
                    <strong>{Number(item.value).toFixed(1)}%</strong>
                  </p>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state compact">남녀 비율 데이터가 없습니다.</div>
          )}
        </section>

        <section className="detail-card">
          <h3>점수 산정 방식</h3>
          <div className="score-breakdown">
            {realtimeData.marketing.scoreBreakdown.map((item) => (
              <div key={item.label} className="score-factor">
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.help}</span>
                </div>
                <b>{item.contribution.toFixed(1)}점</b>
                <i><em style={{ width: `${Math.max(4, Math.min(100, item.value))}%` }} /></i>
                <small>원점수 {Math.round(item.value)} · 가중치 {Math.round(item.weight)}%</small>
              </div>
            ))}
            <div className="score-penalty">
              <span>혼잡도 위험 감점</span>
              <strong>-{realtimeData.marketing.riskPenalty.toFixed(0)}점</strong>
            </div>
          </div>
        </section>

        <section className="detail-card">
          <h3>연령대 분포</h3>
          <div className="chart-frame">
            <DemographicsBarChart data={realtimeData.population} />
          </div>
        </section>

        <section className="detail-card">
          <h3>최근 추세</h3>
          <div className="chart-frame trend">
            <TrendLineChart populationHistory={populationHistory} forecastHistory={forecastHistory} transitHistory={transitHistory} />
          </div>
        </section>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="kpi-tile">
      <span>{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}
