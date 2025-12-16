import os
import pandas as pd
import pickle
from pymongo import MongoClient
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from dotenv import load_dotenv
import certifi  # <--- THIS WAS MISSING!

# 1. Load Config
load_dotenv(os.path.join(os.path.dirname(__file__), '../server/.env'))
MONGO_URI = os.getenv("MONGO_URI")

def train():
    print("⏳ Connecting to Database...")
    
    # We use certifi.where() to tell Python where the SSL certificates are
    client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
    
    db = client.get_database('otakucircle')
    collection = db.anime

    # 2. Fetch Data
    # We exclude vectors/stats to save memory
    cursor = collection.find({}, {'mal_id': 1, 'title': 1, 'genres': 1, 'type': 1, 'synopsis': 1})
    df = pd.DataFrame(list(cursor))
    
    if df.empty:
        print("❌ No data found in MongoDB. Run seed_animes.py first!")
        return

    print(f"📊 Loaded {len(df)} anime for training.")

    # 3. Create "Tags" (The Features)
    def create_soup(row):
        genres = " ".join(row['genres']) if isinstance(row['genres'], list) else ""
        anime_type = str(row['type']) if row['type'] else ""
        return f"{genres} {anime_type}"

    df['tags'] = df.apply(create_soup, axis=1)

    # 4. Vectorization
    print("🧮 Vectorizing data...")
    cv = CountVectorizer(max_features=5000, stop_words='english')
    vectors = cv.fit_transform(df['tags']).toarray()

    # 5. Compute Similarity Matrix
    print("📐 Calculating Cosine Similarity...")
    similarity = cosine_similarity(vectors)

    # 6. Save the "Brain"
    print("💾 Saving model files...")
    pickle.dump(df, open('anime_data.pkl', 'wb'))
    pickle.dump(similarity, open('similarity_matrix.pkl', 'wb'))
    
    print("✅ Model Trained & Saved!")

if __name__ == "__main__":
    train()