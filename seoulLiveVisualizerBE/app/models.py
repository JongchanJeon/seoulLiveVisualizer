from sqlalchemy import Column, BigInteger, Integer, String, Float, DateTime, ForeignKey, Text, Double, TIMESTAMP, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .db import Base

class Place(Base):
    __tablename__ = "places"

    place_id = Column(Integer, primary_key=True, autoincrement=True)
    area_cd = Column(String(20), unique=True, nullable=False)
    area_nm = Column(String(50), nullable=False)
    gu_name = Column(String(50))
    dong_name = Column(String(50))
    lat = Column(Double)
    lng = Column(Double)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())

    # Relationships
    populations = relationship("PopulationHistory", back_populates="place", cascade="all, delete-orphan")
    transits = relationship("TransitTraffic", back_populates="place", cascade="all, delete-orphan")
    stations = relationship("StationCoordinate", back_populates="place", cascade="all, delete-orphan")
    weather = relationship("WeatherHistory", back_populates="place", cascade="all, delete-orphan")
    commercials = relationship("CommercialActivity", back_populates="place", cascade="all, delete-orphan")


class PopulationHistory(Base):
    __tablename__ = "population_history"

    history_id = Column(BigInteger, primary_key=True, autoincrement=True)
    place_id = Column(Integer, ForeignKey("places.place_id", ondelete="CASCADE"), nullable=False)
    congest_lvl = Column(String(20), nullable=False)
    congest_msg = Column(Text)
    ppltn_min = Column(Integer, nullable=False)
    ppltn_max = Column(Integer, nullable=False)
    ppltn_rate_10 = Column(Float, nullable=False)
    ppltn_rate_20 = Column(Float, nullable=False)
    ppltn_rate_30 = Column(Float, nullable=False)
    ppltn_rate_40 = Column(Float, nullable=False)
    ppltn_rate_50 = Column(Float, nullable=False)
    ppltn_rate_60 = Column(Float, nullable=False)
    ppltn_rate_70 = Column(Float, nullable=False)
    male_ppltn_rate = Column(Float)
    female_ppltn_rate = Column(Float)
    fcst_ppltn_min = Column(Integer)
    fcst_ppltn_max = Column(Integer)
    ppltn_time = Column(DateTime, nullable=False)
    recorded_at = Column(TIMESTAMP, server_default=func.current_timestamp())

    place = relationship("Place", back_populates="populations")

    __table_args__ = (
        UniqueConstraint('place_id', 'ppltn_time', name='uq_place_ppltn_time'),
    )


class TransitTraffic(Base):
    __tablename__ = "transit_traffic"

    traffic_id = Column(BigInteger, primary_key=True, autoincrement=True)
    place_id = Column(Integer, ForeignKey("places.place_id", ondelete="CASCADE"), nullable=False)
    sub_ppltn_min = Column(Integer)
    sub_ppltn_max = Column(Integer)
    bus_ppltn_min = Column(Integer)
    bus_ppltn_max = Column(Integer)
    traffic_time = Column(DateTime, nullable=False)
    recorded_at = Column(TIMESTAMP, server_default=func.current_timestamp())

    place = relationship("Place", back_populates="transits")

    __table_args__ = (
        UniqueConstraint('place_id', 'traffic_time', name='uq_place_traffic_time'),
    )


class StationCoordinate(Base):
    __tablename__ = "station_coordinates"

    station_id = Column(BigInteger, primary_key=True, autoincrement=True)
    place_id = Column(Integer, ForeignKey("places.place_id", ondelete="CASCADE"), nullable=False)
    station_type = Column(String(10), nullable=False)  # 'BUS' or 'SUBWAY'
    station_nm = Column(String(100), nullable=False)
    station_x = Column(Double, nullable=False)  # Longitude
    station_y = Column(Double, nullable=False)  # Latitude
    recorded_at = Column(TIMESTAMP, server_default=func.current_timestamp())

    place = relationship("Place", back_populates="stations")


class WeatherHistory(Base):
    __tablename__ = "weather_history"

    weather_id = Column(BigInteger, primary_key=True, autoincrement=True)
    place_id = Column(Integer, ForeignKey("places.place_id", ondelete="CASCADE"), nullable=False)
    weather_time = Column(DateTime, nullable=False)
    temp = Column(Float, nullable=False)
    precipitation = Column(Float, default=0.0)
    weather_stts = Column(String(50))
    recorded_at = Column(TIMESTAMP, server_default=func.current_timestamp())

    place = relationship("Place", back_populates="weather")

    __table_args__ = (
        UniqueConstraint('place_id', 'weather_time', name='uq_place_weather_time'),
    )


class CommercialActivity(Base):
    __tablename__ = "commercial_activity"

    commercial_id = Column(BigInteger, primary_key=True, autoincrement=True)
    place_id = Column(Integer, ForeignKey("places.place_id", ondelete="CASCADE"), nullable=False)
    area_cmrcl_lvl = Column(String(50))
    area_sh_payment_cnt = Column(Integer)
    recorded_at = Column(TIMESTAMP, server_default=func.current_timestamp())

    place = relationship("Place", back_populates="commercials")
