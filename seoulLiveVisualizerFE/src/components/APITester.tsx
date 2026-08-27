/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import {
  Wifi, WifiOff, RefreshCw, Clock, Globe,
  CheckCircle, AlertCircle, Copy, Code, Eye,
  ChevronDown, ChevronRight, Zap, Server
} from "lucide-react";
import { GlassCard } from "./GlassCard";

const API_BASE = import.meta.env.VITE_API_BASE || `${window.location.protocol}//${window.location.hostname}:8000/api`;

// All testable Seoul hotspot area names
const AREA_OPTIONS = [
  "강남역",
  "홍대 관광특구",
  "광화문·덕수궁",
  "명동 관광특구",
  "이태원 관광특구",
  "잠실 관광특구",
  "북촌한옥마을",
  "가산디지털단지역",
  "건대입구역",
  "고덕역",
  "고속터미널역",
  "교대역",
  "구로디지털단지역",
  "노량진",
  "덕수궁길·정동길",
  "동대문 관광특구",
  "뚝섬한강공원",
  "성수카페거리",
  "수유리 먹자골목",
  "쌍림동(장안동 먹자골목)",
  "압구정로데오거리",
  "여의도",
  "용리단길",
  "종로·청계 관광특구",
  "창동 신경제 중심지",
];

interface TestResult {
  success: boolean;
  request_url: string;
  api_key_used: string;
  http_status: number;
  duration_ms: number;
  area_nm: string;
  raw_response?: any;
  error?: string;
}

const maskApiKey = (key: string) => {
  const trimmed = key.trim();
  if (!trimmed) return "N/A";
  if (trimmed.length <= 10) return `${trimmed.slice(0, 2)}...`;
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
};

