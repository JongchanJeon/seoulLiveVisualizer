# Seoul Realtime Frontend

서울시 실시간 도시데이터를 지도와 대시보드로 확인하는 React 프론트엔드입니다. 백엔드 API에서 장소별 실시간 인구, 혼잡도, 대중교통, 예측 데이터를 받아와 지도 기반으로 시각화합니다.

## 주요 기능

- 서울 주요 장소 실시간 데이터 지도 표시
- 장소별 인구, 혼잡도, 대중교통 지표 시각화
- 마케팅 기회 점수 기반 장소 정렬 및 필터링
- 선택한 장소의 상세 지표와 시계열 차트 제공
- 서울 OpenAPI 키를 이용한 데이터 동기화
- API 연결 상태와 원본 응답을 확인하는 테스트 화면 제공

## 기술 스택

- Node.js 24.x
- React 19
- TypeScript
- Vite
- React Router
- Leaflet
- Recharts
- Lucide React

## 폴더 구조

```text
frontend/
├─ public/                 # 정적 아이콘 파일
├─ src/
│  ├─ assets/              # 이미지, 지도 GeoJSON 데이터
│  ├─ components/          # 지도, 사이드바, 차트, API 테스트 UI
│  ├─ lib/                 # 장소 데이터 가공 및 마케팅 지표 계산
│  ├─ App.tsx              # 라우팅 및 데이터 로딩 진입점
│  ├─ index.css            # 전역 스타일
│  └─ main.tsx             # React 엔트리
├─ package.json
└─ vite.config.ts
```

## 실행 전 준비

이 프론트엔드는 백엔드 API가 필요합니다. 기본 API 주소는 현재 접속한 호스트의 `8000` 포트입니다.

예를 들어 프론트에 아래 주소로 접속하면:

```text
http://172.16.103.23:5173/
```

프론트는 기본적으로 아래 백엔드를 호출합니다.

```text
http://172.16.103.23:8000/api
```

따라서 같은 네트워크에서 접속할 때는 백엔드도 `127.0.0.1`이 아니라 외부 접속 가능한 호스트로 실행되어야 합니다.

## 설치

```bash
npm install
```

## 개발 서버 실행

로컬 PC에서만 확인할 때:

```bash
npm run dev
```

같은 네트워크의 다른 기기에서 접속할 때:

```bash
npm run dev -- --host 0.0.0.0
```

실행 후 브라우저에서 표시되는 Network 주소로 접속합니다.

## API 주소 설정

기본값을 쓰면 프론트 접속 호스트 기준으로 `:8000/api`를 사용합니다.

다른 백엔드 주소를 사용해야 한다면 `.env.local` 파일을 만들고 다음처럼 설정합니다.

```env
VITE_API_BASE=http://localhost:8000/api
```

같은 네트워크의 다른 기기에서 접속하는 경우 예시는 다음과 같습니다.

```env
VITE_API_BASE=http://172.16.103.23:8000/api
```

`.env.local`은 `.gitignore`에 포함되어 있으므로 Git에 올라가지 않습니다.

## 빌드

```bash
npm run build
```

빌드 결과는 `dist/` 폴더에 생성됩니다.

## 빌드 결과 미리보기

```bash
npm run preview
```

## 린트

```bash
npm run lint
```

## 화면 경로

- `/` : 지도 기반 실시간 장소 분석 대시보드
- `/tester` : 서울 OpenAPI 및 백엔드 응답 테스트 화면

## 장소가 표시되지 않을 때 확인할 것

1. 백엔드 서버가 실행 중인지 확인합니다.
2. 브라우저에서 `http://백엔드주소:8000/api/places/all/realtime`에 접속해 응답이 오는지 확인합니다.
3. 다른 기기에서 접속한다면 백엔드가 `0.0.0.0` 또는 실제 LAN IP로 열려 있는지 확인합니다.
4. `.env.local`의 `VITE_API_BASE`가 잘못된 주소를 가리키지 않는지 확인합니다.
5. 백엔드 `.env`에 서울 OpenAPI 키와 DB 접속 정보가 설정되어 있는지 확인합니다.

## Git에 올릴 때 제외되는 항목

다음 항목은 `.gitignore`에 의해 제외됩니다.

- `node_modules/`
- `dist/`
- 로그 파일
- `.env.local` 등 로컬 환경 파일
- 에디터/OS 임시 파일
