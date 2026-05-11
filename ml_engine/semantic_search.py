import sys
import os
import json
import numpy as np

try:
    from sentence_transformers import SentenceTransformer
    import faiss
except ImportError:
    print(json.dumps({"error": "Missing dependencies. Run: pip install sentence-transformers faiss-cpu"}))
    sys.exit(1)

# Using a lightweight, fast sentence-transformer model
MODEL_NAME = 'all-MiniLM-L6-v2'
INDEX_PATH = os.path.join(os.path.dirname(__file__), "faiss_index.bin")
TEXTS_PATH = os.path.join(os.path.dirname(__file__), "corpus.json")

def build_index():
    """Builds a FAISS vector index from a reference database"""
    print(f"Loading {MODEL_NAME}...")
    model = SentenceTransformer(MODEL_NAME)
    
    # Dummy corpus for demonstration. 
    # In a real scenario, this would be loaded from Kaggle datasets, Wikipedia, etc.
    corpus = [
        "Artificial Intelligence is transforming education.",
        "Academic integrity is essential to learning.",
        "Plagiarism detectors use advanced machine learning to find similarities.",
        "The quick brown fox jumps over the lazy dog.",
        "Neural networks form the basis of modern AI systems.",
        "Modern educational frameworks increasingly emphasize the necessity of robust integrity policies to ensure equitable assessment outcomes."
    ]
    
    print(f"Encoding {len(corpus)} sentences...")
    embeddings = model.encode(corpus, convert_to_numpy=True)
    
    # Create FAISS index (L2 distance is standard for unnormalized; all-MiniLM returns normalized vectors by default in some pipelines, but L2 distance works well)
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings)
    
    faiss.write_index(index, INDEX_PATH)
    with open(TEXTS_PATH, 'w', encoding='utf-8') as f:
        json.dump(corpus, f)
        
    print(f"Built FAISS index with {len(corpus)} vectors.")

def search():
    text = sys.stdin.read().strip()
    if not text:
        print(json.dumps({"error": "No text provided"}))
        return
        
    if not os.path.exists(INDEX_PATH) or not os.path.exists(TEXTS_PATH):
        print(json.dumps({"error": "FAISS index not found. Run semantic_search.py --build first."}))
        return

    try:
        model = SentenceTransformer(MODEL_NAME)
        index = faiss.read_index(INDEX_PATH)
        
        with open(TEXTS_PATH, 'r', encoding='utf-8') as f:
            corpus = json.load(f)
            
        # Basic sentence chunking
        import re
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text.replace('\n', ' ')) if len(s.strip()) > 5]
        
        if not sentences:
            print(json.dumps({"maxSimilarity": 0, "matches": []}))
            return
            
        embeddings = model.encode(sentences, convert_to_numpy=True)
        
        # Search top 1 most similar for each sentence
        k = 1
        distances, indices = index.search(embeddings, k)
        
        matches = []
        max_sim = 0
        
        for i, (dist, idx) in enumerate(zip(distances, indices)):
            # Sentence transformers generally yield embeddings with L2 norm ~1 if normalized.
            # Convert L2 distance to Cosine Similarity roughly: CosineSim = 1 - (L2^2)/2
            # We'll use this approximation for the score
            sim = 1.0 - (dist[0] / 2.0)
            sim_pct = max(0.0, min(100.0, sim * 100))
            
            if sim_pct > max_sim:
                max_sim = sim_pct
                
            if sim_pct > 60: # Threshold for semantic match
                matches.append({
                    "sentence": sentences[i],
                    "matched_source": corpus[idx[0]],
                    "similarity": round(sim_pct, 2)
                })
                
        print(json.dumps({
            "maxSimilarity": round(max_sim, 2),
            "matches": matches
        }))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--build":
        build_index()
    else:
        search()
