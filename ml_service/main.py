"""
Main Flask Application for OtakuCircle ML Service.
Exposes endpoints for:
1. /predict (Content-Based Recommendation)
2. /search  (Semantic/Vector Search)
"""
import os
import pickle
import threading
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
MODEL_LOAD_LOCK = threading.Lock()
MODEL_LOAD_ERROR = None

def load_index():
    """Load the compact pre-computed index without loading the transformer model."""
    global SEARCH_IDS, SEARCH_EMBEDDINGS

    try:
        if not os.path.exists('search_index.pkl'):
            raise FileNotFoundError("search_index.pkl not found. Run build_search_index.py first.")
            
        with open('search_index.pkl', 'rb') as f:
            data = pickle.load(f)
            SEARCH_IDS = np.array(data['ids'])
            SEARCH_EMBEDDINGS = data['embeddings']
            
        print(f"Search index ready! Loaded {len(SEARCH_IDS)} items.")
    except Exception as e:
        print(f"Critical Error loading search index: {e}")

def get_model():
    """Load the transformer only when semantic search is requested."""
    global MODEL, MODEL_LOAD_ERROR
    if MODEL is not None:
        return MODEL
    if MODEL_LOAD_ERROR is not None:
        return None

    with MODEL_LOAD_LOCK:
        if MODEL is None and MODEL_LOAD_ERROR is None:
            try:
                print("Loading AI model for the first semantic search request...")
                MODEL = SentenceTransformer(
                    os.getenv('SENTENCE_TRANSFORMER_MODEL', 'all-mpnet-base-v2')
                )
            except Exception as e:
                MODEL_LOAD_ERROR = str(e)
                print(f"Critical Error loading AI model: {e}")
    return MODEL

# Load only the small index during startup. The transformer is lazy-loaded to
# keep the Render instance below its memory limit while idle.
load_index()

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

    model = get_model()
    if model is None or SEARCH_EMBEDDINGS is None:
        return jsonify({'error': 'Model not loaded'}), 503

    try:
        # 1. Encode User Query
        query_vec = model.encode([query])

        # 2. Similarity Search
        scores = cosine_similarity(query_vec, SEARCH_EMBEDDINGS)[0]

        # 3. Get Top 100 Results with Threshold
        top_n = min(100, len(SEARCH_IDS))
        # Efficiently find top N indices without full sort first
        top_indices = np.argpartition(scores, -top_n)[-top_n:]
        # Sort just the top N
        top_indices = top_indices[np.argsort(scores[top_indices])[::-1]]

        # Filter out garbage matches (e.g., score < 0.1)
        valid_indices = [i for i in top_indices if scores[i] >= 0.1]
        
        # If the threshold is too strict and filters everything, return at least the top 10
        if len(valid_indices) == 0:
            valid_indices = top_indices[:10]

        result_ids = SEARCH_IDS[valid_indices].tolist()

        return jsonify({'results': result_ids})

    except Exception as e:
        print(f"Search Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "healthy",
        "model_loaded": MODEL is not None,
        "index_loaded": SEARCH_EMBEDDINGS is not None
    })

if __name__ == '__main__':
    # Use Waitress for Production Serving
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting Production ML Service on port {port}...")
    print("   (Press CTRL+C to quit)")
    
    serve(app, host='0.0.0.0', port=port, threads=2)