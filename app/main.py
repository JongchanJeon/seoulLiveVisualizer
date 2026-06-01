import logging
from datetime import datetime, timedelta
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, inspect, text
from .db import engine, Base, get_db, SessionLocal
from .models import Place, PopulationHistory, TransitTraffic, StationCoordinate, WeatherHistory, CommercialActivity
from .scheduler import start_scheduler, sync_all_places

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seoul_api_server")

SCHEMA_PLACES = [
    ('POI001', '강남 MICE 관광특구'),
    ('POI003', '명동 관광특구'),
    ('POI004', '이태원 관광특구'),
    ('POI005', '잠실 관광특구'),
    ('POI006', '종로·청계 관광특구'),
    ('POI007', '홍대 관광특구'),
    ('POI009', '광화문·덕수궁'),
    ('POI014', '강남역'),
    ('POI107', '성수역'),
    ('POI108', '이촌한강공원'),
    ('POI110', '잠실한강공원'),
    ('POI111', '잠원한강공원'),
]

PLACE_LOCATION_OVERRIDES = {
    'POI001': {'gu_name': '강남구', 'dong_name': '삼성동', 'lat': 37.5116, 'lng': 127.0596},
    'POI003': {'gu_name': '중구', 'dong_name': '명동', 'lat': 37.5635, 'lng': 126.9816},
    'POI004': {'gu_name': '용산구', 'dong_name': '이태원동', 'lat': 37.5345, 'lng': 126.9946},
    'POI005': {'gu_name': '송파구', 'dong_name': '잠실동', 'lat': 37.5133, 'lng': 127.1001},
    'POI006': {'gu_name': '종로구', 'dong_name': '관철동', 'lat': 37.5693, 'lng': 126.9860},
    'POI007': {'gu_name': '마포구', 'dong_name': '서교동', 'lat': 37.5568, 'lng': 126.9242},
    'POI009': {'gu_name': '종로구', 'dong_name': '세종로', 'lat': 37.5704, 'lng': 126.9769},
    'POI014': {'gu_name': '강남구', 'dong_name': '역삼동', 'lat': 37.4979, 'lng': 127.0276},
    'POI107': {'gu_name': '성동구', 'dong_name': '성수동', 'lat': 37.5482, 'lng': 127.0304},
    'POI108': {'gu_name': '용산구', 'dong_name': '이촌동', 'lat': 37.5172, 'lng': 126.9707},
    'POI110': {'gu_name': '송파구', 'dong_name': '잠실동', 'lat': 37.5207, 'lng': 127.0877},
    'POI111': {'gu_name': '서초구', 'dong_name': '잠원동', 'lat': 37.5205, 'lng': 127.0128},
}
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized successfully.")
except Exception as e:
    logger.warning(f"Auto DDL check skipped or failed. Run schema.sql to align the database: {str(e)}")

app = FastAPI(
    title="Seoul Realtime City Data API",
    description="Backend API serving real-time population, demographic, weather, traffic, and commercial activity data in Seoul.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://172.16.103.23:5173",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}):5173",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        ensure_place_location_columns()
        ensure_population_gender_columns()

        places_count = db.query(Place).count()
        if places_count == 0:
            for area_cd, area_nm in SCHEMA_PLACES:
                db.add(Place(area_cd=area_cd, area_nm=area_nm))
            db.commit()
            logger.info("Seeded default places because the places table was empty.")
        else:
            logger.info(f"Preserving existing places table with {places_count} rows.")

        apply_place_location_overrides(db)

    except Exception as e:
        logger.warning(f"Schema place sync skipped: {str(e)}")
    finally:
        db.close()

    start_scheduler()


def ensure_place_location_columns():
    existing_columns = {column["name"] for column in inspect(engine).get_columns("places")}
    required_columns = {
        "gu_name": "VARCHAR(50) NULL",
        "dong_name": "VARCHAR(50) NULL",
        "lat": "DOUBLE NULL",
        "lng": "DOUBLE NULL",
    }

    missing_columns = [
        (column_name, column_type)
        for column_name, column_type in required_columns.items()
        if column_name not in existing_columns
    ]

    if not missing_columns:
        return

    with engine.begin() as conn:
        for column_name, column_type in missing_columns:
            conn.execute(text(f"ALTER TABLE places ADD COLUMN {column_name} {column_type}"))

    logger.info("Added missing location columns to places: %s", ", ".join(name for name, _ in missing_columns))


