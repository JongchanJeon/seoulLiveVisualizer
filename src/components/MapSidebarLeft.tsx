import { Activity, CreditCard, RotateCcw, Target, Train, Users } from "lucide-react";
import type { ReactNode } from "react";
import {
  DEFAULT_SCORE_WEIGHTS,
  formatMetricValue,
  getMetricLabel,
  getMetricRawValue,
  getRecommendationTier,
  type MarketingPlace,
  type MetricKey,
  type ScoreWeightKey,
  type ScoreWeights,
} from "../lib/marketingMetrics";

interface SidebarProps {
  places: MarketingPlace[];
  selectedMetric: MetricKey;
  setSelectedMetric: (metric: MetricKey) => void;
  selectedPlaceId: number | null;
  setSelectedPlaceId: (id: number) => void;
  cutoffValue: number;
  setCutoffValue: (val: number) => void;
  scoreWeights: ScoreWeights;
  setScoreWeights: (weights: ScoreWeights) => void;
}

const metricOptions: Array<{
  key: MetricKey;
  title: string;
  desc: string;
  icon: ReactNode;
}> = [
  { key: "opportunity", title: "추천점수", desc: "가중치 반영 종합 점수", icon: <Target size={16} /> },
  { key: "density", title: "실시간 인구", desc: "현재 방문 가능 모수", icon: <Users size={16} /> },
  { key: "traffic", title: "교통 접근성", desc: "지하철·버스 승하차 합산", icon: <Train size={16} /> },
  { key: "commercial", title: "결제 건수", desc: "카드 결제 건수", icon: <CreditCard size={16} /> },
  { key: "youth", title: "2030 비중", desc: "20대·30대 인구 비율", icon: <Activity size={16} /> },
];

const weightOptions: Array<{
  key: ScoreWeightKey;
  label: string;
  desc: string;
}> = [
  { key: "crowd", label: "집객", desc: "현재 인구 규모" },
  { key: "youth", label: "2030", desc: "젊은 타깃 비중" },
  { key: "transit", label: "교통", desc: "대중교통 유입" },
  { key: "commercial", label: "결제", desc: "상권 구매 활력" },
  { key: "forecast", label: "예측", desc: "앞으로의 증가세" },
];

const weightPresets: Array<{
  label: string;
  weights: ScoreWeights;
}> = [
  { label: "균형형", weights: DEFAULT_SCORE_WEIGHTS },
  { label: "2030 타깃", weights: { crowd: 18, youth: 42, transit: 18, commercial: 14, forecast: 8 } },
  { label: "교통 유입", weights: { crowd: 18, youth: 18, transit: 40, commercial: 14, forecast: 10 } },
  { label: "구매 전환", weights: { crowd: 18, youth: 18, transit: 16, commercial: 40, forecast: 8 } },
];

const weightTotal = (weights: ScoreWeights) => Object.values(weights).reduce((sum, value) => sum + value, 0);

function normalizedWeight(weights: ScoreWeights, key: ScoreWeightKey) {
  const total = weightTotal(weights);
  if (total <= 0) return 0;
  return (weights[key] / total) * 100;
}

