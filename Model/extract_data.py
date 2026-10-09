import cv2
import mediapipe as mp
import csv
import os

# --- EXPLICIT FILE LIST ---
FILES_TO_PROCESS = [
    ("walking1.mp4", "NORMAL"), ("walking2.mp4", "NORMAL"), ("walking3.mp4", "NORMAL"),
    ("walking4.mp4", "NORMAL"), ("walking5.mp4", "NORMAL"), ("walking6.mp4", "NORMAL"),
    ("sitting1.mp4", "NORMAL"), ("sitting2.mp4", "NORMAL"),
    ("running1.mp4", "SUSPICIOUS"), ("running2.mp4", "SUSPICIOUS"),
    ("fainting.mp4", "SUSPICIOUS"), ("jumping1.mp4", "SUSPICIOUS"),
    ("fighting1.mp4", "DANGEROUS"), ("fighting2.mp4", "DANGEROUS"), ("fighting3.mp4", "DANGEROUS")
]

DATA_FILE = "training_data.csv"

# --- SETUP MEDIAPIPE OPTIONS ---
BaseOptions = mp.tasks.BaseOptions
PoseLandmarker = mp.tasks.vision.PoseLandmarker
PoseLandmarkerOptions = mp.tasks.vision.PoseLandmarkerOptions
VisionRunningMode = mp.tasks.vision.RunningMode

options = PoseLandmarkerOptions(
    base_options=BaseOptions(model_asset_path='pose_landmarker_full.task'),
    running_mode=VisionRunningMode.VIDEO,
    num_poses=2, 
    min_pose_detection_confidence=0.2, 
    min_tracking_confidence=0.2
)

def extract_features(landmarks):
    row = []
    for lm in landmarks:
        row.extend([lm.x, lm.y, lm.z, lm.visibility])
    return row

# --- MAIN LOOP ---
print("--- STARTING ROBUST EXTRACTION (Fixed) ---")

# Initialize CSV (Overwrite old file)
with open(DATA_FILE, mode='w', newline='') as f:
    writer = csv.writer(f)
    headers = []
    for i in range(33):
        headers.extend([f'x{i}', f'y{i}', f'z{i}', f'v{i}'])
    headers.append('label')
    writer.writerow(headers)

total_samples = 0

# LOOP THROUGH FILES
for filename, label in FILES_TO_PROCESS:
    if not os.path.exists(filename):
        print(f"SKIPPING: {filename} (File not found)")
        continue

    # --- THE FIX: Start a NEW Landmarker for EACH video ---
    # This resets the internal clock so it doesn't complain about timestamps.
    with PoseLandmarker.create_from_options(options) as landmarker:
        
        cap = cv2.VideoCapture(filename)
        if not cap.isOpened():
            print(f"ERROR: Could not open {filename}")
            continue

        fps = cap.get(cv2.CAP_PROP_FPS)
        if fps <= 0: fps = 30 # Fallback

        frame_count = 0
        samples_extracted = 0
        
        while True:
            ret, frame = cap.read()
            if not ret: break
            
            # Process every 4th frame
            if frame_count % 4 == 0:
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame)
                timestamp_ms = int((frame_count / fps) * 1000)
                
                try:
                    result = landmarker.detect_for_video(mp_image, timestamp_ms)
                    
                    if result.pose_landmarks:
                        for landmarks in result.pose_landmarks:
                            features = extract_features(landmarks)
                            features.append(label)
                            
                            with open(DATA_FILE, mode='a', newline='') as f:
                                writer = csv.writer(f)
                                writer.writerow(features)
                            samples_extracted += 1
                            total_samples += 1
                except Exception as e:
                    # e.g. timestamp errors shouldn't happen now, but good to catch
                    pass 

            frame_count += 1
        
        cap.release()
        print(f"Processed {filename}: Extracted {samples_extracted} samples for {label}")

print(f"--- DONE. Total Samples: {total_samples} ---")