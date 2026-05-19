import os
import io
import cv2
import json
import requests
import numpy as np
import xml.etree.ElementTree as ET

from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List

from PIL import Image
from dotenv import load_dotenv

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

load_dotenv()

app = FastAPI(title="Solar AquaWatch AX AI Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================
# Environment
# =============================

KMA_SERVICE_KEY = os.getenv("KMA_SERVICE_KEY", "")
DEFAULT_NX = int(os.getenv("DEFAULT_NX", "89"))
DEFAULT_NY = int(os.getenv("DEFAULT_NY", "90"))

KWATER_API_URL = os.getenv(
    "KWATER_API_URL",
    "http://apis.data.go.kr/B500001/dam/excllncobsrvt/hourwal/hourwallist"
)
KWATER_SERVICE_KEY = os.getenv("KWATER_SERVICE_KEY", "")
KWATER_DAMCODE = os.getenv("KWATER_DAMCODE", "1012110")
KWATER_WAL = os.getenv("KWATER_WAL", "1010640")


# =============================
# Common Utils
# =============================

def clamp(value: int, min_value: int = 0, max_value: int = 100) -> int:
    return max(min_value, min(max_value, value))


def status_from_level(water_level: int) -> str:
    if water_level < 60:
        return "NORMAL"
    if water_level < 80:
        return "WARNING"
    return "DANGER"


def interval_rule(status: str, solar_prediction: str, battery_level: int = 70) -> int:
    if status == "DANGER":
        return 5
    if battery_level < 20:
        return 60
    if solar_prediction == "HIGH" and battery_level >= 60:
        return 5
    if solar_prediction == "MEDIUM" and battery_level >= 30:
        return 15
    return 60


def safe_float(value):
    try:
        if value is None or value == "":
            return None
        return float(value)
    except Exception:
        return None


def normalize_items(items):
    """
    공공데이터 응답 item이 dict / list / None 으로 흔들리는 경우 처리.
    """
    if items is None:
        return []
    if isinstance(items, list):
        return items
    if isinstance(items, dict):
        return [items]
    return []


# =============================
# 1. OpenCV Water Level Analysis
# =============================

def read_image_from_upload(file_bytes: bytes) -> np.ndarray:
    image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    img = np.array(image)
    img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
    return img


def analyze_water_level_opencv(img: np.ndarray) -> Dict[str, Any]:
    """
    MVP용 OpenCV 수위 분석.
    이미지 중앙 영역에서 수평 경계선을 찾아 수위 추정.
    """
    h, w, _ = img.shape

    x1 = int(w * 0.25)
    x2 = int(w * 0.75)
    y1 = int(h * 0.15)
    y2 = int(h * 0.90)

    roi = img[y1:y2, x1:x2]
    roi_h, roi_w, _ = roi.shape

    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (7, 7), 0)

    sobel_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    score = np.abs(sobel_y).mean(axis=1)

    top_ignore = int(roi_h * 0.18)
    bottom_ignore = int(roi_h * 0.10)
    valid = score[top_ignore: roi_h - bottom_ignore]

    if valid.size == 0 or float(valid.max()) < 3.0:
        water_level = 35
        confidence = 0.45
        detected = False
    else:
        local_y = int(np.argmax(valid)) + top_ignore

        water_level = int((1 - local_y / roi_h) * 100)
        water_level = clamp(water_level)

        confidence = min(0.92, max(0.55, float(valid.max()) / 25.0))
        confidence = round(confidence, 2)
        detected = True

    return {
        "waterLevel": water_level,
        "status": status_from_level(water_level),
        "riskScoreBase": water_level,
        "confidence": confidence,
        "opencvDetected": detected
    }


# =============================
# 2. KMA Weather API
# =============================

def get_kma_base_time() -> tuple[str, str]:
    """
    기상청 단기예보 base_time:
    0200, 0500, 0800, 1100, 1400, 1700, 2000, 2300.
    현재보다 3시간 전 발표시각 사용.
    """
    now = datetime.now() - timedelta(hours=3)
    base_date = now.strftime("%Y%m%d")

    base_hours = [2, 5, 8, 11, 14, 17, 20, 23]
    hour = now.hour
    selected = max([h for h in base_hours if h <= hour], default=23)

    if selected == 23 and hour < 2:
        base_date = (now - timedelta(days=1)).strftime("%Y%m%d")

    base_time = f"{selected:02d}00"
    return base_date, base_time


