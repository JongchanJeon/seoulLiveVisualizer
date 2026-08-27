import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface DemographicsData {
  ppltn_rate_10?: number;
  ppltn_rate_20?: number;
  ppltn_rate_30?: number;
  ppltn_rate_40?: number;
  ppltn_rate_50?: number;
  ppltn_rate_60?: number;
  ppltn_rate_70?: number;
}

interface DemographicsBarChartProps {
  data?: DemographicsData;
}

const AGE_BAR_COLOR = "rgba(37, 99, 235, 0.28)";
const AGE_BAR_HIGHLIGHT_COLOR = "#2563eb";

export function DemographicsBarChart({ data }: DemographicsBarChartProps) {
  const chartData = [
    { name: "10대", rate: data?.ppltn_rate_10 || 0 },
    { name: "20대", rate: data?.ppltn_rate_20 || 0 },
    { name: "30대", rate: data?.ppltn_rate_30 || 0 },
    { name: "40대", rate: data?.ppltn_rate_40 || 0 },
    { name: "50대", rate: data?.ppltn_rate_50 || 0 },
    { name: "60대", rate: data?.ppltn_rate_60 || 0 },
    { name: "70대+", rate: data?.ppltn_rate_70 || 0 },
  ];

  const highestRate = Math.max(...chartData.map(({ rate }) => rate));
  const highestRateIndex = chartData.findIndex(({ rate }) => rate === highestRate);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 10, right: 8, left: -22, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(15, 23, 42, 0.08)" vertical={false} />
        <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
        <Tooltip
          contentStyle={{
            backgroundColor: "rgba(255, 255, 255, 0.96)",
            border: "1px solid rgba(15, 23, 42, 0.12)",
            borderRadius: "8px",
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
            color: "#0f172a",
          }}
          formatter={(value: number | string) => [`${Number(value).toFixed(1)}%`, "인구 비율"]}
        />
        <Bar dataKey="rate" radius={[5, 5, 0, 0]} maxBarSize={42}>
          {chartData.map((_, index) => (
            <Cell
              key={`age-${index}`}
              fill={index === highestRateIndex && highestRate > 0 ? AGE_BAR_HIGHLIGHT_COLOR : AGE_BAR_COLOR}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
