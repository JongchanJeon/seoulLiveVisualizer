# Seoul Realtime City Data Backend

서울시 실시간 도시데이터 OpenAPI를 수집해 MariaDB에 저장하고, 프론트엔드에서 사용할 수 있는 FastAPI 기반 REST API로 제공하는 백엔드입니다.

## 주요 기능

- 서울시 실시간 도시데이터 수집
- 장소별 실시간 인구, 예측 인구, 대중교통, 날씨, 상권 데이터 저장
- 서버 시작 시 기본 장소 데이터 초기화 및 1회 백그라운드 동기화
- 수동 데이터 동기화 API 제공
- 프론트엔드 개발 서버(`localhost:5173`) CORS 허용

## 기술 스택

- Python
- FastAPI
- Uvicorn
- SQLAlchemy
- MariaDB / MySQL
- PyMySQL
- HTTPX

## 프로젝트 구조

```text
backend/
├── app/
│   ├── config.py       # 환경 변수 및 기본 설정
│   ├── db.py           # SQLAlchemy DB 연결
│   ├── main.py         # FastAPI 앱과 API 라우터
│   ├── models.py       # DB 모델 정의
│   └── scheduler.py    # 서울시 OpenAPI 수집 및 동기화 로직
├── schema.sql          # MariaDB/MySQL 스키마
├── requirements.txt    # Python 의존성
├── run.py              # 서버 실행 진입점
├── .gitignore
└── README.md
```

## 사전 준비

- Python 3.8 이상
- MariaDB 또는 MySQL
- 서울 열린데이터광장 OpenAPI 인증키

## 설치

Windows PowerShell 기준:

```powershell
python -m venv venv_win
.\venv_win\Scripts\activate
pip install -r requirements.txt
```

macOS/Linux 또는 WSL 기준:

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## 환경 변수

프로젝트 루트에 `.env` 파일을 만들고 아래 값을 설정합니다.

```env
SEOUL_API_KEY=your_seoul_openapi_key
DATABASE_URL=mariadb+pymysql://seoul_app:seoul_app_pw@localhost:3306/seoul_city_data
HOST=127.0.0.1
PORT=8000
```

`.env` 파일은 민감한 정보가 포함될 수 있으므로 git에 올리지 않습니다.

## 데이터베이스 초기화

`schema.sql`은 `seoul_city_data` 데이터베이스와 필요한 테이블을 생성합니다.

```bash
mysql -u root -p < schema.sql
```

`DATABASE_URL`에 사용하는 계정과 비밀번호는 로컬 DB 설정에 맞게 변경하세요.

예시:

```env
DATABASE_URL=mariadb+pymysql://사용자명:비밀번호@localhost:3306/seoul_city_data
```

## 서버 실행

```bash
python run.py
```

기본 실행 주소:

```text
http://127.0.0.1:8000
```

FastAPI 문서:

```text
http://127.0.0.1:8000/docs
```

## 주요 API

| Method | Endpoint | 설명 |
| --- | --- | --- |
| GET | `/api/status` | 서버 및 DB 연결 상태 확인 |
| POST | `/api/sync` | 전체 장소 데이터 수동 동기화 |
| GET | `/api/raw-test/{area_nm}` | 서울시 OpenAPI 원본 응답 테스트 |
| GET | `/api/places` | 저장된 장소 목록 조회 |
| GET | `/api/places/all/realtime` | 모든 장소의 최신 실시간 데이터 조회 |
| GET | `/api/places/{place_id}/realtime` | 특정 장소의 최신 실시간 데이터 조회 |
| GET | `/api/places/{place_id}/history` | 특정 장소의 인구/교통 이력 조회 |
| GET | `/api/places/{place_id}/stations` | 특정 장소 주변 정류장/역 좌표 조회 |

## 동기화 방식

서버가 시작되면 `start_scheduler()`가 실행되어 백그라운드에서 1회 전체 장소 데이터를 동기화합니다.

추가 동기화는 아래 API로 직접 실행할 수 있습니다.

```bash
curl -X POST http://127.0.0.1:8000/api/sync
```

## Git 업로드 전 확인

이미 `.gitignore`에 아래 항목이 제외되도록 설정되어 있습니다.

- `.env`
- `venv/`, `venv_win/`
- `__pycache__/`
- `*.pyc`
- 로그 파일
- 로컬 DB 파일

처음 git 저장소로 올리는 경우:

```bash
git init
git add .
git commit -m "Initial commit"
```