export function APITester() {
  const [selectedArea, setSelectedArea] = useState("광화문·덕수궁");
  const [customArea, setCustomArea] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [activeTab, setActiveTab] = useState<"explorer" | "raw">("explorer");
  const [copied, setCopied] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set(["root"]));

  const toggleExpand = (key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const expandAll = (obj: any, prefix: string = "root") => {
    const keys = new Set<string>();
    const recurse = (o: any, p: string) => {
      keys.add(p);
      if (o && typeof o === "object") {
        Object.keys(o).forEach(k => recurse(o[k], `${p}.${k}`));
      }
    };
    recurse(obj, prefix);
    setExpandedKeys(keys);
  };

  const collapseAll = () => {
    setExpandedKeys(new Set(["root"]));
  };

  const handleTest = async () => {
    const area = customArea.trim() || selectedArea;
    const key = apiKey.trim();
    if (!area) return;

    if (!key) {
      setResult({
        success: false,
        request_url: `http://openapi.seoul.go.kr:8088/YOUR_API_KEY/json/citydata/1/5/${area}`,
        api_key_used: "N/A",
        http_status: 0,
        duration_ms: 0,
        area_nm: area,
        error: "API Key를 입력해주세요."
      });
      return;
    }

    setTesting(true);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/raw-test/${encodeURIComponent(area)}?api_key=${encodeURIComponent(key)}`);
      const data: TestResult = await res.json();
      setResult(data);

      // Auto-expand first level
      if (data.raw_response) {
        const initialKeys = new Set(["root"]);
        Object.keys(data.raw_response).forEach(k => initialKeys.add(`root.${k}`));
        if (data.raw_response.CITYDATA) {
          Object.keys(data.raw_response.CITYDATA).forEach(k => initialKeys.add(`root.CITYDATA.${k}`));
        }
        setExpandedKeys(initialKeys);
      }
    } catch (err: any) {
      setResult({
        success: false,
        request_url: `http://openapi.seoul.go.kr:8088/${maskApiKey(key)}/json/citydata/1/5/${area}`,
        api_key_used: maskApiKey(key),
        http_status: 0,
        duration_ms: 0,
        area_nm: area,
        error: `FastAPI 백엔드 서버 연결 불가: ${err.message}`
      });
    } finally {
      setTesting(false);
    }
  };

  const handleCopy = () => {
    if (!result?.raw_response) return;
    navigator.clipboard.writeText(JSON.stringify(result.raw_response, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Recursive tree renderer
  const renderTree = (obj: any, path: string, depth: number = 0): React.ReactNode => {
    if (obj === null || obj === undefined) return <span style={{ color: "#ef4444" }}>null</span>;
    if (typeof obj !== "object") return null;

    const entries = Object.entries(obj);
    const isArr = Array.isArray(obj);

    return (
      <div style={{ marginLeft: depth > 0 ? "18px" : "0", borderLeft: depth > 0 ? "1px solid rgba(255,255,255,0.06)" : "none", paddingLeft: depth > 0 ? "12px" : "0" }}>
        {entries.map(([key, val]) => {
          const fullPath = `${path}.${key}`;
          const isComplex = val !== null && val !== undefined && typeof val === "object";
          const isArray = Array.isArray(val);
          const childCount = isComplex ? Object.keys(val as object).length : 0;
          const isExpanded = expandedKeys.has(fullPath);

          return (
            <div key={fullPath} style={{ margin: "3px 0" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "6px",
                  padding: "4px 6px",
                  borderRadius: "4px",
                  cursor: isComplex ? "pointer" : "default",
                  transition: "background 0.15s",
                }}
                className="tree-row"
                onClick={() => isComplex && toggleExpand(fullPath)}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                {/* Expand arrow */}
                <span style={{ width: "14px", flexShrink: 0, marginTop: "2px" }}>
                  {isComplex ? (
                    isExpanded ? <ChevronDown size={12} style={{ color: "var(--color-text-muted)" }} /> : <ChevronRight size={12} style={{ color: "var(--color-text-muted)" }} />
                  ) : <span style={{ display: "inline-block", width: "12px" }} />}
                </span>

                {/* Key name */}
                <span style={{
                  color: isArr ? "var(--accent-pink)" : "var(--accent-cyan)",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  fontFamily: "monospace",
                  flexShrink: 0,
                  userSelect: "text",
                }}>
                  {isArr ? `[${key}]` : key}
                </span>

                <span style={{ color: "rgba(255,255,255,0.2)", flexShrink: 0 }}>:</span>

                {/* Value */}
                {isComplex ? (
                  <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                    {isArray ? `Array(${childCount})` : `Object {${childCount} keys}`}
                  </span>
                ) : (
                  <span style={{
                    fontSize: "0.85rem",
                    fontFamily: "monospace",
                    userSelect: "text",
                    wordBreak: "break-all",
                    color:
                      typeof val === "number" ? "#f59e0b" :
                      typeof val === "boolean" ? "#8b5cf6" :
                      val === null ? "#ef4444" :
                      "#10b981"
                  }}>
                    {typeof val === "string" ? `"${val}"` : String(val)}
                    <span style={{
                      fontSize: "0.7rem",
                      color: "rgba(255,255,255,0.2)",
                      marginLeft: "8px",
                      fontFamily: "var(--font-main)"
                    }}>
                      {typeof val}
                    </span>
                  </span>
                )}
              </div>

              {/* Children */}
              {isComplex && isExpanded && renderTree(val, fullPath, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* ── 1. Connection Config Panel ──────────────────────────── */}
      <GlassCard>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px" }}>
              <Globe size={22} style={{ color: "var(--accent-cyan)" }} />
              서울시 OpenAPI 연결 테스트
            </h3>
            <p style={{ color: "var(--color-text-secondary)", fontSize: "0.88rem", marginTop: "4px" }}>
              API 인증키로 <code style={{ color: "var(--accent-purple)", fontFamily: "monospace", fontSize: "0.85rem" }}>openapi.seoul.go.kr</code>에 직접 요청을 전송하여 키 유효성 및 데이터 수신 상태를 검증합니다.
            </p>
          </div>

          {/* Connection result indicator */}
          {result && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 18px",
              borderRadius: "30px",
              border: `1px solid ${result.success && result.http_status === 200 ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
              backgroundColor: result.success && result.http_status === 200 ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
            }}>
              {result.success && result.http_status === 200 ? (
                <><Wifi size={16} style={{ color: "var(--color-success)" }} /><span style={{ fontWeight: 700, color: "var(--color-success)", fontSize: "0.9rem" }}>API 키 인증 성공</span></>
              ) : (
                <><WifiOff size={16} style={{ color: "var(--color-danger)" }} /><span style={{ fontWeight: 700, color: "var(--color-danger)", fontSize: "0.9rem" }}>연결 실패</span></>
              )}
            </div>
          )}
        </div>

        {/* Config row */}
        <div style={{
          display: "flex",
          gap: "1rem",
          alignItems: "flex-end",
          backgroundColor: "rgba(0,0,0,0.2)",
          padding: "1.25rem",
          borderRadius: "12px",
          border: "1px solid var(--border-glass)",
          flexWrap: "wrap"
        }}>
          {/* API Key input */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: "260px" }}>
            <label style={{ fontSize: "0.75rem", color: "var(--color-text-primary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              인증키 (API Key)
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="API Key 입력"
              autoComplete="off"
              style={{
              padding: "10px 14px",
              backgroundColor: "#ffffff",
              border: "1px solid rgba(15, 23, 42, 0.18)",
              borderRadius: "8px",
              fontFamily: "monospace",
              fontSize: "0.85rem",
              color: "var(--color-text-primary)",
              letterSpacing: "0.05em",
              outline: "none"
            }}
            />
          </div>

          {/* Area dropdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, minWidth: "200px" }}>
            <label style={{ fontSize: "0.75rem", color: "var(--color-text-primary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              테스트 장소 (Area Name)
            </label>
            <select
              value={selectedArea}
              onChange={(e) => { setSelectedArea(e.target.value); setCustomArea(""); }}
              style={{
                padding: "10px 14px",
                backgroundColor: "#ffffff",
                border: "1px solid rgba(15, 23, 42, 0.18)",
                borderRadius: "8px",
                color: "var(--color-text-primary)",
                fontFamily: "var(--font-main)",
                fontSize: "0.9rem",
                outline: "none",
                cursor: "pointer"
              }}
            >
              {AREA_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {/* Custom area input */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: "180px" }}>
            <label style={{ fontSize: "0.75rem", color: "var(--color-text-primary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              직접 입력 (선택)
            </label>
            <input
              type="text"
              value={customArea}
              onChange={(e) => setCustomArea(e.target.value)}
              placeholder="예: 여의도"
              style={{
                padding: "10px 14px",
                backgroundColor: "#ffffff",
                border: "1px solid rgba(15, 23, 42, 0.18)",
                borderRadius: "8px",
                color: "var(--color-text-primary)",
                fontFamily: "var(--font-main)",
                fontSize: "0.9rem",
                outline: "none"
              }}
            />
          </div>

          {/* Test button */}
          <button
            onClick={handleTest}
            disabled={testing}
            style={{
              padding: "10px 24px",
              borderRadius: "8px",
              backgroundColor: testing ? "rgba(255,255,255,0.05)" : "rgba(6,182,212,0.15)",
              color: testing ? "var(--color-text-muted)" : "var(--accent-cyan)",
              border: "1px solid rgba(6,182,212,0.3)",
              cursor: testing ? "not-allowed" : "pointer",
              fontFamily: "var(--font-main)",
              fontWeight: 700,
              fontSize: "0.95rem",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s ease",
              whiteSpace: "nowrap"
            }}
          >
            {testing ? (
              <><RefreshCw size={16} className="spin" /> 서울시 서버 연결 중...</>
            ) : (
              <><Zap size={16} /> API 연결 테스트</>
            )}
          </button>
        </div>

        {/* Request URL preview */}
        <div style={{ marginTop: "1rem", fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
          <Server size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: "6px" }} />
          요청 URL:&nbsp;
          <code style={{ color: "var(--accent-purple)", fontFamily: "monospace", wordBreak: "break-all" }}>
            http://openapi.seoul.go.kr:8088/{apiKey.trim() ? maskApiKey(apiKey) : "YOUR_API_KEY"}/json/citydata/1/5/{customArea.trim() || selectedArea}
          </code>
        </div>
      </GlassCard>

      {/* ── 2. Result Panel ─────────────────────────────────────── */}
      {result && (
        <>
          {/* Meta stats */}
          <GlassCard>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1.25rem" }}>
              {/* Status */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase" }}>HTTP 상태</span>
                <span style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: result.http_status === 200 ? "var(--color-success)" : "var(--color-danger)"
                }}>
                  {result.http_status || "ERR"}
                  <span style={{ fontSize: "0.8rem", fontWeight: 500, marginLeft: "6px", color: "var(--color-text-secondary)" }}>
                    {result.http_status === 200 ? "OK" : "Failed"}
                  </span>
                </span>
              </div>

              {/* Latency */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase" }}>응답 소요시간</span>
                <span style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent-cyan)" }}>
                  {result.duration_ms}
                  <span style={{ fontSize: "0.8rem", fontWeight: 500, marginLeft: "4px", color: "var(--color-text-secondary)" }}>ms</span>
                </span>
              </div>

              {/* API key used */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase" }}>사용된 API 키</span>
                <span style={{ fontSize: "1rem", fontWeight: 600, color: "var(--color-text-primary)", fontFamily: "monospace" }}>
                  {result.api_key_used}
                </span>
              </div>

              {/* Area */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase" }}>조회 장소</span>
                <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                  {result.area_nm}
                </span>
              </div>

              {/* Timestamp */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase" }}>테스트 시각</span>
                <span style={{ fontSize: "0.95rem", fontWeight: 500, color: "var(--color-text-secondary)" }}>
                  <Clock size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                  {new Date().toLocaleString("ko-KR")}
                </span>
              </div>
            </div>

            {/* Error message if present */}
            {result.error && (
              <div style={{
                marginTop: "1.25rem",
                padding: "14px 18px",
                borderRadius: "8px",
                backgroundColor: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "var(--color-danger)",
                fontSize: "0.9rem",
                display: "flex",
                alignItems: "center",
                gap: "10px"
              }}>
                <AlertCircle size={18} />
                <span>{result.error}</span>
              </div>
            )}
          </GlassCard>

          {/* Raw response viewer */}
          {result.raw_response && (
            <GlassCard>
              {/* Tabs bar */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid var(--border-glass)",
                paddingBottom: "12px",
                marginBottom: "1rem",
                flexWrap: "wrap",
                gap: "10px"
              }}>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    onClick={() => setActiveTab("explorer")}
                    style={{
                      padding: "8px 16px",
                      background: "transparent",
                      border: activeTab === "explorer" ? "1px solid rgba(6,182,212,0.3)" : "1px solid transparent",
                      borderRadius: "6px",
                      backgroundColor: activeTab === "explorer" ? "rgba(6,182,212,0.08)" : "transparent",
                      color: activeTab === "explorer" ? "var(--accent-cyan)" : "var(--color-text-secondary)",
                      fontFamily: "var(--font-main)",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    <Eye size={14} />
                    데이터 항목 탐색기
                  </button>
                  <button
                    onClick={() => setActiveTab("raw")}
                    style={{
                      padding: "8px 16px",
                      background: "transparent",
                      border: activeTab === "raw" ? "1px solid rgba(6,182,212,0.3)" : "1px solid transparent",
                      borderRadius: "6px",
                      backgroundColor: activeTab === "raw" ? "rgba(6,182,212,0.08)" : "transparent",
                      color: activeTab === "raw" ? "var(--accent-cyan)" : "var(--color-text-secondary)",
                      fontFamily: "var(--font-main)",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    <Code size={14} />
                    원시 JSON
                  </button>
                </div>

                {/* Expand / collapse / copy controls */}
                <div style={{ display: "flex", gap: "6px" }}>
                  {activeTab === "explorer" && (
                    <>
                      <button onClick={() => expandAll(result.raw_response)} style={controlBtnStyle}>전체 펼치기</button>
                      <button onClick={collapseAll} style={controlBtnStyle}>전체 접기</button>
                    </>
                  )}
                  <button onClick={handleCopy} style={{
                    ...controlBtnStyle,
                    color: copied ? "var(--color-success)" : "var(--color-text-secondary)"
                  }}>
                    <Copy size={12} />
                    {copied ? "복사완료!" : "JSON 복사"}
                  </button>
                </div>
              </div>

              {/* Content area */}
              <div style={{ maxHeight: "600px", overflowY: "auto" }}>
                {activeTab === "explorer" ? (
                  <div style={{
                    padding: "1rem",
                    backgroundColor: "rgba(0,0,0,0.15)",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.03)"
                  }}>
                    {/* Quick summary of CITYDATA fields */}
                    {result.raw_response.CITYDATA && (
                      <div style={{
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                        marginBottom: "1rem",
                        padding: "10px 14px",
                        backgroundColor: "rgba(6,182,212,0.05)",
                        borderRadius: "8px",
                        border: "1px solid rgba(6,182,212,0.1)"
                      }}>
                        <span style={{ fontSize: "0.8rem", color: "var(--accent-cyan)", fontWeight: 600, marginRight: "4px" }}>CITYDATA 포함 섹션:</span>
                        {Object.keys(result.raw_response.CITYDATA).map(k => (
                          <span key={k} style={{
                            fontSize: "0.72rem",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            backgroundColor: "rgba(255,255,255,0.05)",
                            color: "var(--color-text-secondary)",
                            fontFamily: "monospace"
                          }}>{k}</span>
                        ))}
                      </div>
                    )}
                    {renderTree(result.raw_response, "root", 0)}
                  </div>
                ) : (
                  <pre style={{
                    backgroundColor: "rgba(0,0,0,0.3)",
                    padding: "1.5rem",
                    borderRadius: "8px",
                    color: "#10b981",
                    fontFamily: "monospace",
                    fontSize: "0.78rem",
                    lineHeight: "1.5",
                    overflow: "auto",
                    border: "1px solid rgba(255,255,255,0.03)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all"
                  }}>
                    {JSON.stringify(result.raw_response, null, 2)}
                  </pre>
                )}
              </div>

              {/* Field count summary */}
              <div style={{
                marginTop: "1rem",
                padding: "8px 14px",
                borderRadius: "6px",
                backgroundColor: "rgba(0,0,0,0.1)",
                fontSize: "0.8rem",
                color: "var(--color-text-muted)",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}>
                <CheckCircle size={12} style={{ color: "var(--color-success)" }} />
                총 수신 데이터 크기: <strong style={{ color: "var(--color-text-primary)" }}>{JSON.stringify(result.raw_response).length.toLocaleString()}</strong> bytes
                &nbsp;|&nbsp;
                최상위 키: <strong style={{ color: "var(--color-text-primary)" }}>{Object.keys(result.raw_response).length}</strong>개
                {result.raw_response.CITYDATA && (
                  <>
                    &nbsp;|&nbsp;
                    CITYDATA 섹션: <strong style={{ color: "var(--color-text-primary)" }}>{Object.keys(result.raw_response.CITYDATA).length}</strong>개
                  </>
                )}
              </div>
            </GlassCard>
          )}
        </>
      )}

      {/* ── 3. Empty state ──────────────────────────────────────── */}
      {!result && !testing && (
        <GlassCard>
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 30px",
            color: "var(--color-text-muted)",
            gap: "14px"
          }}>
            <Globe size={48} style={{ opacity: 0.2 }} />
            <p style={{ textAlign: "center", maxWidth: "420px", lineHeight: "1.6" }}>
              위의 설정 패널에서 장소를 선택하고 <strong style={{ color: "var(--accent-cyan)" }}>[API 연결 테스트]</strong> 버튼을 누르면,<br />
              서울시 OpenAPI 서버 (<code style={{ fontFamily: "monospace", color: "var(--accent-purple)" }}>openapi.seoul.go.kr</code>)에 실제 요청이 전송되어<br />
              수신된 <strong>모든 항목</strong>을 이곳에 트리 형태로 탐색할 수 있습니다.
            </p>
          </div>
        </GlassCard>
      )}
    </div>
  );
}

const controlBtnStyle: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: "4px",
  backgroundColor: "rgba(255,255,255,0.04)",
  border: "1px solid var(--border-glass)",
  color: "var(--color-text-secondary)",
  cursor: "pointer",
  fontSize: "0.75rem",
  fontFamily: "var(--font-main)",
  fontWeight: 600,
  display: "flex",
  alignItems: "center",
  gap: "4px"
};
