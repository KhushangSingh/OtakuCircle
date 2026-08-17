"""
Main Flask Application for OtakuCircle ML Service.
Exposes endpoints for:
1. /predict (Content-Based Recommendation)
2. /search  (Semantic/Vector Search)
"""
import os
import pickle
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from waitress import serve  # Production server

# Initialize Flask
app = Flask(__name__)
CORS(app)  # Enable Cross-Origin Resource Sharing for all domains

# Global State
MODEL = None
SEARCH_IDS = []
SEARCH_EMBEDDINGS = None

def load_resources():
    """Loads the AI model and pre-computed index into memory on startup."""
    global MODEL, SEARCH_IDS, SEARCH_EMBEDDINGS
    print("Loading AI Models & Index...")
    
    try:
        # 1. Load Sentence Transformer (Must match build_search_index.py)
        MODEL = SentenceTransformer('all-mpnet-base-v2')
        
        # 2. Load Search Index
        if not os.path.exists('search_index.pkl'):
            raise FileNotFoundError("search_index.pkl not found. Run build_search_index.py first.")
            
        with open('search_index.pkl', 'rb') as f:
            data = pickle.load(f)
            SEARCH_IDS = np.array(data['ids'])
            SEARCH_EMBEDDINGS = data['embeddings']
            
        print(f"ML Service Ready! Loaded {len(SEARCH_IDS)} items.")
    except Exception as e:
        print(f"Critical Error loading resources: {e}")

# Load on startup
load_resources()

@app.route('/predict', methods=['POST'])
def recommend_by_ids():
    """
    Content-Based Recommendation.
    Input: JSON { "watched_ids": [123, 456] }
    Output: JSON { "recommendations": [789, 101, ...] }
    """
    try:
        data = request.get_json()
        watched_ids = data.get('watched_ids', [])
        
        if not watched_ids or not isinstance(watched_ids, list):
            return jsonify({'recommendations': []})

        if SEARCH_EMBEDDINGS is None:
            return jsonify({'error': 'Model not loaded'}), 503

        # 1. Find indices of watched anime
        watched_indices = [i for i, mal_id in enumerate(SEARCH_IDS) if mal_id in watched_ids]
        
        if not watched_indices:
            return jsonify({'recommendations': []})

        # 2. Build User Profile Vector (Average of watched items)
        watched_vectors = SEARCH_EMBEDDINGS[watched_indices]
        user_vector = np.mean(watched_vectors, axis=0, keepdims=True)

        # 3. Calculate Similarity
        scores = cosine_similarity(user_vector, SEARCH_EMBEDDINGS)[0]
        
        # 4. Get Top Candidates (excluding already watched)
        # Sort indices by score descending
        sorted_indices = np.argsort(scores)[::-1]
        
        recommended_ids = []
        for i in sorted_indices:
            mal_id = int(SEARCH_IDS[i])
            if mal_id not in watched_ids:
                recommended_ids.append(mal_id)
                if len(recommended_ids) >= 20:
                    break

        return jsonify({'recommendations': recommended_ids})

    except Exception as e:
        print(f"Recommendation Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/search', methods=['GET'])
def semantic_search():
    """
    Semantic Search Endpoint.
    Input: Query Param ?q="sad anime about music"
    Output: JSON { "results": [123, 456] }
    """
    query = request.args.get('q', '')
    if not query:
        return jsonify({'error': 'No query provided'}), 400

    if MODEL is None or SEARCH_EMBEDDINGS is None:
        return jsonify({'error': 'Model not loaded'}), 503

    try:
        # 1. Encode User Query
        query_vec = MODEL.encode([query])

        # 2. Similarity Search
        scores = cosine_similarity(query_vec, SEARCH_EMBEDDINGS)[0]

        # 3. Get Top 30 Results
        top_n = 30
        # Efficiently find top N indices without full sort first
        top_indices = np.argpartition(scores, -top_n)[-top_n:]
        # Sort just the top N
        top_indices = top_indices[np.argsort(scores[top_indices])[::-1]]

        result_ids = SEARCH_IDS[top_indices].tolist()

        return jsonify({'results': result_ids})

    except Exception as e:
        print(f"Search Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "model_loaded": MODEL is not None})

if __name__ == '__main__':
    # Use Waitress for Production Serving
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting Production ML Service on port {port}...")
    print("   (Press CTRL+C to quit)")
    
    serve(app, host='0.0.0.0', port=port, threads=6)