def fetch_weather_forecast(nx: int, ny: int) -> Dict[str, Any]:
    if not KMA_SERVICE_KEY:
        return {
            "available": False,
            "source": "기상청 단기예보 조회서비스",
            "reason": "KMA_SERVICE_KEY 없음",
            "sky": None,
            "pty": None,
            "pop": None
        }

    base_date, base_time = get_kma_base_time()

    url = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst"

    params = {
        "serviceKey": KMA_SERVICE_KEY,
        "pageNo": 1,
        "numOfRows": 1000,
        "dataType": "JSON",
        "base_date": base_date,
        "base_time": base_time,
        "nx": nx,
        "ny": ny,
    }

    try:
        res = requests.get(url, params=params, timeout=7)
        data = res.json()

        items = (
            data.get("response", {})
                .get("body", {})
                .get("items", {})
                .get("item", [])
        )

        sky = None
        pty = None
        pop = None

        for item in items:
            category = item.get("category")
            value = item.get("fcstValue")

            if category == "SKY" and sky is None:
                sky = value
            elif category == "PTY" and pty is None:
                pty = value
            elif category == "POP" and pop is None:
                pop = value

        return {
            "available": True,
            "source": "기상청 단기예보 조회서비스",
            "baseDate": base_date,
            "baseTime": base_time,
            "sky": sky,
            "pty": pty,
            "pop": pop
        }

    except Exception as e:
        return {
            "available": False,
            "source": "기상청 단기예보 조회서비스",
            "reason": str(e),
            "sky": None,
            "pty": None,
            "pop": None
        }


def calculate_solar_prediction(weather: Dict[str, Any]) -> str:
    """
    SKY:
    1 맑음, 3 구름많음, 4 흐림

    PTY:
    0 없음, 1 비, 2 비/눈, 3 눈, 4 소나기

    POP:
    강수확률
    """
    now_hour = datetime.now().hour
    is_daytime = 7 <= now_hour <= 18

    if not is_daytime:
        return "LOW"

    if not weather.get("available"):
        return "MEDIUM"

    sky = str(weather.get("sky"))
    pty = str(weather.get("pty"))
    pop_raw = weather.get("pop")

    try:
        pop = int(pop_raw) if pop_raw is not None else 0
    except ValueError:
        pop = 0

    if pty and pty != "0" and pty != "None":
        return "LOW"

    if sky == "1" and pop < 30:
        return "HIGH"

    if sky in ["3", "4"] or pop >= 30:
        return "MEDIUM"

    return "MEDIUM"


# =============================
# 3. K-water API
# =============================

