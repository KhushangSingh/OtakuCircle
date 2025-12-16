import requests
import time
import os
import certifi
from pymongo import MongoClient
from dotenv import load_dotenv

# --- CONFIGURATION ---
load_dotenv(os.path.join(os.path.dirname(__file__), '../server/.env'))
MONGO_URI = os.getenv("MONGO_URI")
JIKAN_API = "https://api.jikan.moe/v4/top/anime"

def get_mongo_collection():
    """Connects to MongoDB and returns the anime collection."""
    if not MONGO_URI:
        raise ValueError("MONGO_URI is not set in environment variables.")
    
    # tlsCAFile is crucial for secure connections (Atlas)
    client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
    db = client.get_database('otakucircle') # Verify DB name matches your Atlas DB
    return db.anime

def fetch_anime_data(limit=1000):
    """Fetches top anime from Jikan API with rate limiting."""
    anime_list = []
    page = 1
    total_pages = limit // 25
    
    print(f"📡 Starting fetch for {limit} animes...")

    while page <= total_pages:
        try:
            print(f"   Fetching page {page}/{total_pages}...")
            response = requests.get(f"{JIKAN_API}?page={page}")
            
            if response.status_code == 200:
                data = response.json().get('data', [])
                for item in data:
                    anime_doc = {
                        "mal_id": item['mal_id'],
                        "title": item['title'],
                        "title_english": item.get('title_english'),
                        "synopsis": item.get('synopsis'),
                        "type": item.get('type'),
                        "episodes": item.get('episodes'),
                        "status": item.get('status'),
                        "score": item.get('score'),
                        "genres": [g['name'] for g in item.get('genres', [])], 
                        "poster_url": item['images']['jpg']['large_image_url'],
                        "vector_embedding": [] # Reserved for future use
                    }
                    anime_list.append(anime_doc)
                
                page += 1
                time.sleep(1.2) # Jikan Rate Limit: 3 req/sec max. 1.2s is safe.
            
            elif response.status_code == 429:
                print("⚠️ Rate limited. Sleeping for 10 seconds...")
                time.sleep(10)
            
            else:
                print(f"❌ Error {response.status_code} on page {page}")
                break
                
        except Exception as e:
            print(f"❌ Network Exception: {e}")
            break

    return anime_list

def seed_database():
    try:
        collection = get_mongo_collection()
        animes = fetch_anime_data(limit=1000) # Adjust limit as needed
        
        if animes:
            print(f"💾 Upserting {len(animes)} documents to MongoDB...")
            operations = []
            for anime in animes:
                # Using update_one with upsert=True prevents duplicates
                collection.update_one(
                    {'mal_id': anime['mal_id']}, 
                    {'$set': anime}, 
                    upsert=True
                )
            print("✅ Database seeding complete!")
        else:
            print("⚠️ No data fetched.")
            
    except Exception as e:
        print(f"❌ Seeding Failed: {e}")

if __name__ == "__main__":
    seed_database()