def ensure_population_gender_columns():
    existing_columns = {column["name"] for column in inspect(engine).get_columns("population_history")}
    required_columns = {
        "male_ppltn_rate": "FLOAT NULL",
        "female_ppltn_rate": "FLOAT NULL",
    }

    missing_columns = [
        (column_name, column_type)
        for column_name, column_type in required_columns.items()
        if column_name not in existing_columns
    ]

    if not missing_columns:
        return

    with engine.begin() as conn:
        for column_name, column_type in missing_columns:
            conn.execute(text(f"ALTER TABLE population_history ADD COLUMN {column_name} {column_type}"))

    logger.info("Added missing gender columns to population_history: %s", ", ".join(name for name, _ in missing_columns))


def apply_place_location_overrides(db: Session):
    updated_count = 0

    for area_cd, location in PLACE_LOCATION_OVERRIDES.items():
        place = db.query(Place).filter(Place.area_cd == area_cd).first()
        if not place:
            continue

        changed = False
        for key, value in location.items():
            if getattr(place, key) != value:
                setattr(place, key, value)
                changed = True

        if changed:
            updated_count += 1

    if updated_count:
        db.commit()
        logger.info("Applied curated location overrides to %s places.", updated_count)


def get_station_centroid(db: Session, place_id: int):
    centroid = db.query(
        func.avg(StationCoordinate.station_y),
        func.avg(StationCoordinate.station_x),
    ).filter(StationCoordinate.place_id == place_id).first()

    if not centroid or centroid[0] is None or centroid[1] is None:
        return None, None

    return float(centroid[0]), float(centroid[1])


def serialize_place_realtime(db: Session, place: Place, population=None, transit=None, commercial=None):
    location_override = PLACE_LOCATION_OVERRIDES.get(place.area_cd, {})
    lat = location_override.get("lat", place.lat)
    lng = location_override.get("lng", place.lng)

    if lat is None or lng is None:
        lat, lng = get_station_centroid(db, place.place_id)

    return {
        "place_id": place.place_id,
        "area_cd": place.area_cd,
        "area_nm": place.area_nm,
        "gu_name": location_override.get("gu_name", place.gu_name),
        "dong_name": location_override.get("dong_name", place.dong_name),
        "lat": lat,
        "lng": lng,
        "population": population,
        "population_forecast": get_population_forecast(db, place.place_id, population),
        "transit": transit,
        "commercial": commercial,
    }


def get_latest_population(db: Session, place_id: int):
    now = datetime.now()
    latest = db.query(PopulationHistory)\
        .filter(PopulationHistory.place_id == place_id, PopulationHistory.ppltn_time <= now)\
        .order_by(desc(PopulationHistory.ppltn_time))\
        .first()

    if latest:
        return latest

    return db.query(PopulationHistory)\
        .filter(PopulationHistory.place_id == place_id)\
        .order_by(desc(PopulationHistory.ppltn_time))\
        .first()


def get_population_forecast(db: Session, place_id: int, latest_pop, limit: int = 8):
    if not latest_pop:
        return []

    forecast_rows = db.query(PopulationHistory)\
        .filter(
            PopulationHistory.place_id == place_id,
            PopulationHistory.ppltn_time > latest_pop.ppltn_time,
            PopulationHistory.fcst_ppltn_max.isnot(None),
        )\
        .order_by(PopulationHistory.ppltn_time)\
        .limit(limit)\
        .all()

    if forecast_rows:
        return forecast_rows

    if latest_pop.fcst_ppltn_min is None and latest_pop.fcst_ppltn_max is None:
        return []

    forecast_time = latest_pop.ppltn_time + timedelta(hours=1)
    return [{
        "ppltn_time": forecast_time,
        "ppltn_min": latest_pop.fcst_ppltn_min or latest_pop.ppltn_min,
        "ppltn_max": latest_pop.fcst_ppltn_max or latest_pop.ppltn_max,
        "fcst_ppltn_min": latest_pop.fcst_ppltn_min,
        "fcst_ppltn_max": latest_pop.fcst_ppltn_max,
    }]


@app.get("/api/status")
def get_status(db: Session = Depends(get_db)):
    try:
        places_count = db.query(Place).count()
        pop_count = db.query(PopulationHistory).count()
        return {
            "status": "online",
            "database_connected": True,
            "tracked_places": places_count,
            "population_records": pop_count,
        }
    except Exception as e:
        return {
            "status": "error",
            "database_connected": False,
            "error_detail": str(e),
        }


@app.post("/api/sync")
def trigger_sync(api_key: str = Query(..., min_length=1)):
    try:
        sync_all_places(api_key.strip())
        return {"status": "success", "message": "Manual data sync executed successfully!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Manual sync failed: {str(e)}")


