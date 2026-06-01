import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import type { GeoJsonObject } from "geojson";
import "leaflet/dist/leaflet.css";
import seoulGeoJsonUrl from "../assets/geo/seoul_gu.geojson?url";
import { formatMetricValue, getMetricLabel, getMetricRawValue, type MarketingPlace, type MetricKey } from "../lib/marketingMetrics";

interface SeoulMapProps {
  places: MarketingPlace[];
  selectedMetric: MetricKey;
  cutoffValue: number;
  selectedPlaceId: number | null;
  onPlaceSelect: (id: number) => void;
}

const mapCenter: [number, number] = [37.5665, 126.978];

const MAP_VISUALS = {
  regionFill: "#C8EEF4",
  regionFillSoft: "#BFEAF2",
  regionStroke: "#8BC8D3",
  markerLow: "#FEE2E2",
  markerMid: "#FB7185",
  markerHigh: "#EF4444",
  markerVeryHigh: "#B91C1C",
  markerStroke: "#991B1B",
  selectedFill: "#7F1D1D",
  selectedStroke: "#FFFFFF",
  selectedHalo: "rgba(239, 68, 68, 0.35)",
};

const metricColor = (value: number) => {
  if (value >= 76) return MAP_VISUALS.markerVeryHigh;
  if (value >= 60) return MAP_VISUALS.markerHigh;
  if (value >= 42) return MAP_VISUALS.markerMid;
  return MAP_VISUALS.markerLow;
};

const hasMapCoordinates = (place: MarketingPlace) =>
  Number.isFinite(place.lat) && Number.isFinite(place.lng) && place.lat !== 0 && place.lng !== 0;

