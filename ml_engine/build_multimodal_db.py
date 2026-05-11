import os
import json
import numpy as np
from PIL import Image

try:
    import pytesseract
    from sentence_transformers import SentenceTransformer
    import faiss
    from pptx import Presentation
except ImportError as e:
    print(f"Missing dependencies: {e}")
    exit(1)

TEXT_MODEL_NAME = 'all-MiniLM-L6-v2'
CLIP_MODEL_NAME = 'clip-ViT-B-32'

TEXT_INDEX_PATH = os.path.join(os.path.dirname(__file__), 'faiss_text_index.bin')
VISUAL_INDEX_PATH = os.path.join(os.path.dirname(__file__), 'faiss_visual_index.bin')
DB_METADATA_PATH = os.path.join(os.path.dirname(__file__), 'multimodal_db.json')

def build_database(data_dir="data"):
    data_path = os.path.join(os.path.dirname(__file__), data_dir)
    if not os.path.exists(data_path):
        os.makedirs(data_path)
        print(f"Created {data_path}. Please place your PDFs, PPTs, and images there.")
        return

    print("Loading models (this might take a moment)...")
    text_model = SentenceTransformer(TEXT_MODEL_NAME)
    clip_model = SentenceTransformer(CLIP_MODEL_NAME)

    metadata = []
    text_embeddings_list = []
    visual_embeddings_list = []

    files = [f for f in os.listdir(data_path) if os.path.isfile(os.path.join(data_path, f))]
    
    if not files:
        print(f"No files found in {data_path}. Add some files to build the index.")
        return
        
    print(f"Processing {len(files)} files...")
    
    for file_name in files:
        file = os.path.join(data_path, file_name)
        ext = file_name.lower().split('.')[-1]
        
        if ext in ['png', 'jpg', 'jpeg']:
            try:
                img = Image.open(file)
                # 1. OCR for Text Similarity
                try:
                    ocr_text = pytesseract.image_to_string(img).strip()
                except Exception as ocr_err:
                    print(f"OCR Warning (Tesseract may not be installed): {ocr_err}")
                    ocr_text = ""
                
                if ocr_text:
                    t_emb = text_model.encode([ocr_text])[0]
                    text_embeddings_list.append(t_emb)
                else:
                    t_emb = np.zeros(text_model.get_sentence_embedding_dimension(), dtype=np.float32)
                    text_embeddings_list.append(t_emb)
                
                # 2. CLIP for Visual Similarity
                v_emb = clip_model.encode([img])[0]
                visual_embeddings_list.append(v_emb)
                
                metadata.append({
                    "source": file_name,
                    "type": "image",
                    "extracted_text": ocr_text[:200] + "..." if len(ocr_text) > 200 else ocr_text
                })
                print(f"Processed image: {file_name}")
            except Exception as e:
                print(f"Error processing {file_name}: {e}")
                
        elif ext == 'pptx':
            try:
                prs = Presentation(file)
                for i, slide in enumerate(prs.slides):
                    slide_text = []
                    for shape in slide.shapes:
                        if hasattr(shape, "text"):
                            slide_text.append(shape.text)
                    full_text = " ".join(slide_text).strip()
                    
                    if full_text:
                        t_emb = text_model.encode([full_text])[0]
                        text_embeddings_list.append(t_emb)
                        
                        # Use a zero vector for visual embedding since we didn't render the slide to an image
                        v_emb = np.zeros(clip_model.get_sentence_embedding_dimension(), dtype=np.float32)
                        visual_embeddings_list.append(v_emb)
                        
                        metadata.append({
                            "source": f"{file_name} - Slide {i+1}",
                            "type": "slide",
                            "extracted_text": full_text[:200]
                        })
                print(f"Processed PPTX: {file_name}")
            except Exception as e:
                print(f"Error processing {file_name}: {e}")

    if not metadata:
        print("No valid data could be extracted.")
        return

    print("Building FAISS Indices...")
    # Build Text Index
    text_embeddings_matrix = np.array(text_embeddings_list).astype('float32')
    text_index = faiss.IndexFlatL2(text_embeddings_matrix.shape[1])
    text_index.add(text_embeddings_matrix)
    faiss.write_index(text_index, TEXT_INDEX_PATH)

    # Build Visual Index
    visual_embeddings_matrix = np.array(visual_embeddings_list).astype('float32')
    visual_index = faiss.IndexFlatL2(visual_embeddings_matrix.shape[1])
    visual_index.add(visual_embeddings_matrix)
    faiss.write_index(visual_index, VISUAL_INDEX_PATH)

    # Save metadata
    with open(DB_METADATA_PATH, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)

    print(f"Successfully built Multi-Modal FAISS DB with {len(metadata)} entries.")

if __name__ == "__main__":
    build_database()