def fetch_kwater_observation() -> Dict[str, Any]:
    """
    K-water 수위 시강우량 조회.

    endpoint:
    http://apis.data.go.kr/B500001/dam/excllncobsrvt/hourwal/hourwallist

    required params:
    sdate, stime, edate, etime, damcode, wal, pageNo, numOfRows, _type, serviceKey

    response:
    flux = 수위(EL.m)
    hourwal = 우량(mm)
    obsrdt = 관측시각
    """
    if not KWATER_API_URL or not KWATER_SERVICE_KEY:
        return {
            "available": False,
            "source": "한국수자원공사 우량수위 관측소 운영 정보",
            "rainfall": None,
            "waterLevel": None,
            "flow": None,
            "reason": "KWATER_API_URL 또는 KWATER_SERVICE_KEY 없음"
        }

    now = datetime.now()

    sdate = now.strftime("%Y-%m-%d")
    edate = now.strftime("%Y-%m-%d")
    stime = "00"
    etime = now.strftime("%H")

    # 현재 시간이 00시면 etime이 00이라 데이터가 없을 수 있음
    if etime == "00":
        yesterday = now - timedelta(days=1)
        sdate = yesterday.strftime("%Y-%m-%d")
        edate = yesterday.strftime("%Y-%m-%d")
        stime = "00"
        etime = "23"

    params = {
        "serviceKey": KWATER_SERVICE_KEY,
        "numOfRows": 10,
        "pageNo": 1,
        "_type": "json",
        "sdate": sdate,
        "stime": stime,
        "edate": edate,
        "etime": etime,
        "damcode": KWATER_DAMCODE,
        "wal": KWATER_WAL,
    }

    try:
        res = requests.get(KWATER_API_URL, params=params, timeout=10)
        text = res.text.strip()

        if not text:
            return {
                "available": False,
                "source": "한국수자원공사 우량수위 관측소 운영 정보",
                "rainfall": None,
                "waterLevel": None,
                "flow": None,
                "reason": "K-water 빈 응답",
                "requestUrl": res.url
            }

        # 공공데이터포털 인증/서비스 에러는 XML로 내려오는 경우가 많음
        if text.startswith("<OpenAPI_ServiceResponse"):
            root = ET.fromstring(text)
            msg = root.findtext(".//returnAuthMsg") or "OpenAPI_SERVICE_ERROR"
            code = root.findtext(".//returnReasonCode") or "UNKNOWN"
            return {
                "available": False,
                "source": "한국수자원공사 우량수위 관측소 운영 정보",
                "rainfall": None,
                "waterLevel": None,
                "flow": None,
                "reason": f"{msg} ({code})",
                "requestUrl": res.url
            }

        # JSON 우선
        try:
            data = res.json()

            response = data.get("response", {})
            header = response.get("header", {})
            body = response.get("body", {})

            result_code = str(header.get("resultCode", ""))
            result_msg = header.get("resultMsg", "")

            if result_code and result_code != "00":
                return {
                    "available": False,
                    "source": "한국수자원공사 우량수위 관측소 운영 정보",
                    "rainfall": None,
                    "waterLevel": None,
                    "flow": None,
                    "reason": f"{result_msg} ({result_code})",
                    "requestUrl": res.url
                }

            items = body.get("items", {})
            item_list = normalize_items(items.get("item") if isinstance(items, dict) else items)

            if not item_list:
                return {
                    "available": False,
                    "source": "한국수자원공사 우량수위 관측소 운영 정보",
                    "rainfall": None,
                    "waterLevel": None,
                    "flow": None,
                    "reason": "K-water 응답에 item 없음",
                    "requestUrl": res.url,
                    "raw": data
                }

            latest = item_list[0]

            rainfall = safe_float(latest.get("hourwal"))
            water_level = safe_float(latest.get("flux"))
            observed_at = latest.get("obsrdt")

            return {
                "available": True,
                "source": "한국수자원공사 우량수위 관측소 운영 정보",
                "rainfall": rainfall,
                "waterLevel": water_level,
                "flow": None,
                "observedAt": observed_at,
                "damcode": KWATER_DAMCODE,
                "wal": KWATER_WAL,
                "rawType": "json"
            }

        except Exception:
            # JSON 실패 시 XML fallback
            root = ET.fromstring(text)

            result_code = root.findtext(".//resultCode")
            result_msg = root.findtext(".//resultMsg")

            if result_code and result_code != "00":
                return {
                    "available": False,
                    "source": "한국수자원공사 우량수위 관측소 운영 정보",
                    "rainfall": None,
                    "waterLevel": None,
                    "flow": None,
                    "reason": f"{result_msg} ({result_code})",
                    "requestUrl": res.url
                }

            item = root.find(".//item")
            if item is None:
                return {
                    "available": False,
                    "source": "한국수자원공사 우량수위 관측소 운영 정보",
                    "rainfall": None,
                    "waterLevel": None,
                    "flow": None,
                    "reason": "K-water XML 응답에 item 없음",
                    "requestUrl": res.url
                }

            rainfall = safe_float(item.findtext("hourwal"))
            water_level = safe_float(item.findtext("flux"))
            observed_at = item.findtext("obsrdt")

            return {
                "available": True,
                "source": "한국수자원공사 우량수위 관측소 운영 정보",
                "rainfall": rainfall,
                "waterLevel": water_level,
                "flow": None,
                "observedAt": observed_at,
                "damcode": KWATER_DAMCODE,
                "wal": KWATER_WAL,
                "rawType": "xml"
            }

    except Exception as e:
        return {
            "available": False,
            "source": "한국수자원공사 우량수위 관측소 운영 정보",
            "rainfall": None,
            "waterLevel": None,
            "flow": None,
            "reason": str(e)
        }


# =============================
# 4. Rule Engine
# =============================

def calculate_risk_score(
    image_result: Dict[str, Any],
    solar_prediction: str,
    kwater: Dict[str, Any]
) -> int:
    score = int(image_result["riskScoreBase"])

    if solar_prediction == "LOW":
        score += 5

    rainfall = kwater.get("rainfall")
    if isinstance(rainfall, (int, float)):
        if rainfall >= 10:
            score += 10
        if rainfall >= 30:
            score += 20

    return clamp(score)


