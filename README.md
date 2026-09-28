# Seoul Live Visualizer

서울 실시간 도시데이터를 활용해 팝업스토어, 오프라인 행사, 브랜드 체험존 후보지를 비교·분석하는 지도 기반 대시보드입니다.  
서울 열린데이터광장의 실시간 인구, 연령대 비율, 혼잡도, 대중교통 유입, 상권 결제 데이터를 수집하고, 이를 마케팅 관점의 추천 점수로 환산해 장소별 우선순위를 보여줍니다.

## 프로젝트 목적

오프라인 행사를 기획할 때는 단순히 사람이 많은 장소보다, 목표 고객층이 많이 모이고 접근성이 좋으며 구매 전환 가능성이 높은 장소가 중요합니다. 이 프로젝트는 서울 주요 장소의 실시간 데이터를 한 화면에서 비교해 행사 후보지를 빠르게 판단할 수 있도록 돕습니다.

주요 활용 예시는 다음과 같습니다.

- 팝업스토어 입지 후보 비교
- 브랜드 캠페인 또는 체험 부스 운영 장소 탐색
- 2030 타깃 밀집 지역 확인
- 대중교통 접근성과 현장 구매 가능성 기반 후보지 랭킹
- 혼잡도와 예측 인구를 함께 고려한 운영 리스크 확인

## 주요 기능

- 서울 주요 장소를 지도 위 원형 마커로 시각화
- 추천점수, 실시간 인구, 교통 접근성, 결제 건수, 2030 비중 기준으로 후보지 비교
- 고객 목적에 맞게 점수 가중치 조정
- 기준 점수 이상 장소를 지도와 랭킹에서 강조
- 장소 선택 시 후보 상세 패널 제공
- 미래 인구 예측, 운영 인사이트, 성별 비율, 연령대 분포, 최근 추세 차트 제공
- 서울 OpenAPI 데이터 수동 동기화 및 API 응답 테스트

## 서비스 화면

아래 이미지는 `seoulLiveVisualizerFE/static` 폴더의 화면 자료를 기준으로 정리했습니다.

