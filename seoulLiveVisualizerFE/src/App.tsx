import { useEffect, useMemo, useState } from "react";
import { Activity, Database, RefreshCw } from "lucide-react";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { APITester } from "./components/APITester";
import { SeoulMapLayout } from "./components/SeoulMapLayout";
import { MapSidebarLeft } from "./components/MapSidebarLeft";
import { MapIslandRight } from "./components/MapIslandRight";
import { SeoulMap } from "./components/SeoulMap";
import {
  DEFAULT_SCORE_WEIGHTS,
  enrichPlaces,
  type MetricKey,
  type PopulationForecast,
  type RawPlace,
  type ScoreWeights,
} from "./lib/marketingMetrics";

const API_BASE = import.meta.env.VITE_API_BASE || `${window.location.protocol}//${window.location.hostname}:8000/api`;

type HistoryData = {
  population_history?: Array<{ ppltn_time: string; ppltn_max: number }>;
  population_forecast?: PopulationForecast[];
  transit_history?: Array<{ traffic_time?: string; sub_ppltn_max: number; bus_ppltn_max: number }>;
};

function MapDashboard() {
  const [rawPlaces, setRawPlaces] = useState<RawPlace[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncApiKey, setSyncApiKey] = useState("");
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("opportunity");
  const [cutoffValue, setCutoffValue] = useState<number>(40);
  const [scoreWeights, setScoreWeights] = useState<ScoreWeights>(DEFAULT_SCORE_WEIGHTS);
  const allPlaces = useMemo(() => enrichPlaces(rawPlaces, scoreWeights), [rawPlaces, scoreWeights]);

  useEffect(() => {
    async function initApp() {
      try {
        const placesRes = await fetch(`${API_BASE}/places/all/realtime`);
        if (placesRes.ok) {
          const data = await placesRes.json() as RawPlace[];
          setRawPlaces(data);
        }
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setLoading(false);
      }
    }

    initApp();
  }, []);

  useEffect(() => {
    if (selectedPlaceId === null) return;

    async function fetchPlaceHistory() {
      try {
        const histRes = await fetch(`${API_BASE}/places/${selectedPlaceId}/history?limit=18`);
        if (histRes.ok) {
          const histData = await histRes.json();
          setHistoryData(histData);
        }
      } catch (err) {
        console.error("Fetch details error:", err);
      }
    }

    fetchPlaceHistory();
  }, [selectedPlaceId]);

  const refreshPlaces = async () => {
    const placesRes = await fetch(`${API_BASE}/places/all/realtime`);
    if (placesRes.ok) {
      const data = await placesRes.json() as RawPlace[];
      setRawPlaces(data);
    }

    if (selectedPlaceId !== null) {
      const histRes = await fetch(`${API_BASE}/places/${selectedPlaceId}/history?limit=18`);
      if (histRes.ok) setHistoryData(await histRes.json());
    }
  };

  const handleSyncData = async () => {
    if (syncing) return;

    const apiKey = syncApiKey.trim();
    if (!apiKey) {
      alert("서울 데이터 동기화에 사용할 API Key를 입력해주세요.");
      return;
    }

    setSyncing(true);
    try {
      const res = await fetch(`${API_BASE}/sync?api_key=${encodeURIComponent(apiKey)}`, { method: "POST" });
      if (res.ok) await refreshPlaces();
    } catch (err) {
      console.error("Sync data error:", err);
    } finally {
      setSyncing(false);
    }
  };

  const selectedPlace = allPlaces.find((place) => place.place_id === selectedPlaceId);

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner" />
        <p>실시간 장소 데이터를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <>
      <SeoulMapLayout
        sidebarLeft={
          <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, gap: "16px" }}>
            <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
              <Link
                to="/"
                className="place-item active"
                style={{
                  flex: 1,
                  justifyContent: "center",
                  backgroundColor: "rgba(6, 182, 212, 0.15)",
                  color: "var(--accent-cyan)",
                  border: "1px solid rgba(6, 182, 212, 0.3)",
                  textDecoration: "none",
                }}
              >
                후보지 분석
              </Link>
              <Link
                to="/tester"
                className="place-item"
                style={{ flex: 1, justifyContent: "center", border: "1px solid var(--border-glass)", textDecoration: "none" }}
              >
                API 테스트
              </Link>
            </div>

            <MapSidebarLeft
              places={allPlaces}
              selectedMetric={selectedMetric}
              setSelectedMetric={setSelectedMetric}
              selectedPlaceId={selectedPlaceId}
              setSelectedPlaceId={setSelectedPlaceId}
              cutoffValue={cutoffValue}
              setCutoffValue={setCutoffValue}
              scoreWeights={scoreWeights}
              setScoreWeights={setScoreWeights}
            />

            <div style={{ marginTop: "auto", paddingTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "0.75rem", color: "var(--color-text-primary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                동기화 API Key
              </label>
              <input
                type="password"
                value={syncApiKey}
                onChange={(event) => setSyncApiKey(event.target.value)}
                placeholder="API Key 입력"
                autoComplete="off"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid rgba(15, 23, 42, 0.18)",
                  borderRadius: "8px",
                  backgroundColor: "#ffffff",
                  color: "var(--color-text-primary)",
                  fontFamily: "monospace",
                  fontSize: "0.85rem",
                  outline: "none",
                }}
              />
              <button
                className={`sync-button ${syncing ? "is-syncing" : ""}`}
                onClick={handleSyncData}
                disabled={syncing}
                aria-busy={syncing}
                aria-live="polite"
                style={{
                  width: "100%",
                  border: "1px solid var(--border-glass)",
                  justifyContent: "center",
                  gap: "8px",
                  backgroundColor: "rgba(6, 182, 212, 0.05)",
                  color: "var(--accent-cyan)",
                  padding: "12px",
                  borderRadius: "8px",
                }}
              >
                <RefreshCw size={14} className={syncing ? "spin" : ""} />
                {syncing ? "서울 데이터 동기화 중..." : "서울 데이터 동기화"}
              </button>
            </div>
          </div>
        }
        islandRight={
          selectedPlace ? (
            <MapIslandRight
              placeName={selectedPlace.area_nm}
              realtimeData={selectedPlace}
              historyData={historyData}
              onClose={() => setSelectedPlaceId(null)}
            />
          ) : null
        }
      >
        <SeoulMap
          places={allPlaces}
          selectedMetric={selectedMetric}
          cutoffValue={cutoffValue}
          selectedPlaceId={selectedPlaceId}
          onPlaceSelect={setSelectedPlaceId}
        />
      </SeoulMapLayout>

      {syncing && (
        <div className="sync-status-toast" role="status" aria-live="polite">
          <div className="sync-status-spinner" />
          <div>
            <strong>서울 데이터를 동기화하고 있습니다</strong>
            <span>전체 장소를 갱신하는 중입니다. 보통 약 20초 정도 걸립니다.</span>
          </div>
        </div>
      )}
    </>
  );
}

