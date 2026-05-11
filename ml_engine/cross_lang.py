"""
Feature 9 & 10: Cross-Language & Translation Plagiarism
========================================================
Detects plagiarism across languages (e.g., French source -> English output).

Uses 'paraphrase-multilingual-MiniLM-L12-v2' which maps multiple 
languages into the same vector space.
"""

import sys
import json
import os

try:
    from sentence_transformers import SentenceTransformer
    import numpy as np
except ImportError:
    print(json.dumps({"error": "Missing: pip install sentence-transformers"}))
    sys.exit(1)

# Multilingual model (supports 50+ languages)
MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"

# Small multilingual reference corpus (Simulation)
# Real version would query international sources or academic DBs
CROSS_LANG_CORPUS = [
    {"lang": "fr", "text": "L'intelligence artificielle transforme la médecine moderne."},
    {"lang": "de", "text": "Künstliche Intelligenz verändert die moderne Medizin."},
    {"lang": "es", "text": "La inteligencia artificial está transformando la medicina moderna."},
    {"lang": "hi", "text": "कृत्रिम बुद्धिमत्ता आधुनिक चिकित्सा को बदल रही है।"},
    {"lang": "en", "text": "Artificial Intelligence is revolutionizing modern medicine."}
]

def analyze_cross_lang():
    text = sys.stdin.read().strip()
    if not text:
        print(json.dumps({"error": "No text provided"}))
        return

    try:
        model = SentenceTransformer(MODEL_NAME)
        
        # Encode input
        input_emb = model.encode([text], normalize_embeddings=True)
        
        # Encode corpus
        corpus_texts = [item["text"] for item in CROSS_LANG_CORPUS]
        corpus_embs = model.encode(corpus_texts, normalize_embeddings=True)
        
        # Compute cosine similarity
        similarities = np.dot(input_emb, corpus_embs.T)[0]
        
        matches = []
        for i, sim in enumerate(similarities):
            if sim > 0.6: # High semantic overlap across languages
                matches.append({
                    "sourceLang": CROSS_LANG_CORPUS[i]["lang"],
                    "sourceText": CROSS_LANG_CORPUS[i]["text"],
                    "similarity": round(float(sim) * 100, 2),
                    "verdict": "CROSS_LANGUAGE_MATCH" if sim > 0.85 else "SEMANTIC_TRANSLATION"
                })
        
        matches.sort(key=lambda x: x["similarity"], reverse=True)
        
        print(json.dumps({
            "matches": matches,
            "maxSimilarity": matches[0]["similarity"] if matches else 0,
            "detectedLanguage": "en", # Simplified
            "verdict": "Translation plagiarism suspected" if matches and matches[0]["similarity"] > 80 else "No cross-lang matches found"
        }))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    analyze_cross_lang()
