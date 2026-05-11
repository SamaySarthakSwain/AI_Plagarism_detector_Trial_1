import sys
import os
import json
import numpy as np
from PIL import Image

try:
    import pytesseract
    from sentence_transformers import SentenceTransformer
    import faiss
except ImportError as e:
    print(json.dumps({"error": f"Missing dependencies: {e}"}))
    sys.exit(1)

TEXT_MODEL_NAME = 'all-MiniLM-L6-v2'
CLIP_MODEL_NAME = 'clip-ViT-B-32'

TEXT_INDEX_PATH = os.path.join(os.path.dirname(__file__), 'faiss_text_index.bin')
VISUAL_INDEX_PATH = os.path.join(os.path.dirname(__file__), 'faiss_visual_index.bin')
DB_METADATA_PATH = os.path.join(os.path.dirname(__file__), 'multimodal_db.json')

def search():
    image_path = sys.stdin.read().strip()
    if not image_path or not os.path.exists(image_path):
        print(json.dumps({"error": "No valid image path provided"}))
        return
        
    if not os.path.exists(TEXT_INDEX_PATH) or not os.path.exists(VISUAL_INDEX_PATH):
        print(json.dumps({"error": "Multimodal FAISS indices not found. Run build_multimodal_db.py first."}))
        return

    try:
        text_model = SentenceTransformer(TEXT_MODEL_NAME)
        clip_model = SentenceTransformer(CLIP_MODEL_NAME)
        
        text_index = faiss.read_index(TEXT_INDEX_PATH)
        visual_index = faiss.read_index(VISUAL_INDEX_PATH)
        
        with open(DB_METADATA_PATH, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
            
        img = Image.open(image_path)
        
        # 1. OCR + Text Similarity
        try:
            ocr_text = pytesseract.image_to_string(img).strip()
        except Exception as ocr_err:
            print(json.dumps({"error": f"OCR failed, please install Tesseract: {ocr_err}"}), file=sys.stderr)
            ocr_text = ""
            
        text_sim_pct = 0
        text_match_source = None
        
        if ocr_text:
            t_emb = text_model.encode([ocr_text], convert_to_numpy=True)
            k = 1
            t_dist, t_idx = text_index.search(t_emb, k)
            if t_idx[0][0] != -1:
                t_sim = 1.0 - (t_dist[0][0] / 2.0)
                text_sim_pct = max(0.0, min(100.0, t_sim * 100))
                text_match_source = metadata[t_idx[0][0]]["source"]
                
        # 2. Visual Similarity via CLIP
        v_emb = clip_model.encode([img], convert_to_numpy=True)
        k = 1
        v_dist, v_idx = visual_index.search(v_emb, k)
        
        visual_sim_pct = 0
        visual_match_source = None
        
        if v_idx[0][0] != -1:
            # CLIP uses cosine similarity, L2 approx
            v_sim = 1.0 - (v_dist[0][0] / 2.0)
            visual_sim_pct = max(0.0, min(100.0, v_sim * 100))
            visual_match_source = metadata[v_idx[0][0]]["source"]
            
        # 3. Hybrid Score
        hybrid_score = (text_sim_pct * 0.5) + (visual_sim_pct * 0.5)
        
        print(json.dumps({
            "ocr_extracted_text": ocr_text,
            "text_similarity_score": round(text_sim_pct, 2),
            "text_match_source": text_match_source,
            "visual_similarity_score": round(visual_sim_pct, 2),
            "visual_match_source": visual_match_source,
            "hybrid_plagiarism_score": round(hybrid_score, 2)
        }))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    search()
