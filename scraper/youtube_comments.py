import os
import random
import time
from dotenv import load_dotenv
import psycopg2, hashlib
from psycopg2.extras import execute_values
from youtube_search import YoutubeSearch
from youtube_comment_downloader import YoutubeCommentDownloader

load_dotenv()

# Your required baseline queries from the project specifications
TARGET_QUERIES = [
    # --- Your Original Baseline Queries ---
    "EV charging station India review latest",
    "Mumbai Goa EV road trip charging",
    "Tata Nexon EV highway charging experience India",
    "Ather 450X long drive charging stops",
    "India EV charging network honest review",

    # --- Major Indian Highway Corridors (High Density EV Travel) ---
    "Mumbai Pune expressway EV charging stations",
    "Delhi Jaipur highway EV road trip charging",
    "Bangalore Mysore road trip EV charging",
    "Delhi Chandigarh EV highway drive experience",
    "Samruddhi Mahamarg EV charging station network",
    "Chennai Bangalore highway EV charging stops",
    "Hyderabad Vijaywada EV driving range test",

    # --- Network-Specific & Operator Infrastructure Reviews ---
    "Tata Power EZ Charge highway stations review",
    "Statiq EV charger not working India",
    "ChargeZone fast charger highway experience",
    "Jio-bp pulse EV charging station review",
    "Zeon Charging reliable fast chargers highway",
    "Glida EV charging station reality check India",
    "Shell Recharge EV highway charging review",

    # --- Diverse Vehicle Range & Real-World Highway Testing ---
    "Punch EV highway long drive range test",
    "Ola S1 Pro long distance highway charging",
    "Mahindra XUV400 EV highway trip review",
    "BYD Atto 3 road trip India charging",
    "Tiago EV highway driving range anxiety",
    "Ather Rizta family road trip charging stops",

    # --- Outage, Wait Times, & Edge-Case Incident Reports ---
    "EV charging station long queues India highway",
    "broken EV charger highway India experience",
    "EV charging station power cut issue highway",
    "Tata Nexon EV towing highway battery drain",
    "night driving EV road trip safety charging India"
]

EV_KEYWORDS = ["charg","station","ev","electric","range","charger","kwh","ather","tata","statiq"]

def discover_video_urls(queries, max_videos_per_query=3):
    """
    Dynamically searches YouTube for the required topics without an API key.
    Returns a unique list of found video URLs and their titles.
    """
    discovered_videos = {}
    print(f"Beginning automated video discovery across {len(queries)} search terms...")
    
    for query in queries:
        try:
            # Performs front-end scrapeless fetch of search results
            results = YoutubeSearch(query, max_results=max_videos_per_query).to_dict()
            for video in results:
                video_id = video.get('id')
                title = video.get('title', 'Discovered EV Video')
                if video_id:
                    url = f"https://www.youtube.com/watch?v={video_id}"
                    
                    network = None
                    ql = query.lower()
                    if "tata" in ql: network = "Tata EZ Charge"
                    elif "ather" in ql: network = "Ather"
                    elif "statiq" in ql: network = "Statiq"
                    elif "chargezone" in ql: network = "ChargeZone"
                    elif "jio" in ql: network = "Jio-bp pulse"
                    elif "zeon" in ql: network = "Zeon Charging"
                    elif "glida" in ql: network = "Glida"
                    elif "shell" in ql: network = "Shell Recharge"

                    discovered_videos[url] = (title, network)
            print(f"  -> Query '{query}': Found {len(results)} videos.")
            time.sleep(random.uniform(1, 3)) # Polite delay between query hits
        except Exception as e:
            print(f"Search failed for query '{query}': {e}")
            
    return list(discovered_videos.items())

def extract_relevant_comments(video_url, max_scan=100):
    """
    Extracts live public comments directly from YouTube's internal API payload.
    Bypasses DOM layout dependencies and works 10x faster than Playwright.
    """
    downloader = YoutubeCommentDownloader()
    relevant_comments = []
    
    try:
        comments_stream = downloader.get_comments_from_url(video_url, sort_by=0) # 0 = Popular/Top comments
        
        count = 0
        for comment in comments_stream:
            if count >= max_scan:
                break
                
            text = comment.get('text', '')
            # Enforce validation matching your project spec rules
            if any(k in text.lower() for k in EV_KEYWORDS) and len(text) > 40:
                relevant_comments.append(text.strip()[:1000])
                
            count += 1
            
        return relevant_comments
    except Exception as e:
        print(f"Extraction error on video {video_url}: {e}")
        return []

def run_youtube_scraper():
    # 1. Discover fresh URLs dynamically
    dynamic_videos = discover_video_urls(TARGET_QUERIES, max_videos_per_query=3)
    
    if not dynamic_videos:
        print("Automation error: No videos could be discovered from YouTube search.")
        return
        
    print(f"Discovery complete. Total unique videos found: {len(dynamic_videos)}")
    
    # 2. Database Connection
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    cur = conn.cursor()
    total_stored = 0
    
    print("\nInitiating data pipeline processing...")
    
    for video_url, (description, network) in dynamic_videos:
        print(f"Processing: '{description[:50]}...' ({video_url})")
        
        comments = extract_relevant_comments(video_url, max_scan=100)
        
        if comments:
            # Map items cleanly into a bulk insert collection
            records_to_insert = []
            for text in comments:
                r_hash = hashlib.sha256(text.encode('utf-8')).hexdigest()
                records_to_insert.append((text, 'youtube_comment', network, r_hash))
            
            # Atomic transactional query to optimize connection speed to Neon
            execute_values(
                cur,
                "INSERT INTO reviews (review_text, source, network_operator, review_hash) VALUES %s ON CONFLICT (review_hash) DO NOTHING",
                records_to_insert
            )
            conn.commit()
            total_stored += len(comments)
            print(f"   -> Stored {len(comments)} relevant user stories.")
        else:
            print("   -> No matching keyword rows found.")
            
        # Subtle anti-throttling delay to make the script look like regular traffic
        time.sleep(random.uniform(2, 4))
        
    cur.close()
    conn.close()
    print(f"\nPipeline successfully closed. Saved {total_stored} fresh Indian EV reviews to PostgreSQL.")

if __name__ == "__main__":
    run_youtube_scraper()