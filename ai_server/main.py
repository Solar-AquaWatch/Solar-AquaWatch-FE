import os
import io
import cv2
import json
import shutil
import tempfile
import requests
import numpy as np
import xml.etree.ElementTree as ET

from datetime import datetime, timedelta
from pathlib import Path
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

AIHUB_MODEL_DIR = Path(os.getenv(
    "AIHUB_MODEL_DIR",
    Path(__file__).resolve().parents[1] / "data" / "aihub" / "Solar_AquaWatch_AIHub_YOLO_개인전달용"
))
YOLO_CFG_PATH = Path(os.getenv("YOLO_CFG_PATH", AIHUB_MODEL_DIR / "all_yolov4.cfg"))
YOLO_WEIGHTS_PATH = Path(os.getenv("YOLO_WEIGHTS_PATH", AIHUB_MODEL_DIR / "all_yolov4_final.weights"))
YOLO_NAMES_PATH = Path(os.getenv("YOLO_NAMES_PATH", AIHUB_MODEL_DIR / "all.names"))
YOLO_CONF_THRESHOLD = float(os.getenv("YOLO_CONF_THRESHOLD", "0.35"))
YOLO_NMS_THRESHOLD = float(os.getenv("YOLO_NMS_THRESHOLD", "0.45"))
GAUGE_MAX_WATER_LEVEL_M = float(os.getenv("GAUGE_MAX_WATER_LEVEL_M", "1.0"))

_YOLO_MODEL = None


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
# 1-1. AI Hub YOLO Gauge Reading
# =============================

def prepare_yolo_model_paths() -> Dict[str, Any]:
    cache_dir = Path(os.getenv(
        "AIHUB_MODEL_CACHE_DIR",
        Path(tempfile.gettempdir()) / "solar_aquawatch_aihub_yolo"
    ))

    sources = {
        "cfg": YOLO_CFG_PATH,
        "weights": YOLO_WEIGHTS_PATH,
        "names": YOLO_NAMES_PATH,
    }
    filenames = {
        "cfg": "all_yolov4.cfg",
        "weights": "all_yolov4_final.weights",
        "names": "all.names",
    }

    missing = [str(path) for path in sources.values() if not path.exists()]
    if missing:
        return {
            "available": False,
            "reason": "AI Hub YOLO 모델 파일이 없습니다.",
            "missing": missing,
        }

    try:
        cache_dir.mkdir(parents=True, exist_ok=True)
        cached_paths = {}

        for key, source in sources.items():
            target = cache_dir / filenames[key]
            should_copy = (
                not target.exists()
                or target.stat().st_size != source.stat().st_size
                or int(target.stat().st_mtime) < int(source.stat().st_mtime)
            )
            if should_copy:
                shutil.copy2(source, target)
            cached_paths[key] = target

        return {
            "available": True,
            "cfg": cached_paths["cfg"],
            "weights": cached_paths["weights"],
            "names": cached_paths["names"],
            "cacheDir": str(cache_dir),
        }
    except Exception as e:
        return {
            "available": False,
            "reason": f"AI Hub YOLO 모델 캐시 생성 실패: {e}",
        }

def parse_gauge_label(label: str) -> Optional[float]:
    if label == "surface" or label == "mokja":
        return None
    if label.endswith("M"):
        try:
            return float(label[:-1])
        except ValueError:
            return None
    if label.endswith("CM"):
        try:
            return float(label[:-2]) / 100.0
        except ValueError:
            return None
    return None


def get_yolo_model():
    global _YOLO_MODEL

    if _YOLO_MODEL is not None:
        return _YOLO_MODEL

    prepared = prepare_yolo_model_paths()
    if not prepared.get("available"):
        _YOLO_MODEL = prepared
        return _YOLO_MODEL

    try:
        with open(prepared["names"], "r", encoding="utf-8") as f:
            class_names = [line.strip() for line in f.readlines() if line.strip()]

        net = cv2.dnn.readNetFromDarknet(str(prepared["cfg"]), str(prepared["weights"]))
        net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
        net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)

        layer_names = net.getLayerNames()
        out_layers = [layer_names[i - 1] for i in net.getUnconnectedOutLayers().flatten()]

        _YOLO_MODEL = {
            "available": True,
            "net": net,
            "classNames": class_names,
            "outLayers": out_layers,
            "cacheDir": prepared.get("cacheDir"),
        }
        return _YOLO_MODEL
    except Exception as e:
        _YOLO_MODEL = {
            "available": False,
            "reason": str(e)
        }
        return _YOLO_MODEL


