"""
Main Flask Application for OtakuCircle ML Service.
Optimized for low-memory production environments (e.g., Render Free Tier 512MB RAM).

Exposes endpoints for:
1. /predict (Content-Based Recommendation via precomputed vector dot-product)
2. /search  (Semantic/Vector Search via lightweight all-MiniLM-L6-v2)
"""
import os
import gc

# Prevent Hugging Face / transformers from loading TensorFlow or excessive thread pools
os.environ["USE_TF"] = "0"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"

import pickle
import threading
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from waitress import serve

# Initialize Flask
app = Flask(__name__)
CORS(app)

# Global State
MODEL = None
SEARCH_IDS = []
SEARCH_EMBEDDINGS = None  # Normalized float32 matrix
MODEL_LOAD_LOCK = threading.Lock()
MODEL_LOAD_ERROR = None

def load_index():
    """Load and normalize the precomputed index into memory."""
    global SEARCH_IDS, SEARCH_EMBEDDINGS

    try:
        index_path = os.path.join(os.path.dirname(__file__), 'search_index.pkl')
        if not os.path.exists(index_path):
            index_path = 'search_index.pkl'
            
        if not os.path.exists(index_path):
            raise FileNotFoundError("search_index.pkl not found. Run build_search_index.py first.")
            
        with open(index_path, 'rb') as f:
            data = pickle.load(f)
            SEARCH_IDS = np.array(data['ids'])
            raw_embeddings = np.array(data['embeddings'], dtype=np.float32)

            # Pre-normalize embeddings: this makes cosine similarity a pure matrix-vector dot product
            norms = np.linalg.norm(raw_embeddings, axis=1, keepdims=True)
            norms[norms == 0] = 1.0
            SEARCH_EMBEDDINGS = raw_embeddings / norms
            
        print(f"Search index ready! Loaded {len(SEARCH_IDS)} items ({SEARCH_EMBEDDINGS.nbytes / (1024*1024):.1f} MB in RAM).")
    except Exception as e:
        print(f"Critical Error loading search index: {e}")

def get_model():
    """
    Lazy-load the lightweight transformer model on demand.
    Restricts PyTorch CPU threads to 1 to prevent memory and thread-stack explosion on Render.
    """
    global MODEL, MODEL_LOAD_ERROR
    if MODEL is not None:
        return MODEL
    if MODEL_LOAD_ERROR is not None:
        return None

    with MODEL_LOAD_LOCK:
        if MODEL is None and MODEL_LOAD_ERROR is None:
            try:
                # Lazy-import sentence_transformers and torch inside function so container boots with ~35MB RAM
                import torch
                torch.set_num_threads(1)
                torch.set_num_interop_threads(1)
                
                from sentence_transformers import SentenceTransformer

                model_name = os.getenv('SENTENCE_TRANSFORMER_MODEL', 'all-MiniLM-L6-v2')
                print(f"Loading lightweight AI model ({model_name})...")
                MODEL = SentenceTransformer(model_name)
                gc.collect()
                print("Lightweight AI model loaded successfully!")
            except Exception as e:
                MODEL_LOAD_ERROR = str(e)
                print(f"Critical Error loading AI model: {e}")
    return MODEL

# Preload only the small index during startup (consumes ~15-20 MB)
load_index()

@app.route('/predict', methods=['POST'])
def recommend_by_ids():
    """
    Content-Based Recommendation using precomputed normalized vectors.
    Does NOT require loading the transformer model (runs in ~1ms with pure NumPy).
    Input: JSON { "watched_ids": [123, 456] }
    Output: JSON { "recommendations": [789, 101, ...] }
    """
    try:
        data = request.get_json(silent=True) or {}
        watched_ids = data.get('watched_ids', [])
        
        if not watched_ids or not isinstance(watched_ids, list):
            return jsonify({'recommendations': []})

        if SEARCH_EMBEDDINGS is None or len(SEARCH_IDS) == 0:
            return jsonify({'error': 'Search index not loaded'}), 503

        # 1. Find indices of watched anime
        watched_indices = [i for i, mal_id in enumerate(SEARCH_IDS) if mal_id in watched_ids]
        
        if not watched_indices:
            return jsonify({'recommendations': []})

        # 2. Build User Profile Vector (Average of watched items) and normalize
        user_vector = np.mean(SEARCH_EMBEDDINGS[watched_indices], axis=0)
        norm = np.linalg.norm(user_vector)
        if norm > 0:
            user_vector = user_vector / norm

        # 3. Pure BLAS dot-product (cosine similarity since vectors are unit-normalized)
        scores = np.dot(SEARCH_EMBEDDINGS, user_vector)
        
        # 4. Get Top Candidates (excluding already watched)
        top_indices = np.argsort(scores)[::-1]
        
        watched_set = set(watched_ids)
        recommended_ids = []
        for i in top_indices:
            mal_id = int(SEARCH_IDS[i])
            if mal_id not in watched_set:
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
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify({'error': 'No query provided'}), 400

    if SEARCH_EMBEDDINGS is None or len(SEARCH_IDS) == 0:
        return jsonify({'error': 'Index not loaded'}), 503

    model = get_model()
    if model is None:
        return jsonify({'error': 'Model not available'}), 503

    try:
        import torch
        # 1. Encode User Query with unit normalization
        with torch.no_grad():
            query_vec = model.encode([query], normalize_embeddings=True)[0]

        # 2. Dot-product similarity
        scores = np.dot(SEARCH_EMBEDDINGS, query_vec)

        # 3. Get Top 100 Results with Threshold
        top_n = min(100, len(SEARCH_IDS))
        top_indices = np.argpartition(scores, -top_n)[-top_n:]
        top_indices = top_indices[np.argsort(scores[top_indices])[::-1]]

        # Filter low similarity scores (< 0.1)
        valid_indices = [i for i in top_indices if scores[i] >= 0.1]
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
        "index_loaded": SEARCH_EMBEDDINGS is not None,
        "index_count": len(SEARCH_IDS) if SEARCH_IDS is not None else 0
    })

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting Production ML Service on port {port}...")
    serve(app, host='0.0.0.0', port=port, threads=2)