export function MapSidebarLeft({
  places,
  selectedMetric,
  setSelectedMetric,
  selectedPlaceId,
  setSelectedPlaceId,
  cutoffValue,
  setCutoffValue,
  scoreWeights,
  setScoreWeights,
}: SidebarProps) {
  const sortedPlaces = [...places].sort((a, b) => getMetricRawValue(b, selectedMetric) - getMetricRawValue(a, selectedMetric));
  const maxVal = Math.max(...sortedPlaces.map((place) => getMetricRawValue(place, selectedMetric)), 1);
  const featuredPlace = [...places].sort((a, b) => (b.marketing?.opportunityScore || 0) - (a.marketing?.opportunityScore || 0))[0];
  const dataReadyCount = places.filter((place) => place.population).length;
  const totalWeight = weightTotal(scoreWeights);

  const updateWeight = (key: ScoreWeightKey, value: number) => {
    setScoreWeights({
      ...scoreWeights,
      [key]: value,
    });
  };

  return (
    <>
      <div className="map-panel-heading">
        <div>
          <p className="eyebrow">Offline Event Intelligence</p>
          <h1>서울 팝업·행사 후보지</h1>
        </div>
        <p>실시간 인구, 2030 비중, 교통 유입, 결제 건수를 고객 목적에 맞춰 비교합니다.</p>
      </div>

      <section className="insight-card">
        <div className="insight-card__header">
          <span>현재 1순위 후보</span>
          <strong>{dataReadyCount}/{places.length || 0}</strong>
        </div>
        {featuredPlace ? (
          <>
            <div className="hero-place">
              <div>
                <strong>{featuredPlace.area_nm}</strong>
                <span>{featuredPlace.gu_name || "서울"} {featuredPlace.dong_name || ""}</span>
              </div>
              <b>{Math.round(featuredPlace.marketing?.opportunityScore || 0)}점</b>
            </div>
            <div className="mini-bars">
              <MiniBar label="2030" value={featuredPlace.marketing?.youthScore || 0} />
              <MiniBar label="교통" value={featuredPlace.marketing?.transitScore || 0} />
              <MiniBar label="결제" value={featuredPlace.marketing?.commercialScore || 0} />
            </div>
          </>
        ) : (
          <p className="empty-copy">백엔드 데이터가 준비되면 후보지가 표시됩니다.</p>
        )}
      </section>

      <section className="control-card">
        <div className="range-title">
          <h2>고객별 가중치</h2>
          <button className="weight-reset-button" onClick={() => setScoreWeights(DEFAULT_SCORE_WEIGHTS)} type="button">
            <RotateCcw size={13} />
            초기화
          </button>
        </div>

        <div className="preset-row">
          {weightPresets.map((preset) => (
            <button key={preset.label} type="button" onClick={() => setScoreWeights(preset.weights)}>
              {preset.label}
            </button>
          ))}
        </div>

        <div className="weight-list">
          {weightOptions.map((option) => {
            const normalized = normalizedWeight(scoreWeights, option.key);

            return (
              <label key={option.key} className="weight-control">
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.desc}</small>
                </span>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={scoreWeights[option.key]}
                  onChange={(event) => updateWeight(option.key, parseInt(event.target.value, 10))}
                />
                <b>{Math.round(normalized)}%</b>
              </label>
            );
          })}
        </div>
        <p className="helper-copy">입력 합계 {totalWeight}을 100% 기준으로 환산해 추천점수를 다시 계산합니다.</p>
      </section>

      <section className="control-card">
        <h2>분석 기준</h2>
        <div className="metric-grid">
          {metricOptions.map((metric) => (
            <MetricButton
              key={metric.key}
              active={selectedMetric === metric.key}
              onClick={() => setSelectedMetric(metric.key)}
              icon={metric.icon}
              title={metric.title}
              desc={metric.desc}
            />
          ))}
        </div>
      </section>

      <section className="control-card">
        <div className="range-title">
          <h2>강조 기준</h2>
          <span>{cutoffValue}점 이상</span>
        </div>
        <p className="helper-copy">지도와 랭킹에서 기준 이상 후보지를 진하게 표시합니다.</p>
        <input
          type="range"
          min="20"
          max="90"
          step="5"
          value={cutoffValue}
          onChange={(event) => setCutoffValue(parseInt(event.target.value, 10))}
          className="score-range"
        />
      </section>

      <section className="rank-card">
        <h2>{getMetricLabel(selectedMetric)} 랭킹</h2>
        <div className="rank-list">
          {sortedPlaces.map((place, index) => {
            const rawVal = getMetricRawValue(place, selectedMetric);
            const pct = Math.min(100, Math.max(0, (rawVal / maxVal) * 100));
            const score = place.marketing?.opportunityScore || 0;
            const tier = getRecommendationTier(score);
            const isSelected = place.place_id === selectedPlaceId;
            const isHighlighted = selectedMetric === "opportunity" ? score >= cutoffValue : pct >= cutoffValue;

            return (
              <button
                key={place.place_id}
                onClick={() => setSelectedPlaceId(place.place_id)}
                className={`rank-item ${isSelected ? "is-selected" : ""} ${isHighlighted ? "is-highlighted" : ""}`}
              >
                <span className="rank-index">{index + 1}</span>
                <span className="rank-main">
                  <strong>{place.area_nm}</strong>
                  <small>{tier.label}</small>
                  <span className="rank-bar">
                    <i style={{ width: `${pct}%` }} />
                  </span>
                </span>
                <span className="rank-value">{formatMetricValue(place, selectedMetric)}</span>
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}

function MetricButton({ active, onClick, icon, title, desc }: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button className={`metric-button ${active ? "is-active" : ""}`} onClick={onClick}>
      <span>{icon}</span>
      <strong>{title}</strong>
      <small>{desc}</small>
    </button>
  );
}

function MiniBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <span>{label}</span>
      <b>{Math.round(value)}</b>
      <i><em style={{ width: `${Math.max(4, Math.min(100, value))}%` }} /></i>
    </div>
  );
}