export function SeoulMap({ places, selectedMetric, cutoffValue, selectedPlaceId, onPlaceSelect }: SeoulMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const floorLayerRef = useRef<L.GeoJSON | null>(null);
  const floorGlowLayerRef = useRef<L.GeoJSON | null>(null);
  const geojsonLayerRef = useRef<L.GeoJSON | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const [geoData, setGeoData] = useState<GeoJsonObject | null>(null);
  const [selectedGu, setSelectedGu] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(11);
  const placesWithCoordinates = places.filter(hasMapCoordinates);
  const visiblePlaces = placesWithCoordinates;

  useEffect(() => {
    fetch(seoulGeoJsonUrl)
      .then((res) => res.json())
      .then((data) => setGeoData(data))
      .catch((err) => console.error("Failed to load Seoul GeoJSON:", err));
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    mapInstanceRef.current = L.map(mapContainerRef.current, {
      center: mapCenter,
      zoom: 11,
      zoomControl: false,
      attributionControl: false,
    });

    L.control.zoom({ position: "bottomright" }).addTo(mapInstanceRef.current);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 20,
    }).addTo(mapInstanceRef.current);

    mapInstanceRef.current.createPane("seoulFloorPane");
    mapInstanceRef.current.getPane("seoulFloorPane")!.style.zIndex = "330";
    mapInstanceRef.current.createPane("seoulFloorGlowPane");
    mapInstanceRef.current.getPane("seoulFloorGlowPane")!.style.zIndex = "340";

    markersLayerRef.current = L.layerGroup().addTo(mapInstanceRef.current);
    mapInstanceRef.current.on("zoomend", () => {
      const currentZoom = mapInstanceRef.current?.getZoom() || 11;
      setZoomLevel(currentZoom);
      if (currentZoom <= 11) setSelectedGu(null);
    });

    window.setTimeout(() => mapInstanceRef.current?.invalidateSize(), 200);
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !geoData) return;

    if (floorLayerRef.current) mapInstanceRef.current.removeLayer(floorLayerRef.current);
    if (floorGlowLayerRef.current) mapInstanceRef.current.removeLayer(floorGlowLayerRef.current);

    floorGlowLayerRef.current = L.geoJSON(geoData, {
      interactive: false,
      pane: "seoulFloorGlowPane",
      style: {
        className: "seoul-floor-glow",
        fillColor: MAP_VISUALS.regionFillSoft,
        fillOpacity: 0.18,
        stroke: false,
      },
    }).addTo(mapInstanceRef.current);

    floorLayerRef.current = L.geoJSON(geoData, {
      interactive: false,
      pane: "seoulFloorPane",
      style: {
        className: "seoul-floor-base",
        color: MAP_VISUALS.regionStroke,
        fillColor: MAP_VISUALS.regionFill,
        fillOpacity: 0.38,
        opacity: 0.45,
        weight: 0.7,
      },
    }).addTo(mapInstanceRef.current);
  }, [geoData]);

  useEffect(() => {
    if (!mapInstanceRef.current || !geoData || !places.length) return;

    const validPlaces = places.filter(hasMapCoordinates);
    const globalMaxVal = Math.max(...validPlaces.map((place) => getMetricRawValue(place, selectedMetric)), 1);
    const guStats: Record<string, { total: number; count: number; topPlace: string; topValue: number }> = {};

    validPlaces.forEach((place) => {
      if (!place.gu_name) return;
      const value = getMetricRawValue(place, selectedMetric);
      if (!guStats[place.gu_name]) guStats[place.gu_name] = { total: 0, count: 0, topPlace: place.area_nm, topValue: value };
      guStats[place.gu_name].total += value;
      guStats[place.gu_name].count += 1;
      if (value > guStats[place.gu_name].topValue) {
        guStats[place.gu_name].topPlace = place.area_nm;
        guStats[place.gu_name].topValue = value;
      }
    });

    if (geojsonLayerRef.current) mapInstanceRef.current.removeLayer(geojsonLayerRef.current);

    geojsonLayerRef.current = L.geoJSON(geoData, {
      style: (feature) => {
        const guName = feature?.properties?.name;
        const stats = guStats[guName];
        const selected = selectedGu === guName;

        return {
          color: selected ? "#5BAFBD" : MAP_VISUALS.regionStroke,
          fillColor: selected ? MAP_VISUALS.regionFillSoft : stats ? MAP_VISUALS.regionFill : "#E9FAFC",
          fillOpacity: selected ? 0.28 : stats ? 0.08 : 0.04,
          opacity: selected ? 0.6 : 0.35,
          weight: selected ? 1 : 0.6,
        };
      },
      onEachFeature: (feature, layer) => {
        const guName = feature.properties.name;
        const stats = guStats[guName];

        layer.on("click", () => {
          if (selectedGu === guName) {
            setSelectedGu(null);
            mapInstanceRef.current?.setView(mapCenter, 11);
            return;
          }

          setSelectedGu(guName);
          mapInstanceRef.current?.fitBounds((layer as L.Polygon).getBounds(), { padding: [54, 54] });
        });

        const tooltip = stats
          ? `<strong>${guName}</strong><br/>표시 장소 ${stats.count}개<br/>상위 장소 ${stats.topPlace}`
          : `<strong>${guName}</strong><br/>표시 가능한 장소 없음`;
        layer.bindTooltip(tooltip, { direction: "center", permanent: false });
      },
    }).addTo(mapInstanceRef.current);

    if (!markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    const orderedPlaces = [...validPlaces].sort((place) => (place.place_id === selectedPlaceId ? 1 : -1));

    orderedPlaces.forEach((place) => {
      const rawVal = getMetricRawValue(place, selectedMetric);
      const pct = Math.min(100, Math.max(0, (rawVal / globalMaxVal) * 100));
      const score = place.marketing?.opportunityScore || 0;
      const emphasized = selectedMetric === "opportunity" ? score >= cutoffValue : pct >= cutoffValue;
      const selected = place.place_id === selectedPlaceId;
      const zoomScale = zoomLevel >= 15 ? 0.66 : zoomLevel >= 14 ? 0.74 : zoomLevel >= 13 ? 0.84 : zoomLevel >= 12 ? 0.92 : 1;
      const markerRadius = (selected ? 18 : emphasized ? 14 : 6) * zoomScale;
      const fillColor = selected ? MAP_VISUALS.selectedFill : metricColor(selectedMetric === "opportunity" ? score : pct);
      const baseStyle = {
        color: selected ? MAP_VISUALS.selectedStroke : MAP_VISUALS.markerStroke,
        fillColor,
        opacity: selected ? 1 : emphasized ? 0.86 : 0.8,
        fillOpacity: selected ? 0.96 : emphasized ? 0.9 : 0.78,
        radius: markerRadius,
        weight: selected ? 3 : emphasized ? 1.5 : 1.3,
      };

      if (selected) {
        const halo = L.circleMarker([place.lat, place.lng], {
          className: "place-marker-halo",
          color: MAP_VISUALS.selectedHalo,
          fillColor: MAP_VISUALS.selectedHalo,
          fillOpacity: 0.32,
          opacity: 0.85,
          interactive: false,
          radius: markerRadius + 4,
          weight: 2,
        });
        halo.addTo(markersLayerRef.current!);
      }

      const circle = L.circleMarker([place.lat, place.lng], {
        ...baseStyle,
        className: "place-marker",
      });

      circle.on("click", () => onPlaceSelect(place.place_id));
      circle.on("mouseover", () => {
        circle.setStyle({
          color: MAP_VISUALS.selectedStroke,
          opacity: 1,
          fillOpacity: 0.98,
          weight: selected ? 3 : 2,
        });
        circle.bringToFront();
      });
      circle.on("mouseout", () => {
        circle.setStyle(baseStyle);
        if (selected) circle.bringToFront();
      });
      circle.bindTooltip(`
        <div style="font-family: sans-serif; color: #111827; min-width: 150px;">
          <strong>${place.area_nm}</strong><br/>
          <span>${getMetricLabel(selectedMetric)}: ${formatMetricValue(place, selectedMetric)}</span><br/>
          <span>추천점수: ${Math.round(score)}점</span>
        </div>
      `);
      circle.addTo(markersLayerRef.current!);
      if (selected) circle.bringToFront();
    });
  }, [places, geoData, selectedMetric, cutoffValue, selectedPlaceId, selectedGu, zoomLevel, onPlaceSelect]);

  return (
    <div className="map-stage">
      <div ref={mapContainerRef} className="leaflet-host" />
      <div className="map-vignette" />
      <div className="map-legend">
        <div className="legend-header">
          <strong>시각화 설계</strong>
          <b>{visiblePlaces.length}/{places.length}</b>
        </div>

        <div className="legend-section">
          <span className="legend-title">지도</span>
          <span><i className="legend-area" />지역 영역: 서울시 배경</span>
          <span><i className="legend-dot medium" />원형 점: 장소 단위 값</span>
        </div>

        <div className="legend-section">
          <span className="legend-title">채널</span>
          <span className="legend-channel">색상: {getMetricLabel(selectedMetric)} 높낮이</span>
          <div className="legend-gradient" aria-label="낮음에서 높음으로 이어지는 색상 채널">
            <i />
            <small>낮음</small>
            <small>높음</small>
          </div>
          <span><i className="legend-dot small" />크기: 기준 미만</span>
          <span><i className="legend-dot medium" />크기: 기준 이상</span>
          <span><i className="legend-dot large selected" />큰 크기: 선택됨</span>
        </div>
      </div>
      {selectedGu && (
        <button className="gu-reset" onClick={() => setSelectedGu(null)}>
          <strong>{selectedGu}</strong>
          <span>전체 서울 보기</span>
        </button>
      )}
    </div>
  );
}
