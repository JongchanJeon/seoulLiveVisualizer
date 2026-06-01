import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface HistoryRecord {
  ppltn_time?: string;
  ppltn_max?: number | null;
}

interface ForecastRecord {
  ppltn_time?: string;
  ppltn_max?: number | null;
  fcst_ppltn_max?: number | null;
}

interface TransitRecord {
  traffic_time?: string;
  sub_ppltn_max?: number | null;
  bus_ppltn_max?: number | null;
}

interface TrendLineChartProps {
  populationHistory?: HistoryRecord[];
  forecastHistory?: ForecastRecord[];
  transitHistory?: TransitRecord[];
}

type TrendDatum = {
  timestamp: number;
  time: string;
  population?: number;
  forecast?: number;
  subway?: number;
  bus?: number;
};

const PERSON_UNIT = "명";

const SERIES = {
  population: { label: "실시간 인구", color: "#0f766e" },
  forecast: { label: "예측 인구", color: "#f97316" },
  subway: { label: "지하철", color: "#2563eb" },
  bus: { label: "버스", color: "#64748b" },
};

const toNumberOrUndefined = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
};

const toTimestamp = (value?: string) => {
  if (!value) return undefined;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : undefined;
};

const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

const formatCompact = (value?: number) => {
  if (value === undefined) return "정보 없음";
  if (value >= 10000) return `${Math.round(value / 1000).toLocaleString()}천${PERSON_UNIT}`;
  return `${value.toLocaleString()}${PERSON_UNIT}`;
};

function upsertDatum(dataByTime: Map<number, TrendDatum>, timestamp: number): TrendDatum {
  const existing = dataByTime.get(timestamp);
  if (existing) return existing;

  const datum: TrendDatum = {
    timestamp,
    time: formatTime(timestamp),
  };
  dataByTime.set(timestamp, datum);
  return datum;
}

function latestValue(chartData: TrendDatum[], key: keyof Omit<TrendDatum, "timestamp" | "time">) {
  for (let index = chartData.length - 1; index >= 0; index -= 1) {
    const value = chartData[index][key];
    if (value !== undefined) return value;
  }

  return undefined;
}

export function TrendLineChart({
  populationHistory = [],
  forecastHistory = [],
  transitHistory = [],
}: TrendLineChartProps) {
  const dataByTime = new Map<number, TrendDatum>();

  populationHistory.forEach((pop) => {
    const timestamp = toTimestamp(pop.ppltn_time);
    const population = toNumberOrUndefined(pop.ppltn_max);
    if (!timestamp || population === undefined) return;

    upsertDatum(dataByTime, timestamp).population = population;
  });

  transitHistory.forEach((transit, index) => {
    const timestamp = toTimestamp(transit.traffic_time) ?? toTimestamp(populationHistory[index]?.ppltn_time);
    if (!timestamp) return;

    const datum = upsertDatum(dataByTime, timestamp);
    datum.subway = toNumberOrUndefined(transit.sub_ppltn_max);
    datum.bus = toNumberOrUndefined(transit.bus_ppltn_max);
  });

  forecastHistory.forEach((forecast) => {
    const timestamp = toTimestamp(forecast.ppltn_time);
    const forecastPopulation = toNumberOrUndefined(forecast.fcst_ppltn_max ?? forecast.ppltn_max);
    if (!timestamp || forecastPopulation === undefined) return;

    upsertDatum(dataByTime, timestamp).forecast = forecastPopulation;
  });

  const chartData = Array.from(dataByTime.values()).sort((a, b) => a.timestamp - b.timestamp);
  const hasPopulation = chartData.some((item) => item.population !== undefined);
  const hasForecast = chartData.some((item) => item.forecast !== undefined);
  const hasSubway = chartData.some((item) => item.subway !== undefined);
  const hasBus = chartData.some((item) => item.bus !== undefined);
  const visibleSeriesCount = [hasPopulation, hasForecast, hasSubway, hasBus].filter(Boolean).length;

  if (chartData.length === 0 || visibleSeriesCount === 0) {
    return (
      <div className="trend-empty">
        <strong>최근 추세 데이터가 아직 없습니다.</strong>
        <span>서버를 실행하고 동기화하면 저장된 스냅샷이 이 영역에 표시됩니다.</span>
      </div>
    );
  }

  const summaryItems = [
    hasPopulation && { key: "population", ...SERIES.population, value: latestValue(chartData, "population") },
    hasForecast && { key: "forecast", ...SERIES.forecast, value: latestValue(chartData, "forecast") },
    hasSubway && { key: "subway", ...SERIES.subway, value: latestValue(chartData, "subway") },
    hasBus && { key: "bus", ...SERIES.bus, value: latestValue(chartData, "bus") },
  ].filter(Boolean) as Array<{ key: string; label: string; color: string; value?: number }>;

  return (
    <div className="trend-chart-stack">
      <div className="trend-summary-grid">
        {summaryItems.map((item) => (
          <div key={item.key} className="trend-summary-item">
            <i style={{ background: item.color }} />
            <span>{item.label}</span>
            <strong>{formatCompact(item.value)}</strong>
          </div>
        ))}
      </div>

      <div className="trend-chart-body">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 10, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(15, 23, 42, 0.07)" vertical={false} />
            <XAxis
              dataKey="time"
              minTickGap={18}
              tick={{ fill: "#64748b", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              width={42}
              tick={{ fill: "#64748b", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: number) => value.toLocaleString()}
            />
            {(hasSubway || hasBus) && (
              <YAxis
                yAxisId="right"
                orientation="right"
                width={42}
                tick={{ fill: "#64748b", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value: number) => value.toLocaleString()}
              />
            )}
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.97)",
                border: "1px solid rgba(15, 23, 42, 0.12)",
                borderRadius: "8px",
                boxShadow: "0 10px 28px rgba(15, 23, 42, 0.14)",
                color: "#0f172a",
              }}
              formatter={(value: number | string, name: string) => [`${Number(value).toLocaleString()}${PERSON_UNIT}`, name]}
              labelFormatter={(label) => `${label} 기준`}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} iconType="circle" />
            {hasPopulation && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="population"
                name={SERIES.population.label}
                stroke={SERIES.population.color}
                strokeWidth={3}
                dot={{ r: 2.5, strokeWidth: 1 }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            )}
            {hasForecast && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="forecast"
                name={SERIES.forecast.label}
                stroke={SERIES.forecast.color}
                strokeWidth={3}
                strokeDasharray="6 5"
                dot={{ r: 2.5, strokeWidth: 1 }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            )}
            {hasSubway && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="subway"
                name={SERIES.subway.label}
                stroke={SERIES.subway.color}
                strokeWidth={2.4}
                dot={{ r: 2.2, strokeWidth: 1 }}
                activeDot={{ r: 4 }}
                connectNulls
              />
            )}
            {hasBus && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="bus"
                name={SERIES.bus.label}
                stroke={SERIES.bus.color}
                strokeWidth={2.4}
                dot={{ r: 2.2, strokeWidth: 1 }}
                activeDot={{ r: 4 }}
                connectNulls
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
