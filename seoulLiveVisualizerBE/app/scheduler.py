import logging
import httpx
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from .config import settings
from .db import SessionLocal
from .models import Place, PopulationHistory, TransitTraffic, StationCoordinate, WeatherHistory, CommercialActivity

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seoul_data_scheduler")

def safe_int(value, default=0):
    try:
        return int(float(value)) if value is not None else default
    except (ValueError, TypeError):
        return default

def safe_float(value, default=0.0):
    try:
        return float(value) if value is not None else default
    except (ValueError, TypeError):
        return default

def update_model(instance, **values):
    for key, value in values.items():
        setattr(instance, key, value)
    return instance

def parse_datetime(time_str: str) -> datetime:
    if not time_str:
        return datetime.now()
    
    time_str = time_str.strip()
    
    # Format: YYYY-MM-DD HH:MM
    if "-" in time_str and ":" in time_str:
        try:
            return datetime.strptime(time_str, "%Y-%m-%d %H:%M")
        except ValueError:
            pass
            
    # Format: YYYYMMDD
    if len(time_str) == 8 and time_str.isdigit():
        try:
            return datetime.strptime(time_str, "%Y%m%d")
        except ValueError:
            pass
            
    # Format: YYYYMMDDHH
    if len(time_str) == 10 and time_str.isdigit():
        try:
            return datetime.strptime(time_str, "%Y%m%d%H")
        except ValueError:
            pass
            
    # Format: YYYYMMDDHHMM
    if len(time_str) == 12 and time_str.isdigit():
        try:
            return datetime.strptime(time_str, "%Y%m%d%H%M")
        except ValueError:
            pass

    # Fallbacks
    try:
        return datetime.fromisoformat(time_str)
    except ValueError:
        return datetime.now()

def get_forecast_datetime(forecast: dict):
    for key in ("FCST_TIME", "PPLTN_TIME", "FCST_DT", "FCST_DATE"):
        if forecast.get(key):
            return parse_datetime(str(forecast.get(key)))
    return None