| 화면 | 설명 |
| --- | --- |
| <img src="./seoulLiveVisualizerFE/static/image1.png" width="320" alt="서울 지도 기반 후보지 분포 화면"> | **전체 지도 화면**: 서울 전역의 후보지를 원형 마커로 표시합니다. 색상은 선택한 분석 지표의 강도를 나타내고, 원의 크기는 기준 충족 여부와 선택 상태를 표현합니다. 좌측 하단 범례를 통해 지도 색상과 마커 의미를 바로 확인할 수 있습니다. |
| <img src="./seoulLiveVisualizerFE/static/image2.png" width="320" alt="지도와 후보 상세 패널이 함께 표시된 화면"> | **후보지 선택 화면**: 지도에서 장소를 선택하면 우측에 상세 패널이 열립니다. 선택된 마커는 더 진하게 강조되며, 패널에서는 추천 점수와 핵심 KPI를 함께 확인할 수 있습니다. |
| <img src="./seoulLiveVisualizerFE/static/image3.png" width="220" alt="후보 상세 상단 점수 및 KPI 화면"> | **후보 상세 상단**: 장소명, 행정동, 추천 등급, 종합 점수, 최대 인구, 예측 인구, 교통 유입, 결제 건수, 혼잡도를 요약합니다. 빠른 의사결정에 필요한 핵심 지표를 카드 형태로 정리한 영역입니다. |
| <img src="./seoulLiveVisualizerFE/static/image4.png" width="220" alt="미래 인구 예측 및 운영 인사이트 화면"> | **미래 인구 예측과 운영 인사이트**: 시간대별 예측 인구를 막대형 타임라인으로 보여주고, 현재 대비 증감률을 함께 제공합니다. 하단에는 소규모 프로모션 적합성, 2030 타깃 반응, 대중교통 유입 전략 등 운영 관점의 해석을 제공합니다. |
| <img src="./seoulLiveVisualizerFE/static/image5.png" width="220" alt="성별 비율과 점수 산정 방식 일부 화면"> | **성별 비율 및 점수 산정**: 남녀 비율을 도넛 차트로 보여주고, 추천 점수를 구성하는 항목별 기여도를 표시합니다. 각 항목이 왜 점수에 반영되는지 설명 문구와 함께 확인할 수 있습니다. |
| <img src="./seoulLiveVisualizerFE/static/image6.png" width="220" alt="점수 산정 방식 전체 화면"> | **점수 산정 방식 상세**: 집객 적정성, 2030 타깃성, 교통 접근성, 결제 건수, 예측 성장성, 혼잡도 위험 감점을 항목별로 분해합니다. 가중치와 원점수를 함께 보여주므로 추천 결과의 근거를 검토할 수 있습니다. |
| <img src="./seoulLiveVisualizerFE/static/image7.png" width="220" alt="연령대 분포와 최근 추세 차트 화면"> | **연령대 분포와 최근 추세**: 10대부터 70대 이상까지 연령대별 비율을 막대 차트로 보여주고, 실시간 인구·예측 인구·지하철·버스 지표를 추세 그래프로 비교합니다. 시간 흐름에 따른 장소 변화를 파악하는 영역입니다. |
| <img src="./seoulLiveVisualizerFE/static/image8.png" width="220" alt="좌측 분석 패널과 고객별 가중치 화면"> | **좌측 분석 패널**: 현재 1순위 후보와 주요 지표 점수를 요약합니다. 고객별 가중치 프리셋을 통해 균형형, 2030 타깃, 교통 유입, 구매 전환 중심으로 추천 기준을 빠르게 바꿀 수 있습니다. |
| <img src="./seoulLiveVisualizerFE/static/image9.png" width="220" alt="분석 기준과 강조 기준 설정 화면"> | **분석 기준 설정**: 추천점수, 실시간 인구, 교통 접근성, 결제 건수, 2030 비중 중 지도와 랭킹에 사용할 기준을 선택합니다. 강조 기준 슬라이더로 일정 점수 이상의 후보지를 더 진하게 표시합니다. |
| <img src="./seoulLiveVisualizerFE/static/image10.png" width="220" alt="행사 추천점수 랭킹 화면"> | **후보지 랭킹**: 선택한 분석 기준에 따라 장소를 순위화합니다. 후보명을 클릭하면 지도 위치와 우측 상세 패널이 연동되어 장소별 세부 데이터를 확인할 수 있습니다. |

## 기술 스택

### Frontend

- React 19
- TypeScript
- Vite
- React Router
- Leaflet
- Recharts
- Lucide React

### Backend

- Python
- FastAPI
- Uvicorn
- SQLAlchemy
- MariaDB
- PyMySQL
- HTTPX

## 프로젝트 구조

```text
seoulLiveVisualizer/
├─ README.md
├─ seoulLiveVisualizerFE/
│  ├─ src/
│  │  ├─ App.tsx
│  │  ├─ components/
│  │  │  ├─ SeoulMap.tsx
│  │  │  ├─ SeoulMapLayout.tsx
│  │  │  ├─ MapSidebarLeft.tsx
│  │  │  ├─ MapIslandRight.tsx
│  │  │  ├─ DemographicsBarChart.tsx
│  │  │  ├─ TrendLineChart.tsx
│  │  │  └─ APITester.tsx
│  │  ├─ lib/
│  │  │  └─ marketingMetrics.ts
│  │  └─ assets/
│  │     └─ geo/seoul_gu.geojson
│  ├─ static/
│  │  ├─ image1.png
│  │  └─ image10.png
│  └─ package.json
└─ seoulLiveVisualizerBE/
   ├─ app/
   │  ├─ main.py
   │  ├─ scheduler.py
   │  ├─ models.py
   │  ├─ db.py
   │  └─ config.py
   ├─ schema.sql
   ├─ requirements.txt
   ├─ .env.example
   └─ run.py
```

## 데이터 흐름

1. Backend가 서울 열린데이터광장 OpenAPI의 `citydata` 응답을 조회합니다.
2. 장소별 인구, 예측 인구, 연령대 비율, 성별 비율, 혼잡도, 대중교통, 날씨, 상권 데이터를 파싱합니다.
3. 파싱된 데이터는 MariaDB의 장소·인구 이력·교통·정류장 좌표·날씨·상권 테이블에 저장됩니다.
4. Frontend는 `/api/places/all/realtime`과 `/api/places/{place_id}/history`를 호출해 지도와 상세 패널을 렌더링합니다.
5. `marketingMetrics.ts`에서 집객, 2030 비중, 교통, 결제, 예측 성장성, 혼잡도 감점을 조합해 추천점수를 계산합니다.