def estimate_observed_water_level(detections: List[Dict[str, Any]]) -> Dict[str, Any]:
    surfaces = [item for item in detections if item["label"] == "surface"]
    marks = []

    for item in detections:
        value = parse_gauge_label(item["label"])
        if value is None:
            continue
        x, y, bw, bh = item["box"]
        marks.append({
            "label": item["label"],
            "value": value,
            "centerY": y + bh / 2,
            "confidence": item["confidence"],
        })

    if not surfaces:
        return {
            "available": False,
            "reason": "surface 감지 없음",
            "detections": detections[:12]
        }

    surface = max(surfaces, key=lambda item: item["confidence"])
    x, y, bw, bh = surface["box"]
    surface_y = y + bh / 2
    surface_confidence = round(float(surface["confidence"]), 2)
    surface_ratio = round(float(surface.get("centerYRatio", surface_y / max(1, surface.get("imageHeight", 1)))), 2)

    if len(marks) < 2:
        return {
            "available": True,
            "reason": "surface 위치값을 AI Hub 관측수위로 사용",
            "observedWaterLevel": surface_ratio,
            "observedWaterLevelText": f"{surface_ratio:.2f}",
            "waterLevelRatio": surface_ratio,
            "surfaceConfidence": surface_confidence,
            "surfaceCenterYRatio": surface_ratio,
            "surfaceBox": surface["box"],
            "referenceMarks": [],
            "detections": detections[:20],
        }

    marks = sorted(marks, key=lambda item: item["centerY"])
    interpolated = None

    for upper, lower in zip(marks, marks[1:]):
        y1 = upper["centerY"]
        y2 = lower["centerY"]

        if min(y1, y2) <= surface_y <= max(y1, y2) and y1 != y2:
            ratio = (surface_y - y1) / (y2 - y1)
            interpolated = upper["value"] + ratio * (lower["value"] - upper["value"])
            break

    if interpolated is None:
        nearest = min(marks, key=lambda item: abs(item["centerY"] - surface_y))
        interpolated = nearest["value"]

    observed_level = round(max(0.0, interpolated), 2)
    water_level_ratio = round(min(1.0, observed_level / max(0.01, GAUGE_MAX_WATER_LEVEL_M)), 2)

    return {
        "available": True,
        "observedWaterLevel": observed_level,
        "observedWaterLevelText": f"{observed_level:.2f}m",
        "waterLevelRatio": water_level_ratio,
        "surfaceConfidence": surface_confidence,
        "surfaceCenterYRatio": surface_ratio,
        "estimatedGaugeMeter": observed_level,
        "estimatedGaugeMeterText": f"{observed_level:.2f}m",
        "surfaceBox": surface["box"],
        "referenceMarks": [
            {
                "label": mark["label"],
                "value": mark["value"],
                "centerY": round(mark["centerY"], 1),
                "confidence": mark["confidence"],
            }
            for mark in marks[:12]
        ],
        "detections": detections[:20],
    }


