import yt_dlp
import os

# --- VIDEO LIST (Keep your links!) ---
VIDEO_LIST = {
    # --- NORMAL ACTIVITIES ---
    "walking1.mp4": "https://www.youtube.com/watch?v=3FXUw98rrUY",
    "walking2.mp4": "https://www.youtube.com/watch?v=Mol0lrRBy3g",
    "walking3.mp4": "https://www.youtube.com/watch?v=YzcawvDGe4Y",
    "walking4.mp4": "https://www.youtube.com/watch?v=84lYjtCfIvY",
    "walking5.mp4": "https://www.youtube.com/watch?v=VamCnoHZezg",
    "walking6.mp4": "https://www.youtube.com/watch?v=vJ26-Qd1zLY",
    "walking7.mp4": "https://www.youtube.com/watch?v=QBr2e3lnDsw",
    "walking8.mp4": "https://www.youtube.com/watch?v=xVyGebYGE4Q",

    "sitting1.mp4": "https://www.youtube.com/watch?v=PB4DWQU3t-o", 
    "sitting2.mp4": "https://www.youtube.com/watch?v=B-UwSCcuClw",
    "sitting3.mp4": "https://www.youtube.com/watch?v=zOI3H7ZpVxc",
    "sitting4.mp4": "https://www.youtube.com/watch?v=JklYIhN5WDg",
    "sitting5.mp4": "https://www.youtube.com/watch?v=HWKGyzMMeCY",

    "playing1.mp4": "https://www.youtube.com/watch?v=NUkG-9hjrO4",

    # --- SUSPICIOUS ACTIVITIES ---
    "running1.mp4": "https://www.youtube.com/watch?v=ARylWpUCsGk",
    "running2.mp4": "https://www.youtube.com/watch?v=TbkFKLPah9s",
    "running3.mp4": "https://www.youtube.com/watch?v=C1rmPz08SC0",
    "running4.mp4": "https://www.youtube.com/watch?v=sY8huoWd5cw",
    "running5.mp4": "https://www.youtube.com/watch?v=LmM3wTe9sSU",

    "jumping1.mp4": "https://www.youtube.com/watch?v=admPt2RcPaA",
    "jumping2.mp4": "https://www.youtube.com/watch?v=rlWJ0RQ3v2o",
    "jumping3.mp4": "https://www.youtube.com/watch?v=dZJ9dr15bYo",

    "fainting.mp4": "https://www.youtube.com/watch?v=QALQqNLJzSw",

    # --- DANGEROUS ACTIVITIES ---
    "fighting1.mp4": "https://www.youtube.com/watch?v=uBhibV5fSVM",
    "fighting2.mp4": "https://www.youtube.com/shorts/F-Sk3mSKlOc",
    "fighting3.mp4": "https://www.youtube.com/watch?v=WyOcNEaeJ3g",
}

def download_video(filename, url):
    if os.path.exists(filename):
        print(f"Skipping {filename}, already exists.")
        return

    print(f"Downloading {filename}...")
    
    # --- THE FIX IS HERE ---
    # We removed the '+' sign. Now it looks for the best SINGLE file (mp4)
    # instead of trying to merge video+audio.
    ydl_opts = {
        'format': 'best[ext=mp4]/best', 
        'outtmpl': filename,
        'quiet': True,
        'no_warnings': True,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        print(f"Success: {filename}")
    except Exception as e:
        print(f"Failed to download {filename}. Check URL. Error: {e}")

# --- RUN DOWNLOADS ---
if __name__ == "__main__":
    print("Starting Bulk Download...")
    for filename, url in VIDEO_LIST.items():
        if "YOUR_" in url:
            print(f"WARNING: You forgot to put a real link for {filename}!")
        else:
            download_video(filename, url)
    print("Done! Check your folder.")