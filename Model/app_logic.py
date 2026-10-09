import cv2
import mediapipe as mp
import numpy as np
import time
import mysql.connector

db = mysql.connector.connect(
    host="localhost",
    user="root",
    password="Ash$6385",
    database="cctv_surveillance"
)
cursor = db.cursor()

# --- 1. SETUP MEDIAPIPE FOR MULTI-PERSON ---
BaseOptions = mp.tasks.BaseOptions
PoseLandmarker = mp.tasks.vision.PoseLandmarker
PoseLandmarkerOptions = mp.tasks.vision.PoseLandmarkerOptions
VisionRunningMode = mp.tasks.vision.RunningMode

options = PoseLandmarkerOptions(
    base_options=BaseOptions(model_asset_path='pose_landmarker_full.task'),
    running_mode=VisionRunningMode.VIDEO,
    num_poses=5,
    min_pose_detection_confidence=0.3
)

POSE_CONNECTIONS = frozenset([
    (0, 1), (1, 2), (2, 3), (3, 7), (0, 4), (4, 5), (5, 6), (6, 8),
    (9, 10), (11, 12), (11, 13), (13, 15), (15, 17), (15, 19), (15, 21),
    (17, 19), (12, 14), (14, 16), (16, 18), (16, 20), (16, 22), (18, 20),
    (11, 23), (12, 24), (23, 24), (23, 25), (24, 26), (25, 27), (26, 28),
    (27, 29), (28, 30), (29, 31), (30, 32), (27, 31), (28, 32)
])

# --- 2. GLOBAL STATE ---
status_history = {}
CONFIRMATION_FRAMES = 15        # only for SUSPICIOUS / NORMAL smoothing

# Two separate save timers:
# DANGEROUS: saves every 2s (fast alert, no spam)
# SUSPICIOUS / NORMAL: saves every 5s as before
last_danger_save_time = {}
last_normal_save_time = {}

prev_frame_time = 0
prev_landmarks_map = {}


def calculate_velocity(current_landmarks, prev_landmarks, fps):
    if not prev_landmarks:
        return 0.0
    curr_hip_x = (current_landmarks[23].x + current_landmarks[24].x) / 2
    curr_hip_y = (current_landmarks[23].y + current_landmarks[24].y) / 2
    prev_hip_x = (prev_landmarks[23].x + prev_landmarks[24].x) / 2
    prev_hip_y = (prev_landmarks[23].y + prev_landmarks[24].y) / 2
    distance = np.sqrt((curr_hip_x - prev_hip_x)**2 + (curr_hip_y - prev_hip_y)**2)
    velocity = distance * fps * 100
    return velocity


def analyze_threat_level(landmarks, velocity, num_people):
    r_wrist = landmarks[16]
    l_wrist = landmarks[15]
    nose    = landmarks[0]
    is_hands_up = (r_wrist.y < nose.y) or (l_wrist.y < nose.y)

    if is_hands_up:
        return "DANGEROUS", "Fighting/Arms Raised"

    if velocity > 30:
        if num_people > 1:
            return "DANGEROUS", "Panic/Scattering"
        else:
            return "SUSPICIOUS", "Running"

    return "NORMAL", "Walking/Standing"


def get_reason_for_status(status):
    if status == "DANGEROUS":
        return "Fighting/Arms Raised"
    elif status == "SUSPICIOUS":
        return "Running"
    return "Walking/Standing"


def draw_skeleton(image, landmarks, color):
    h, w, c = image.shape
    for landmark in landmarks:
        cx, cy = int(landmark.x * w), int(landmark.y * h)
        cv2.circle(image, (cx, cy), 4, color, -1)
    for connection in POSE_CONNECTIONS:
        start_idx = connection[0]
        end_idx   = connection[1]
        start_point = (int(landmarks[start_idx].x * w), int(landmarks[start_idx].y * h))
        end_point   = (int(landmarks[end_idx].x   * w), int(landmarks[end_idx].y   * h))
        cv2.line(image, start_point, end_point, color, 2)


# --- MAIN LOOP ---
with PoseLandmarker.create_from_options(options) as landmarker:
    cap = cv2.VideoCapture(0)

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        curr_time       = time.time()
        fps             = 1 / (curr_time - prev_frame_time) if prev_frame_time > 0 else 30
        prev_frame_time = curr_time

        mp_image     = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame)
        timestamp_ms = int(cap.get(cv2.CAP_PROP_POS_MSEC))

        result       = landmarker.detect_for_video(mp_image, timestamp_ms)
        output_frame = frame.copy()

        if result.pose_landmarks:
            num_people = sum(
                1 for lm in result.pose_landmarks
                if lm[0].visibility > 0.5
            )
            if num_people == 0:
                num_people = 1

            for i, landmarks in enumerate(result.pose_landmarks):

                # 1. Velocity
                prev_lm  = prev_landmarks_map.get(i)
                velocity = calculate_velocity(landmarks, prev_lm, fps)
                prev_landmarks_map[i] = landmarks

                # 2. Raw classification (same logic as original)
                status, reason = analyze_threat_level(landmarks, velocity, num_people)

                # ── KEY CHANGE ──────────────────────────────────────────────────
                # DANGEROUS → NO smoothing, NO waiting → detect and save instantly
                # SUSPICIOUS / NORMAL → keep 15-frame smoothing to avoid flicker
                # ────────────────────────────────────────────────────────────────

                if status == "DANGEROUS":
                    confirmed_status = "DANGEROUS"
                    confirmed_reason = reason

                    # Save to DB every 2 seconds to avoid flooding the table
                    # Frontend polls every 5s so user gets alert within 5s max
                    if curr_time - last_danger_save_time.get(i, 0) >= 2.0:
                        sql = "INSERT INTO anomaly_events (event_type, reason, num_people) VALUES (%s, %s, %s)"
                        cursor.execute(sql, (confirmed_status, confirmed_reason, num_people))
                        db.commit()
                        last_danger_save_time[i] = curr_time
                        print(f"[DANGER SAVED] person={i} | {confirmed_reason} | people={num_people}")

                else:
                    # SUSPICIOUS / NORMAL — smooth over 15 frames to avoid flicker
                    if i not in status_history:
                        status_history[i] = []
                    status_history[i].append(status)
                    if len(status_history[i]) > CONFIRMATION_FRAMES:
                        status_history[i].pop(0)

                    confirmed_status = max(set(status_history[i]), key=status_history[i].count)
                    confirmed_reason = get_reason_for_status(confirmed_status)

                    # Save every 5 seconds
                    if curr_time - last_normal_save_time.get(i, 0) >= 5.0:
                        sql = "INSERT INTO anomaly_events (event_type, reason, num_people) VALUES (%s, %s, %s)"
                        cursor.execute(sql, (confirmed_status, confirmed_reason, num_people))
                        db.commit()
                        last_normal_save_time[i] = curr_time

                # 3. Color
                if confirmed_status == "DANGEROUS":
                    color = (0, 0, 255)       # Red
                elif confirmed_status == "SUSPICIOUS":
                    color = (0, 165, 255)     # Orange
                else:
                    color = (0, 255, 0)       # Green

                # 4. Draw skeleton
                draw_skeleton(output_frame, landmarks, color)

                # 5. Label above head
                nose_x = int(landmarks[0].x * output_frame.shape[1])
                nose_y = int(landmarks[0].y * output_frame.shape[0])
                cv2.putText(
                    output_frame,
                    f"{confirmed_status}: {confirmed_reason}",
                    (nose_x - 50, nose_y - 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2
                )

        cv2.imshow('CCTV Analytics - Research MVP', output_frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    cursor.close()
    db.close()