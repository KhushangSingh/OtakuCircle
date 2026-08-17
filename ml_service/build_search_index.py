import os
import pickle
import pandas as pd
import certifi
from pymongo import MongoClient
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

# Load Environment
load_dotenv(os.path.join(os.path.dirname(__file__), '../server/.env'))
MONGO_URI = os.getenv('MONGO_URI')

def build_index():
    if not MONGO_URI:
        print("❌ Error: MONGO_URI missing.")
        return

    try:
        print("🔌 Connecting to MongoDB...")
        client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
        db = client.get_database('otakucircle')
        collection = db.anime

        # 1. Fetch Data
        print("📥 Fetching anime data...")
        # Only fetch necessary fields to save RAM
        cursor = collection.find({}, {'mal_id': 1, 'title': 1, 'title_english': 1, 'synopsis': 1, 'genres': 1})
        animes = list(cursor)
        
        if not animes:
            print("❌ No anime found in DB. Run seed_animes.py first.")
            return

        # 2. Preprocess Text
        data = []
        for anime in animes:
            if anime.get('synopsis'):
                genres = ", ".join(anime.get('genres', []))
                title_english = anime.get('title_english') or ''
                # "Rich Text" representation for better semantic understanding
                combined_text = f"Title: {anime['title']} {title_english}. Genre: {genres}. Synopsis: {anime['synopsis']}"
                
                data.append({
                    'mal_id': anime['mal_id'],
                    'combined_text': combined_text
                })

        df = pd.DataFrame(data)
        print(f"📊 Processing {len(df)} records.")

        # 3. Generate Embeddings
        print("🧠 Loading AI Model (all-mpnet-base-v2)...")
        model = SentenceTransformer('all-mpnet-base-v2')

        print("⚡ Generating Vectors (this takes time)...")
        embeddings = model.encode(df['combined_text'].tolist(), show_progress_bar=True)

        # 4. Save to Disk
        print("💾 Saving search_index.pkl...")
        with open('search_index.pkl', 'wb') as f:
            pickle.dump({'ids': df['mal_id'].tolist(), 'embeddings': embeddings}, f)
        
        print("✅ Success! Index created.")

    except Exception as e:
        print(f"❌ Build Failed: {e}")

if __name__ == '__main__':
    build_index()