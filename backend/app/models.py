from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from geoalchemy2 import Geography
from app.database import Base

class Station(Base):
    __tablename__ = "stations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    location = Column(Geography(geometry_type='POINT', srid=4326), nullable=False)
    address = Column(String)
    connector_types = Column(ARRAY(String))
    total_stalls = Column(Integer)
    source = Column(String)
    source_url = Column(String)
    reliability_score = Column(Float, default=None)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    reviews = relationship("Review", back_populates="station", cascade="all, delete-orphan")

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey("stations.id", ondelete="CASCADE"), nullable=True)
    review_text = Column(String)
    rating = Column(Float)
    review_date = Column(DateTime)
    sentiment = Column(String)
    issues = Column(ARRAY(String))
    confidence = Column(Float)
    source = Column(String)
    created_at = Column(DateTime, server_default=func.now())

    station = relationship("Station", back_populates="reviews")

class Route(Base):
    __tablename__ = "routes"

    id = Column(Integer, primary_key=True, index=True)
    origin_lat = Column(Float)
    origin_lng = Column(Float)
    dest_lat = Column(Float)
    dest_lng = Column(Float)
    vehicle_name = Column(String)
    claimed_range = Column(Integer)
    waypoints = Column(String) # JSON or simple string representation
    total_distance = Column(Float)
    created_at = Column(DateTime, server_default=func.now())