def fetch_and_sync_place(db: Session, place: Place, api_key: Optional[str] = None):
    """
    Fetches real-time city data for a single place and writes it to the database.
    """
    api_key = (api_key or settings.SEOUL_API_KEY).strip()
    url = f"http://openapi.seoul.go.kr:8088/{api_key}/json/citydata/1/5/{place.area_nm}"
    
    logger.info(f"Syncing data for {place.area_nm} ({place.area_cd})...")
    
    try:
        response = httpx.get(url, timeout=15.0)
        if response.status_code != 200:
            logger.error(f"Failed to fetch data for {place.area_nm}: HTTP {response.status_code}")
            return
            
        data = response.json()
        city_data = data.get("CITYDATA")
        
        if not city_data:
            logger.warning(f"No CITYDATA found in API response for {place.area_nm}")
            return

        # 1. Parse Population History
        live_ppltn_list = city_data.get("LIVE_PPLTN_STTS", [])
        pop_hist = None
        if live_ppltn_list:
            ppl = live_ppltn_list[0]
            ppltn_time_str = ppl.get("PPLTN_TIME")
            if ppltn_time_str:
                ppltn_time = parse_datetime(ppltn_time_str)
                
                # Fetch forecast values if available
                fcst_list = ppl.get("FCST_PPLTN", [])
                fcst_min = safe_int(fcst_list[0].get("FCST_PPLTN_MIN")) if fcst_list else None
                fcst_max = safe_int(fcst_list[0].get("FCST_PPLTN_MAX")) if fcst_list else None
                
                pop_hist = PopulationHistory(
                    place_id=place.place_id,
                    congest_lvl=ppl.get("AREA_CONGEST_LVL", "미지정"),
                    congest_msg=ppl.get("AREA_CONGEST_MSG", ""),
                    ppltn_min=safe_int(ppl.get("AREA_PPLTN_MIN")),
                    ppltn_max=safe_int(ppl.get("AREA_PPLTN_MAX")),
                    ppltn_rate_10=safe_float(ppl.get("PPLTN_RATE_10")),
                    ppltn_rate_20=safe_float(ppl.get("PPLTN_RATE_20")),
                    ppltn_rate_30=safe_float(ppl.get("PPLTN_RATE_30")),
                    ppltn_rate_40=safe_float(ppl.get("PPLTN_RATE_40")),
                    ppltn_rate_50=safe_float(ppl.get("PPLTN_RATE_50")),
                    ppltn_rate_60=safe_float(ppl.get("PPLTN_RATE_60")),
                    ppltn_rate_70=safe_float(ppl.get("PPLTN_RATE_70")),
                    male_ppltn_rate=safe_float(ppl.get("MALE_PPLTN_RATE")),
                    female_ppltn_rate=safe_float(ppl.get("FEMALE_PPLTN_RATE")),
                    fcst_ppltn_min=fcst_min,
                    fcst_ppltn_max=fcst_max,
                    ppltn_time=ppltn_time
                )
                
                existing_pop = db.query(PopulationHistory).filter(
                    PopulationHistory.place_id == pop_hist.place_id,
                    PopulationHistory.ppltn_time == pop_hist.ppltn_time
                ).first()
                if existing_pop:
                    update_model(
                        existing_pop,
                        congest_lvl=pop_hist.congest_lvl,
                        congest_msg=pop_hist.congest_msg,
                        ppltn_min=pop_hist.ppltn_min,
                        ppltn_max=pop_hist.ppltn_max,
                        ppltn_rate_10=pop_hist.ppltn_rate_10,
                        ppltn_rate_20=pop_hist.ppltn_rate_20,
                        ppltn_rate_30=pop_hist.ppltn_rate_30,
                        ppltn_rate_40=pop_hist.ppltn_rate_40,
                        ppltn_rate_50=pop_hist.ppltn_rate_50,
                        ppltn_rate_60=pop_hist.ppltn_rate_60,
                        ppltn_rate_70=pop_hist.ppltn_rate_70,
                        male_ppltn_rate=pop_hist.male_ppltn_rate,
                        female_ppltn_rate=pop_hist.female_ppltn_rate,
                        fcst_ppltn_min=pop_hist.fcst_ppltn_min,
                        fcst_ppltn_max=pop_hist.fcst_ppltn_max
                    )
                else:
                    db.add(pop_hist)

                for forecast in fcst_list:
                    fcst_time = get_forecast_datetime(forecast)
                    if not fcst_time or fcst_time <= ppltn_time:
                        continue

                    forecast_min = safe_int(forecast.get("FCST_PPLTN_MIN"))
                    forecast_max = safe_int(forecast.get("FCST_PPLTN_MAX"))
                    forecast_hist = PopulationHistory(
                        place_id=place.place_id,
                        congest_lvl=ppl.get("AREA_CONGEST_LVL", "미지정"),
                        congest_msg=ppl.get("AREA_CONGEST_MSG", ""),
                        ppltn_min=forecast_min,
                        ppltn_max=forecast_max,
                        ppltn_rate_10=safe_float(ppl.get("PPLTN_RATE_10")),
                        ppltn_rate_20=safe_float(ppl.get("PPLTN_RATE_20")),
                        ppltn_rate_30=safe_float(ppl.get("PPLTN_RATE_30")),
                        ppltn_rate_40=safe_float(ppl.get("PPLTN_RATE_40")),
                        ppltn_rate_50=safe_float(ppl.get("PPLTN_RATE_50")),
                        ppltn_rate_60=safe_float(ppl.get("PPLTN_RATE_60")),
                        ppltn_rate_70=safe_float(ppl.get("PPLTN_RATE_70")),
                        male_ppltn_rate=safe_float(ppl.get("MALE_PPLTN_RATE")),
                        female_ppltn_rate=safe_float(ppl.get("FEMALE_PPLTN_RATE")),
                        fcst_ppltn_min=forecast_min,
                        fcst_ppltn_max=forecast_max,
                        ppltn_time=fcst_time
                    )

                    existing_forecast = db.query(PopulationHistory).filter(
                        PopulationHistory.place_id == forecast_hist.place_id,
                        PopulationHistory.ppltn_time == forecast_hist.ppltn_time
                    ).first()
                    if existing_forecast:
                        update_model(
                            existing_forecast,
                            congest_lvl=forecast_hist.congest_lvl,
                            congest_msg=forecast_hist.congest_msg,
                            ppltn_min=forecast_hist.ppltn_min,
                            ppltn_max=forecast_hist.ppltn_max,
                            ppltn_rate_10=forecast_hist.ppltn_rate_10,
                            ppltn_rate_20=forecast_hist.ppltn_rate_20,
                            ppltn_rate_30=forecast_hist.ppltn_rate_30,
                            ppltn_rate_40=forecast_hist.ppltn_rate_40,
                            ppltn_rate_50=forecast_hist.ppltn_rate_50,
                            ppltn_rate_60=forecast_hist.ppltn_rate_60,
                            ppltn_rate_70=forecast_hist.ppltn_rate_70,
                            male_ppltn_rate=forecast_hist.male_ppltn_rate,
                            female_ppltn_rate=forecast_hist.female_ppltn_rate,
                            fcst_ppltn_min=forecast_hist.fcst_ppltn_min,
                            fcst_ppltn_max=forecast_hist.fcst_ppltn_max
                        )
                    else:
                        db.add(forecast_hist)

        # 2. Parse Transit (Subway & Bus) Traffic
        sub_ppltn = city_data.get("LIVE_SUB_PPLTN", {})
        bus_ppltn = city_data.get("LIVE_BUS_PPLTN", {})
        
        # Use the population time so transit data aligns perfectly with population history
        traffic_time_str = sub_ppltn.get("SUB_STN_TIME") or bus_ppltn.get("BUS_STN_TIME")
        if pop_hist:
            # Override the date-only string from the API with the exact population time
            traffic_time = pop_hist.ppltn_time
            transit = TransitTraffic(
                place_id=place.place_id,
                sub_ppltn_min=safe_int(sub_ppltn.get("SUB_30WTHN_GTON_PPLTN_MIN")) + safe_int(sub_ppltn.get("SUB_30WTHN_GTOFF_PPLTN_MIN")),
                sub_ppltn_max=safe_int(sub_ppltn.get("SUB_30WTHN_GTON_PPLTN_MAX")) + safe_int(sub_ppltn.get("SUB_30WTHN_GTOFF_PPLTN_MAX")),
                bus_ppltn_min=safe_int(bus_ppltn.get("BUS_30WTHN_GTON_PPLTN_MIN")) + safe_int(bus_ppltn.get("BUS_30WTHN_GTOFF_PPLTN_MIN")),
                bus_ppltn_max=safe_int(bus_ppltn.get("BUS_30WTHN_GTON_PPLTN_MAX")) + safe_int(bus_ppltn.get("BUS_30WTHN_GTOFF_PPLTN_MAX")),
                traffic_time=traffic_time
            )
            
            existing_transit = db.query(TransitTraffic).filter(
                TransitTraffic.place_id == transit.place_id,
                TransitTraffic.traffic_time == transit.traffic_time
            ).first()
            if existing_transit:
                update_model(
                    existing_transit,
                    sub_ppltn_min=transit.sub_ppltn_min,
                    sub_ppltn_max=transit.sub_ppltn_max,
                    bus_ppltn_min=transit.bus_ppltn_min,
                    bus_ppltn_max=transit.bus_ppltn_max
                )
            else:
                db.add(transit)

        # 3. Parse Station Coordinates (For Heatmap)
        # We only populate this if coordinates aren't stored yet to avoid excessive DB writes
        existing_coords_count = db.query(StationCoordinate).filter(StationCoordinate.place_id == place.place_id).count()
        if existing_coords_count == 0:
            bus_stn_list = city_data.get("BUS_STN_STTS", [])
            for bus in bus_stn_list:
                bx = safe_float(bus.get("BUS_STN_X"))
                by = safe_float(bus.get("BUS_STN_Y"))
                if bx > 0 and by > 0:
                    stn = StationCoordinate(
                        place_id=place.place_id,
                        station_type="BUS",
                        station_nm=bus.get("BUS_STN_NM", "버스정류소"),
                        station_x=bx,
                        station_y=by
                    )
                    db.add(stn)
                    
            subway_stn_list = city_data.get("SUB_STTS", [])
            for sub in subway_stn_list:
                sx = safe_float(sub.get("SUB_STN_X"))
                sy = safe_float(sub.get("SUB_STN_Y"))
                if sx > 0 and sy > 0:
                    stn = StationCoordinate(
                        place_id=place.place_id,
                        station_type="SUBWAY",
                        station_nm=sub.get("SUB_STN_NM", "지하철역"),
                        station_x=sx,
                        station_y=sy
                    )
                    db.add(stn)

        # 4. Parse Weather
        weather_list = city_data.get("WEATHER_STTS", [])
        if weather_list:
            w = weather_list[0]
            w_time_str = w.get("WEATHER_TIME")
            if w_time_str:
                weather_time = parse_datetime(w_time_str)
                weather = WeatherHistory(
                    place_id=place.place_id,
                    weather_time=weather_time,
                    temp=safe_float(w.get("TEMP")),
                    precipitation=safe_float(w.get("PRECIPITATION")),
                    weather_stts=w.get("WEATHER_STTS")
                )
                
                existing_weather = db.query(WeatherHistory).filter(
                    WeatherHistory.place_id == weather.place_id,
                    WeatherHistory.weather_time == weather.weather_time
                ).first()
                if existing_weather:
                    update_model(
                        existing_weather,
                        temp=weather.temp,
                        precipitation=weather.precipitation,
                        weather_stts=weather.weather_stts
                    )
                else:
                    db.add(weather)

        # 5. Parse Commercial / Payment Activity
        cmrcl = city_data.get("LIVE_CMRCL_STTS", {})
        if cmrcl:
            cmrcl_act = CommercialActivity(
                place_id=place.place_id,
                area_cmrcl_lvl=cmrcl.get("AREA_CMRCL_LVL", "보통"),
                area_sh_payment_cnt=safe_int(cmrcl.get("AREA_SH_PAYMENT_CNT"))
            )
            db.add(cmrcl_act)

        db.commit()
        logger.info(f"Successfully synced data for {place.area_nm}!")
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error syncing {place.area_nm}: {str(e)}", exc_info=True)


def sync_all_places(api_key: Optional[str] = None):
    """
    Utility function called by scheduler. Loads all active places from DB and updates them.
    """
    db = SessionLocal()
    try:
        places = db.query(Place).all()
        if not places:
            logger.info("No places defined in DB. Skipping sync.")
            return
            
        for place in places:
            fetch_and_sync_place(db, place, api_key)
    finally:
        db.close()


def start_scheduler():
    """
    Runs one background sync when the API server starts.
    Additional syncs happen only through the /api/sync endpoint.
    """
    import threading

    logger.info("Initial Seoul OpenAPI sync started in the background.")
    threading.Thread(target=sync_all_places, daemon=True).start()
