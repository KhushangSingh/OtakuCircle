"""
Database Cleanup Utility
Removes legacy or empty collections from MongoDB.
Useful for maintaining a clean database schema.
"""
import os
import certifi
from pymongo import MongoClient
from dotenv import load_dotenv

# --- CONFIGURATION ---
# Load env from server directory regardless of where script is run
load_dotenv(os.path.join(os.path.dirname(__file__), '../server/.env'))

MONGO_URI = os.getenv('MONGO_URI')
DB_NAME = 'otakucircle'
TARGET_COLLECTION = 'animes'  # The legacy/wrong collection to delete
VALID_COLLECTION = 'anime'    # The correct collection to keep

def cleanup():
    if not MONGO_URI:
        print("❌ Error: MONGO_URI not found in environment variables.")
        return

    client = None
    try:
        # Connect to MongoDB with SSL context
        print("🔌 Connecting to MongoDB...")
        client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
        db = client[DB_NAME]

        # 1. List Current Collections
        collections = db.list_collection_names()
        print(f"📂 Current collections: {', '.join(collections)}")

        # 2. Delete Legacy Collection if it exists
        if TARGET_COLLECTION in collections:
            db.drop_collection(TARGET_COLLECTION)
            print(f"✅ Deleted legacy collection: '{TARGET_COLLECTION}'")
        else:
            print(f"ℹ️  Collection '{TARGET_COLLECTION}' not found. No action needed.")

        # 3. Verify Final State
        final_collections = db.list_collection_names()
        print(f"📂 Final collections: {', '.join(final_collections)}")

        # 4. Check Data in Main Collection
        if VALID_COLLECTION in final_collections:
            count = db[VALID_COLLECTION].count_documents({})
            print(f"📊 Valid '{VALID_COLLECTION}' collection contains {count} documents.")
        else:
            print(f"⚠️ Warning: The valid collection '{VALID_COLLECTION}' is missing!")

    except Exception as e:
        print(f"❌ An error occurred: {e}")
    
    finally:
        if client:
            client.close()
            print("🔒 Connection closed.")

if __name__ == "__main__":
    cleanup()