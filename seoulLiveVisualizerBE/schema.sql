CREATE DATABASE IF NOT EXISTS seoul_city_data DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE seoul_city_data;

-- 1. 장소 기본 정보 테이블 (Tracked Places)
-- 서울시 실시간 도시데이터에서 제공하는 주요 핫스팟/장소 목록
CREATE TABLE IF NOT EXISTS places (
    place_id INT AUTO_INCREMENT PRIMARY KEY,
    area_cd VARCHAR(20) UNIQUE NOT NULL,      -- 예: 'POI014' (강남역), 'POI001' (광화문)
    area_nm VARCHAR(50) NOT NULL,             -- 예: '강남역', '홍대입구역'
    gu_name VARCHAR(50),
    dong_name VARCHAR(50),
    lat DOUBLE,
    lng DOUBLE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. 실시간 인구 및 연령대 비율 이력 테이블 (Demographics & Population History)
-- 실시간 인구 정보 및 10대~70대 비율 적재 (라인 차트 및 대시보드 시각화용)
CREATE TABLE IF NOT EXISTS population_history (
    history_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    place_id INT NOT NULL,
    congest_lvl VARCHAR(20) NOT NULL,         -- 여유, 보통, 약간 붐빔, 붐빔 (AREA_CONGEST_LVL)
    congest_msg TEXT,                         -- 혼잡도 메시지 (AREA_CONGEST_MSG)
    ppltn_min INT NOT NULL,                   -- 실시간 인구 최소값 (AREA_PPLTN_MIN)
    ppltn_max INT NOT NULL,                   -- 실시간 인구 최대값 (AREA_PPLTN_MAX)
    ppltn_rate_10 FLOAT NOT NULL,             -- 10대 실시간 인구 비율 (PPLTN_RATE_10)
    ppltn_rate_20 FLOAT NOT NULL,             -- 20대 실시간 인구 비율 (PPLTN_RATE_20)
    ppltn_rate_30 FLOAT NOT NULL,             -- 30대 실시간 인구 비율 (PPLTN_RATE_30)
    ppltn_rate_40 FLOAT NOT NULL,             -- 40대 실시간 인구 비율 (PPLTN_RATE_40)
    ppltn_rate_50 FLOAT NOT NULL,             -- 50대 실시간 인구 비율 (PPLTN_RATE_50)
    ppltn_rate_60 FLOAT NOT NULL,             -- 60대 실시간 인구 비율 (PPLTN_RATE_60)
    ppltn_rate_70 FLOAT NOT NULL,             -- 70대 실시간 인구 비율 (PPLTN_RATE_70)
    male_ppltn_rate FLOAT,                    -- 남성 실시간 인구 비율 (MALE_PPLTN_RATE)
    female_ppltn_rate FLOAT,                  -- 여성 실시간 인구 비율 (FEMALE_PPLTN_RATE)
    fcst_ppltn_min INT,                       -- 예측 실시간 인구 지표 최소값 (FCST_PPLTN_MIN)
    fcst_ppltn_max INT,                       -- 예측 실시간 인구 지표 최대값 (FCST_PPLTN_MAX)
    ppltn_time DATETIME NOT NULL,             -- 실시간 인구 데이터 업데이트 시간 (PPLTN_TIME)
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (place_id) REFERENCES places(place_id) ON DELETE CASCADE,
    UNIQUE KEY uq_place_ppltn_time (place_id, ppltn_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 실시간 대중교통 승하차 정보 테이블 (Subway & Bus Traffic)
-- 실시간 지하철 및 버스 이용객 수 적재
CREATE TABLE IF NOT EXISTS transit_traffic (
    traffic_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    place_id INT NOT NULL,
    sub_ppltn_min INT,                        -- 실시간 지하철 승하차 인원 최소 (SUB_30WTHN_GTON/GTOFF 합산 등)
    sub_ppltn_max INT,                        -- 실시간 지하철 승하차 인원 최대
    bus_ppltn_min INT,                        -- 실시간 버스 승하차 인원 최소 (BUS_30WTHN_GTON/GTOFF 합산 등)
    bus_ppltn_max INT,                        -- 실시간 버스 승하차 인원 최대
    traffic_time DATETIME NOT NULL,           -- 대중교통 데이터 업데이트 시간
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (place_id) REFERENCES places(place_id) ON DELETE CASCADE,
    UNIQUE KEY uq_place_traffic_time (place_id, traffic_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. 정류소 좌표 테이블 (Bus & Subway Stations - 지도 기반 히트맵용)
-- 히트맵 좌표 렌더링에 사용되는 장소 내 대중교통 정류소 정보
CREATE TABLE IF NOT EXISTS station_coordinates (
    station_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    place_id INT NOT NULL,
    station_type VARCHAR(10) NOT NULL,        -- 'BUS' 또는 'SUBWAY'
    station_nm VARCHAR(100) NOT NULL,         -- 정류소/역 이름 (BUS_STN_NM / SUB_STN_NM)
    station_x DOUBLE NOT NULL,                 -- 경도 X 좌표 (BUS_STN_X / SUB_STN_X)
    station_y DOUBLE NOT NULL,                 -- 위도 Y 좌표 (BUS_STN_Y / SUB_STN_Y)
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (place_id) REFERENCES places(place_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. 실시간 날씨 현황 테이블 (Weather History)
CREATE TABLE IF NOT EXISTS weather_history (
    weather_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    place_id INT NOT NULL,
    weather_time DATETIME NOT NULL,           -- 날씨 관측 시간
    temp FLOAT NOT NULL,                       -- 기온 (TEMP)
    precipitation FLOAT DEFAULT 0.0,           -- 강수량 (PRECIPITATION)
    weather_stts VARCHAR(50),                  -- 날씨 현황 (WEATHER_STTS - 예: '맑음', '흐림', '비')
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (place_id) REFERENCES places(place_id) ON DELETE CASCADE,
    UNIQUE KEY uq_place_weather_time (place_id, weather_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. 실시간 상권 및 결제 현황 테이블 (Commercial & Payment Stats)
CREATE TABLE IF NOT EXISTS commercial_activity (
    commercial_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    place_id INT NOT NULL,
    area_cmrcl_lvl VARCHAR(50),               -- 장소 실시간 상권 현황 (AREA_CMRCL_LVL)
    area_sh_payment_cnt INT,                  -- 장소 실시간 신한카드 결제 건수 (AREA_SH_PAYMENT_CNT)
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (place_id) REFERENCES places(place_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 초기 장소 데이터 삽입 (예시 핫스팟 5곳)
-- ==========================================
INSERT INTO places (area_cd, area_nm) VALUES
    ('POI001', '강남 MICE 관광특구'),
    ('POI002', '동대문 관광특구'),
    ('POI003', '명동 관광특구'),
    ('POI004', '이태원 관광특구'),
    ('POI005', '잠실 관광특구'),
    ('POI006', '종로·청계 관광특구'),
    ('POI007', '홍대 관광특구'),
    ('POI008', '경복궁'),
    ('POI009', '광화문·덕수궁'),
    ('POI010', '보신각'),
    ('POI011', '서울 암사동 유적'),
    ('POI012', '창덕궁·종묘'),
    ('POI013', '가산디지털단지역'),
    ('POI014', '강남역'),
    ('POI015', '건대입구역'),
    ('POI016', '고덕역'),
    ('POI017', '고속터미널역'),
    ('POI018', '교대역'),
    ('POI019', '구로디지털단지역'),
    ('POI020', '구로역'),
    ('POI021', '군자역'),
    ('POI023', '대림역'),
    ('POI024', '동대문역'),
    ('POI025', '뚝섬역'),
    ('POI026', '미아사거리역'),
    ('POI027', '발산역'),
    ('POI029', '사당역'),
    ('POI030', '삼각지역'),
    ('POI031', '서울대입구역'),
    ('POI032', '서울식물원·마곡나루역'),
    ('POI033', '서울역'),
    ('POI034', '선릉역'),
    ('POI035', '성신여대입구역'),
    ('POI036', '수유역'),
    ('POI037', '신논현역·논현역'),
    ('POI038', '신도림역'),
    ('POI039', '신림역'),
    ('POI040', '신촌·이대역'),
    ('POI041', '양재역'),
    ('POI042', '역삼역'),
    ('POI043', '연신내역'),
    ('POI044', '오목교역·목동운동장'),
    ('POI045', '왕십리역'),
    ('POI046', '용산역'),
    ('POI047', '이태원역'),
    ('POI048', '장지역'),
    ('POI049', '장한평역'),
    ('POI050', '천호역'),
    ('POI051', '총신대입구(이수)역'),
    ('POI052', '충정로역'),
    ('POI053', '합정역'),
    ('POI054', '혜화역'),
    ('POI055', '홍대입구역(2호선)'),
    ('POI056', '회기역'),
    ('POI058', '가락시장'),
    ('POI059', '가로수길'),
    ('POI060', '광장(전통)시장'),
    ('POI061', '김포공항'),
    ('POI063', '노량진'),
    ('POI064', '덕수궁길·정동길'),
    ('POI066', '북촌한옥마을'),
    ('POI067', '서촌'),
    ('POI068', '성수카페거리'),
    ('POI070', '쌍문역'),
    ('POI071', '압구정로데오거리'),
    ('POI072', '여의도'),
    ('POI073', '연남동'),
    ('POI074', '영등포 타임스퀘어'),
    ('POI076', '용리단길'),
    ('POI077', '이태원 앤틱가구거리'),
    ('POI078', '인사동'),
    ('POI079', '창동 신경제 중심지'),
    ('POI080', '청담동 명품거리'),
    ('POI081', '청량리 제기동 일대 전통시장'),
    ('POI082', '해방촌·경리단길'),
    ('POI083', 'DDP(동대문디자인플라자)'),
    ('POI084', 'DMC(디지털미디어시티)'),
    ('POI085', '강서한강공원'),
    ('POI086', '고척돔'),
    ('POI087', '광나루한강공원'),
    ('POI088', '광화문광장'),
    ('POI089', '국립중앙박물관·용산가족공원'),
    ('POI090', '난지한강공원'),
    ('POI091', '남산공원'),
    ('POI092', '노들섬'),
    ('POI093', '뚝섬한강공원'),
    ('POI094', '망원한강공원'),
    ('POI095', '반포한강공원'),
    ('POI096', '북서울꿈의숲'),
    ('POI098', '서리풀공원·몽마르뜨공원'),
    ('POI100', '서울대공원'),
    ('POI101', '서울숲공원'),
    ('POI102', '아차산'),
    ('POI103', '양화한강공원'),
    ('POI104', '어린이대공원'),
    ('POI105', '여의도한강공원'),
    ('POI106', '월드컵공원'),
    ('POI107', '응봉산'),
    ('POI108', '이촌한강공원'),
    ('POI109', '잠실종합운동장'),
    ('POI110', '잠실한강공원'),
    ('POI111', '잠원한강공원'),
    ('POI112', '청계산'),
    ('POI114', '북창동 먹자골목'),
    ('POI115', '남대문시장'),
    ('POI116', '익선동'),
    ('POI117', '신정네거리역'),
    ('POI118', '잠실새내역'),
    ('POI119', '잠실역'),
    ('POI120', '잠실롯데타워·석촌호수'),
    ('POI121', '송리단길·호수단길'),
    ('POI122', '신촌 스타광장'),
    ('POI123', '보라매공원'),
    ('POI124', '서대문독립공원'),
    ('POI125', '안양천'),
    ('POI126', '여의서로'),
    ('POI127', '올림픽공원'),
    ('POI128', '홍제폭포'),
    ('POI129', '송현녹지광장'),
    ('POI130', '시의회 앞'),
    ('POI131', '숭례문')
ON DUPLICATE KEY UPDATE area_nm = VALUES(area_nm);