def analyze_gauge_with_aihub_yolo(img: np.ndarray) -> Dict[str, Any]:
    model = get_yolo_model()
    if not model.get("available"):
        return model

    h, w = img.shape[:2]
    net = model["net"]
    class_names = model["classNames"]

    blob = cv2.dnn.blobFromImage(
        img,
        scalefactor=1 / 255.0,
        size=(512, 512),
        swapRB=True,
        crop=False
    )

    try:
        net.setInput(blob)
        outputs = net.forward(model["outLayers"])
    except Exception as e:
        return {
            "available": False,
            "reason": str(e)
        }

    boxes = []
    confidences = []
    class_ids = []

    for output in outputs:
        for detection in output:
            scores = detection[5:]
            class_id = int(np.argmax(scores))
            confidence = float(scores[class_id])

            if confidence > YOLO_CONF_THRESHOLD:
                cx = int(detection[0] * w)
                cy = int(detection[1] * h)
                bw = int(detection[2] * w)
                bh = int(detection[3] * h)

                x = int(cx - bw / 2)
                y = int(cy - bh / 2)

                boxes.append([x, y, bw, bh])
                confidences.append(confidence)
                class_ids.append(class_id)

    indices = cv2.dnn.NMSBoxes(
        boxes,
        confidences,
        YOLO_CONF_THRESHOLD,
        YOLO_NMS_THRESHOLD
    )

    detections = []

    if len(indices) > 0:
        for i in indices.flatten():
            class_id = class_ids[i]
            label = class_names[class_id] if class_id < len(class_names) else str(class_id)
            detections.append({
                "label": label,
                "confidence": round(confidences[i], 4),
                "box": boxes[i],
                "centerXRatio": round((boxes[i][0] + boxes[i][2] / 2) / max(1, w), 4),
                "centerYRatio": round((boxes[i][1] + boxes[i][3] / 2) / max(1, h), 4),
                "imageHeight": h,
            })

    result = estimate_observed_water_level(detections)
    result["model"] = "AI Hub YOLOv4 수위표 감지 모델"
    return result


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
    kwater: Dict[str, Any],
    gauge_result: Optional[Dict[str, Any]] = None
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

    if gauge_result and gauge_result.get("available"):
        if gauge_result.get("estimatedGaugeMeterText"):
            parts.append(
                f"AI Hub YOLO 모델이 수위표 눈금과 surface를 비교해 "
                f"관측수위를 {gauge_result.get('observedWaterLevelText')}로 산정했습니다."
            )
        else:
            parts.append(
                f"AI Hub YOLO 모델이 이미지에서 surface 위치값을 "
                f"{gauge_result.get('observedWaterLevelText')}로 감지해 수위 산정에 반영했습니다."
            )
    elif gauge_result:
        parts.append(
            "AI Hub YOLO 수위표 모델이 이미지에서 관측수위를 판독하지 못했습니다. "
            "수위표 눈금과 수면선이 함께 보이는 이미지를 사용하면 관측수위가 표시됩니다."
        )

    if kwater.get("available"):
        rainfall = kwater.get("rainfall")
        water_level = kwater.get("waterLevel")
        observed_at = kwater.get("observedAt")

        detail = "K-water 우량·수위 관측 데이터를 위험도 산정에 반영했습니다."

        if water_level is not None:
            detail += f" K-water 관측 수위는 {water_level}m입니다."
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
    yolo_ready = YOLO_CFG_PATH.exists() and YOLO_WEIGHTS_PATH.exists() and YOLO_NAMES_PATH.exists()
    return {
        "status": "ok",
        "service": "Solar AquaWatch AX AI Server",
        "kmaConfigured": bool(KMA_SERVICE_KEY),
        "kwaterConfigured": bool(KWATER_API_URL and KWATER_SERVICE_KEY),
        "aihubYoloConfigured": yolo_ready,
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
    gauge_result = analyze_gauge_with_aihub_yolo(img)

    if gauge_result.get("available") and isinstance(gauge_result.get("waterLevelRatio"), (int, float)):
        aihub_water_level = clamp(round(float(gauge_result["waterLevelRatio"]) * 100))
        image_result["waterLevel"] = aihub_water_level
        image_result["status"] = status_from_level(aihub_water_level)
        image_result["riskScoreBase"] = aihub_water_level
        image_result["confidence"] = float(gauge_result.get("surfaceConfidence", image_result["confidence"]))

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
        kwater=kwater,
        gauge_result=gauge_result
    )

    recommended_action = build_action(status, recommended_interval)

    response = {
        "waterLevel": image_result["waterLevel"],
        "status": status,
        "riskScore": risk_score,
        "confidence": image_result["confidence"],
        "solarPrediction": solar_prediction,
        "recommendedInterval": recommended_interval,
        "observedWaterLevel": gauge_result.get("observedWaterLevel") if gauge_result.get("available") else None,
        "observedWaterLevelText": gauge_result.get("observedWaterLevelText") if gauge_result.get("available") else None,
        "reason": reason,
        "recommendedAction": recommended_action,
        "debug": {
            "opencvDetected": image_result["opencvDetected"],
            "aihubYolo": gauge_result,
            "weather": weather,
            "kwater": kwater
        },
        "dataSources": [
            "AI Hub 수위표 YOLO 모델",
            "기상청 단기예보 조회서비스",
            "한국수자원공사 우량수위 관측소 운영 정보"
        ]
    }

    return response