## Backend 실행

### 1. 환경 변수 설정

`seoulLiveVisualizerBE/.env.example`을 참고해 `seoulLiveVisualizerBE/.env` 파일을 만듭니다.

```env
SEOUL_API_KEY=your_seoul_openapi_key
DATABASE_URL=mariadb+pymysql://username:password@localhost:3306/seoul_city_data
HOST=0.0.0.0
PORT=8000
```

### 2. 데이터베이스 초기화

MariaDB에서 데이터베이스와 테이블을 생성합니다.

```bash
mysql -u root -p < seoulLiveVisualizerBE/schema.sql
```

### 3. 패키지 설치 및 서버 실행

```bash
cd seoulLiveVisualizerBE
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python run.py
```

Windows PowerShell에서는 가상환경 활성화 명령만 다음처럼 사용할 수 있습니다.

```powershell
.\venv\Scripts\activate
```

기본 서버 주소는 다음과 같습니다.

```text
http://127.0.0.1:8000
```

FastAPI 문서는 다음 주소에서 확인할 수 있습니다.

```text
http://127.0.0.1:8000/docs
```

## Frontend 실행

```bash
cd seoulLiveVisualizerFE
npm install
npm run dev
```

같은 네트워크의 다른 기기에서 접속해야 한다면 다음처럼 실행합니다.

```bash
npm run dev -- --host 0.0.0.0
```

Frontend는 기본적으로 현재 접속한 호스트의 `8000` 포트를 Backend API로 사용합니다.

```text
http://현재호스트:8000/api
```

다른 Backend 주소를 사용해야 한다면 `seoulLiveVisualizerFE/.env.local`에 다음 값을 설정합니다.

```env
VITE_API_BASE=http://localhost:8000/api
```

## 주요 API

| Method | Endpoint | 설명 |
| --- | --- | --- |
| `GET` | `/api/status` | 서버와 DB 연결 상태 확인 |
| `POST` | `/api/sync?api_key={key}` | 서울 OpenAPI 데이터를 수동 동기화 |
| `GET` | `/api/raw-test/{area_nm}?api_key={key}` | 특정 장소의 서울 OpenAPI 원본 응답 테스트 |
| `GET` | `/api/places` | 저장된 장소 목록 조회 |
| `GET` | `/api/places/all/realtime` | 전체 장소의 최신 실시간 데이터 조회 |
| `GET` | `/api/places/{place_id}/realtime` | 특정 장소의 최신 실시간 데이터 조회 |
| `GET` | `/api/places/{place_id}/history?limit=24` | 특정 장소의 인구·예측·교통 이력 조회 |
| `GET` | `/api/places/{place_id}/stations` | 특정 장소 주변 정류장 좌표 조회 |

## 추천점수 기준

추천점수는 Frontend에서 다음 요소를 조합해 계산합니다.

| 항목 | 의미 |
| --- | --- |
| 집객 적정성 | 현재 인구 규모를 기반으로 하되 과밀하면 감점 |
| 2030 타깃성 | 20대와 30대 비중을 합산해 타깃 적합도 판단 |
| 교통 접근성 | 지하철과 버스 승하차 규모를 합산 |
| 결제 건수 | 현장 구매 전환 가능성을 상권 결제 건수로 판단 |
| 예측 성장성 | 미래 예측 인구가 현재보다 늘어나는지 확인 |
| 혼잡도 위험 | 혼잡도가 높을수록 운영 리스크로 감점 |

좌측 패널에서 가중치를 조절하면 추천점수가 즉시 다시 계산됩니다.

## 개발 참고

- Backend 시작 시 기본 장소 데이터가 없으면 주요 장소를 자동으로 시드합니다.
- 서버 시작 시 백그라운드에서 1회 데이터 동기화를 시도합니다.
- Frontend의 `/tester` 경로에서는 API 키를 넣고 서울 OpenAPI 원본 응답을 확인할 수 있습니다.
- 민감 정보가 포함된 `.env`, `.env.local`은 Git에 올리지 않는 것을 권장합니다.