function TesterView() {
  return (
    <div className="dashboard-container" style={{ display: "flex", height: "100vh" }}>
      <aside className="sidebar">
        <div className="logo-section">
          <div className="logo-icon">S</div>
          <span className="logo-text">Seoul Realtime</span>
        </div>
        <div className="sidebar-tabs" style={{ display: "flex", flexDirection: "column", gap: "6px", margin: "10px 0" }}>
          <Link to="/" className="place-item" style={{ justifyContent: "flex-start", gap: "10px", textDecoration: "none" }}>
            <Activity size={16} />
            <span>후보지 분석</span>
          </Link>
          <Link to="/tester" className="place-item active" style={{ justifyContent: "flex-start", gap: "10px", textDecoration: "none" }}>
            <Database size={16} />
            <span>API 테스트</span>
          </Link>
        </div>
      </aside>
      <main className="main-content" style={{ flex: 1, padding: "20px", overflowY: "auto" }}>
        <header className="header-section">
          <div className="header-title-wrapper">
            <h1>서울 OpenAPI 테스트 패널</h1>
            <p>실시간 데이터 연결과 응답 구조를 확인합니다.</p>
          </div>
        </header>
        <APITester />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MapDashboard />} />
        <Route path="/tester" element={<TesterView />} />
      </Routes>
    </BrowserRouter>
  );
}
