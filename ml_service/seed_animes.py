import requests
import time
import os
import certifi
from pymongo import MongoClient
from dotenv import load_dotenv

# --- CONFIGURATION ---
load_dotenv(os.path.join(os.path.dirname(__file__), '../server/.env'))
MONGO_URI = os.getenv("MONGO_URI")
ANILIST_URL = "https://graphql.anilist.co"

QUERY = """
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { hasNextPage }
    media(type: ANIME, sort: SCORE_DESC) {
      idMal
      id
      title { romaji english }
      description
      format
      episodes
      status
      averageScore
      genres
      coverImage { extraLarge large }
      seasonYear
    }
  }
}
"""

def get_mongo_collection():
    """Connects to MongoDB and returns the anime collection."""
    if not MONGO_URI:
        raise ValueError("MONGO_URI is not set in environment variables.")
    
    # tlsCAFile is crucial for secure connections (Atlas)
    client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
    db = client.get_database('otakucircle') # Verify DB name matches your Atlas DB
    return db.anime

def fetch_anime_data(limit=1000):
    """Fetches top anime from AniList API."""
    anime_list = []
    page = 1
    per_page = 50 # AniList allows 50 per page
    total_pages = limit // per_page
    
    print(f"📡 Starting fetch for {limit} animes...")

    while page <= total_pages:
        try:
            print(f"   Fetching page {page}/{total_pages}...")
            response = requests.post(ANILIST_URL, json={
                "query": QUERY,
                "variables": {"page": page, "perPage": per_page}
            })
            
            if response.status_code == 200:
                data = response.json().get('data', {}).get('Page', {})
                media_list = data.get('media', [])
                
                for item in media_list:
                    # Fallback to AniList ID if MAL ID is missing
                    mal_id = item.get('idMal') or item.get('id')
                    
                    anime_doc = {
                        "mal_id": mal_id,
                        "title": item.get('title', {}).get('english') or item.get('title', {}).get('romaji') or 'Unknown',
                        "title_english": item.get('title', {}).get('english'),
                        "synopsis": item.get('description'),
                        "type": item.get('format'),
                        "episodes": item.get('episodes'),
                        "status": item.get('status'),
                        "score": (item.get('averageScore') / 10) if item.get('averageScore') else None,
                        "genres": item.get('genres', []),
                        "poster_url": item.get('coverImage', {}).get('extraLarge') or item.get('coverImage', {}).get('large'),
                        "vector_embedding": [] # Reserved for future use
                    }
                    anime_list.append(anime_doc)
                
                page += 1
                # AniList rate limit is 90 per minute, so small sleep is sufficient
                time.sleep(0.5) 
            
            elif response.status_code == 429:
                print("⚠️ Rate limited. Sleeping for 10 seconds...")
                time.sleep(10)
            
            else:
                print(f"❌ Error {response.status_code} on page {page}")
                print(response.text)
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