def build_reason(
    status: str,
    image_result: Dict[str, Any],
    solar_prediction: str,
    kwater: Dict[str, Any]
) -> str:
    parts: List[str] = []

    if status == "NORMAL":
        parts.append("이미지 분석 결과 수위가 정상 범위입니다.")
    elif status == "WARNING":
        parts.append("이미지 분석 결과 수위가 주의 구간에 진입했습니다.")
    else:
        parts.append("이미지 분석 결과 수위가 위험 구간에 도달했습니다.")

    if solar_prediction == "HIGH":
        parts.append("기상 조건상 태양광 발전 가능량은 높은 편입니다.")
    elif solar_prediction == "MEDIUM":
        parts.append("기상 조건상 태양광 발전 가능량은 보통 수준입니다.")
    else:
        parts.append("야간·강수·흐림 조건으로 태양광 발전 가능량이 낮습니다.")

    if kwater.get("available"):
        rainfall = kwater.get("rainfall")
        water_level = kwater.get("waterLevel")
        observed_at = kwater.get("observedAt")

        detail = "K-water 우량·수위 관측 데이터를 위험도 산정에 반영했습니다."

        if water_level is not None:
            detail += f" 관측 수위는 {water_level}m입니다."
        if rainfall is not None:
            detail += f" 시간우량은 {rainfall}mm입니다."
        if observed_at:
            detail += f" 관측시각은 {observed_at}입니다."

        parts.append(detail)
    else:
        parts.append("K-water 관측 데이터는 현재 연결되지 않아 이미지 분석 중심으로 판단했습니다.")

    return " ".join(parts)


def build_action(status: str, recommended_interval: int) -> str:
    if status == "NORMAL":
        return f"정상 모니터링을 유지하고 촬영 주기를 {recommended_interval}분으로 운영하세요."
    if status == "WARNING":
        return f"촬영 주기를 {recommended_interval}분으로 단축하고 수위 변화를 확인하세요."
    return f"촬영 주기를 {recommended_interval}분으로 단축하고 즉시 현장 점검을 진행하세요."


# =============================
# API
# =============================

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "Solar AquaWatch AX AI Server",
        "kmaConfigured": bool(KMA_SERVICE_KEY),
        "kwaterConfigured": bool(KWATER_API_URL and KWATER_SERVICE_KEY),
    }


@app.get("/debug/weather")
def debug_weather():
    return fetch_weather_forecast(DEFAULT_NX, DEFAULT_NY)


@app.get("/debug/kwater")
def debug_kwater():
    return fetch_kwater_observation()


@app.post("/ai/analyze-water-level")
async def analyze_water_level(
    file: UploadFile = File(...),
    nx: Optional[int] = Form(None),
    ny: Optional[int] = Form(None),
    batteryLevel: Optional[int] = Form(70)
):
    file_bytes = await file.read()

    try:
        img = read_image_from_upload(file_bytes)
    except Exception:
        return JSONResponse(
            status_code=400,
            content={
                "error": "INVALID_IMAGE",
                "message": "이미지 파일을 읽을 수 없습니다."
            }
        )

    image_result = analyze_water_level_opencv(img)

    nx_final = nx if nx is not None and nx > 0 else DEFAULT_NX
    ny_final = ny if ny is not None and ny > 0 else DEFAULT_NY

    weather = fetch_weather_forecast(nx=nx_final, ny=ny_final)
    solar_prediction = calculate_solar_prediction(weather)

    kwater = fetch_kwater_observation()

    risk_score = calculate_risk_score(
        image_result=image_result,
        solar_prediction=solar_prediction,
        kwater=kwater
    )

    status = status_from_level(risk_score)

    recommended_interval = interval_rule(
        status=status,
        solar_prediction=solar_prediction,
        battery_level=batteryLevel or 70
    )

    reason = build_reason(
        status=status,
        image_result=image_result,
        solar_prediction=solar_prediction,
        kwater=kwater
    )

    recommended_action = build_action(status, recommended_interval)

    return {
        "waterLevel": image_result["waterLevel"],
        "status": status,
        "riskScore": risk_score,
        "confidence": image_result["confidence"],
        "solarPrediction": solar_prediction,
        "recommendedInterval": recommended_interval,
        "reason": reason,
        "recommendedAction": recommended_action,
        "debug": {
            "opencvDetected": image_result["opencvDetected"],
            "weather": weather,
            "kwater": kwater
        },
        "dataSources": [
            "기상청 단기예보 조회서비스",
            "한국수자원공사 우량수위 관측소 운영 정보"
        ]
    }