@app.get("/api/raw-test/{area_nm}")
def raw_api_test(area_nm: str, api_key: str = Query(..., min_length=1)):
    import httpx
    import time

    api_key = api_key.strip()
    masked_api_key = f"{api_key[:6]}...{api_key[-4:]}" if len(api_key) > 10 else f"{api_key[:2]}..."
    url = f"http://openapi.seoul.go.kr:8088/{api_key}/json/citydata/1/5/{area_nm}"
    display_url = f"http://openapi.seoul.go.kr:8088/{masked_api_key}/json/citydata/1/5/{area_nm}"

    start_time = time.time()
    try:
        response = httpx.get(url, timeout=15.0)
        duration_ms = round((time.time() - start_time) * 1000)

        try:
            raw_json = response.json()
        except Exception:
            raw_json = {"raw_text": response.text}

        return {
            "success": True,
            "request_url": display_url,
            "api_key_used": masked_api_key,
            "http_status": response.status_code,
            "duration_ms": duration_ms,
            "area_nm": area_nm,
            "raw_response": raw_json,
        }
    except httpx.TimeoutException:
        return {
            "success": False,
            "request_url": display_url,
            "api_key_used": masked_api_key,
            "http_status": 0,
            "duration_ms": round((time.time() - start_time) * 1000),
            "area_nm": area_nm,
            "error": "Seoul OpenAPI timeout (15s)",
        }
    except Exception as e:
        return {
            "success": False,
            "request_url": display_url,
            "api_key_used": masked_api_key,
            "http_status": 0,
            "duration_ms": round((time.time() - start_time) * 1000),
            "area_nm": area_nm,
            "error": str(e),
        }


@app.get("/api/places")
def get_places(db: Session = Depends(get_db)):
    return db.query(Place).all()


@app.get("/api/places/all/realtime")
def get_all_realtime_data(db: Session = Depends(get_db)):
    result = []
    places = db.query(Place).all()

    for p in places:
        pop = get_latest_population(db, p.place_id)
        transit = db.query(TransitTraffic).filter(TransitTraffic.place_id == p.place_id).order_by(desc(TransitTraffic.traffic_time)).first()
        commercial = db.query(CommercialActivity).filter(CommercialActivity.place_id == p.place_id).order_by(desc(CommercialActivity.recorded_at)).first()

        result.append(serialize_place_realtime(db, p, pop, transit, commercial))

    return result


@app.get("/api/places/{place_id}/realtime")
def get_realtime_data(place_id: int, db: Session = Depends(get_db)):
    place = db.query(Place).filter(Place.place_id == place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")

    latest_pop = get_latest_population(db, place_id)

    latest_transit = db.query(TransitTraffic)\
        .filter(TransitTraffic.place_id == place_id)\
        .order_by(desc(TransitTraffic.traffic_time))\
        .first()

    latest_weather = db.query(WeatherHistory)\
        .filter(WeatherHistory.place_id == place_id)\
        .order_by(desc(WeatherHistory.weather_time))\
        .first()

    latest_cmrcl = db.query(CommercialActivity)\
        .filter(CommercialActivity.place_id == place_id)\
        .order_by(desc(CommercialActivity.recorded_at))\
        .first()

    data = serialize_place_realtime(db, place, latest_pop, latest_transit, latest_cmrcl)
    data["weather"] = latest_weather
    return data


@app.get("/api/places/{place_id}/history")
def get_historical_data(place_id: int, limit: int = 24, db: Session = Depends(get_db)):
    place = db.query(Place).filter(Place.place_id == place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")

    pop_history = db.query(PopulationHistory)\
        .filter(PopulationHistory.place_id == place_id, PopulationHistory.ppltn_time <= datetime.now())\
        .order_by(desc(PopulationHistory.ppltn_time))\
        .limit(limit)\
        .all()
    pop_history.reverse()

    latest_pop = pop_history[-1] if pop_history else get_latest_population(db, place_id)

    transit_history = db.query(TransitTraffic)\
        .filter(TransitTraffic.place_id == place_id)\
        .order_by(desc(TransitTraffic.traffic_time))\
        .limit(limit)\
        .all()
    transit_history.reverse()

    return {
        "place_id": place_id,
        "area_nm": place.area_nm,
        "population_history": pop_history,
        "population_forecast": get_population_forecast(db, place_id, latest_pop),
        "transit_history": transit_history,
    }


@app.get("/api/places/{place_id}/stations")
def get_place_stations(place_id: int, db: Session = Depends(get_db)):
    return db.query(StationCoordinate).filter(StationCoordinate.place_id == place_id).all()
