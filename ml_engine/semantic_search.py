"""
Feature 1: Idea-Level Plagiarism Detection (Enhanced)
======================================================
Uses SBERT + FAISS to detect conceptual/semantic similarity,
not just surface-level word matching.
Detects paraphrased ideas, reordered arguments, same structure.
"""

import sys
import os
import json
import re
import numpy as np

# ── Dependency guard ─────────────────────────────────────────────────────────
try:
    from sentence_transformers import SentenceTransformer
    import faiss
except ImportError:
    print(json.dumps({"error": "Missing: pip install sentence-transformers faiss-cpu"}))
    sys.exit(1)

# ── Config ───────────────────────────────────────────────────────────────────
MODEL_NAME  = "all-MiniLM-L6-v2"
BASE_DIR    = os.path.dirname(__file__)
INDEX_PATH  = os.path.join(BASE_DIR, "faiss_index.bin")
TEXTS_PATH  = os.path.join(BASE_DIR, "corpus.json")

# ── Rich Academic Corpus (ideas, not just words) ─────────────────────────────
# This is the reference database that student work is compared against.
# In production: ingest Wikipedia, arxiv, PubMed abstracts, textbooks.
REFERENCE_CORPUS = [
    # AI / Machine Learning
    "Artificial Intelligence is transforming education and learning.",
    "Machine learning models use statistical patterns to make predictions.",
    "Predictive machine learning is transforming medical diagnosis and healthcare.",
    "Neural networks form the basis of modern AI systems.",
    "Deep learning uses multiple layers of neurons to learn complex representations.",
    "Transformer models have revolutionized natural language processing tasks.",
    "Large language models generate human-like text by predicting the next token.",
    "AI improves healthcare through predictive analytics and pattern recognition.",

    # Academic Integrity
    "Academic integrity is essential to learning and scholarly growth.",
    "It refers to the moral code of academia, encompassing honesty, trust, and fairness.",
    "Modern educational frameworks emphasize robust integrity policies for equitable outcomes.",
    "Plagiarism is the act of presenting someone else's work as one's own.",
    "Universities enforce strict academic honesty policies to maintain fair assessment.",
    "Citation of sources is fundamental to academic writing and scholarly discourse.",

    # Climate & Environment
    "Climate change is driven primarily by greenhouse gas emissions from human activities.",
    "Rising global temperatures pose significant risks to ecosystems worldwide.",
    "Renewable energy sources such as solar and wind can reduce carbon emissions.",
    "Deforestation contributes significantly to the increase in atmospheric CO2 levels.",
    "Ocean acidification threatens marine biodiversity and coral reef ecosystems.",

    # Economics
    "Inflation is the rate at which the general level of prices for goods rises.",
    "Supply and demand determine the equilibrium price in a free market economy.",
    "Economic inequality has grown significantly in developed nations over recent decades.",
    "Cryptocurrency decentralizes financial transactions using blockchain technology.",
    "Globalization has increased economic interdependence between nations.",

    # Biology / Medicine
    "DNA carries the genetic information that controls biological development.",
    "Vaccines train the immune system to recognize and fight specific pathogens.",
    "CRISPR-Cas9 allows precise editing of genetic sequences in living organisms.",
    "Cancer arises from uncontrolled cell division due to genetic mutations.",
    "Antibiotic resistance is a growing threat to global public health.",

    # Philosophy / Ethics
    "Utilitarianism holds that the best action is one that maximizes overall happiness.",
    "Kant's categorical imperative states that one should act only as one would wish all to act.",
    "Free will is the capacity of agents to choose their actions independently.",
    "The trolley problem is a thought experiment in moral philosophy.",
    "Social contract theory holds that political authority derives from consent of the governed.",

    # History
    "The Industrial Revolution transformed manufacturing and social structures in the 18th century.",
    "World War II resulted in significant geopolitical changes and the formation of the United Nations.",
    "The Renaissance was a period of cultural and intellectual revival in Europe.",
    "Colonialism had lasting economic and cultural impacts on developing nations.",
    "The Cold War was a geopolitical tension between the United States and Soviet Union.",
]


def build_index():
    """Build and persist the FAISS semantic index from the reference corpus."""
    print("Loading SBERT model...")
    model = SentenceTransformer(MODEL_NAME)

    print(f"Encoding {len(REFERENCE_CORPUS)} reference documents...")
    embeddings = model.encode(REFERENCE_CORPUS, convert_to_numpy=True, normalize_embeddings=True)

    # Inner Product index (equivalent to Cosine Similarity for normalized vectors)
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatIP(dimension)
    index.add(embeddings)

    faiss.write_index(index, INDEX_PATH)
    with open(TEXTS_PATH, "w", encoding="utf-8") as f:
        json.dump(REFERENCE_CORPUS, f, ensure_ascii=False, indent=2)

    print(f"FAISS index built with {len(REFERENCE_CORPUS)} vectors (dim={dimension}).")


def chunk_text(text: str) -> list[str]:
    """Split text into meaningful sentence-level chunks for analysis."""
    text = text.replace("\n", " ").strip()
    sentences = re.split(r"(?<=[.!?])\s+", text)
    return [s.strip() for s in sentences if len(s.strip()) > 12]


def search():
    """Read text from stdin, perform semantic search, output JSON results."""
    text = sys.stdin.read().strip()
    if not text:
        print(json.dumps({"error": "No text provided"}))
        return

    if not os.path.exists(INDEX_PATH) or not os.path.exists(TEXTS_PATH):
        print(json.dumps({"error": "FAISS index not found. Run: python semantic_search.py --build"}))
        return

    try:
        model = SentenceTransformer(MODEL_NAME)
        index = faiss.read_index(INDEX_PATH)

        with open(TEXTS_PATH, "r", encoding="utf-8") as f:
            corpus = json.load(f)

        sentences = chunk_text(text)
        if not sentences:
            print(json.dumps({"maxSimilarity": 0, "matches": [], "ideaMatches": []}))
            return

        # Encode input sentences (normalized for cosine similarity)
        embeddings = model.encode(sentences, convert_to_numpy=True, normalize_embeddings=True)

        # Search top-3 most similar for each sentence
        k = min(3, len(corpus))
        scores, indices = index.search(embeddings, k)

        matches      = []
        idea_matches = []
        max_sim      = 0.0

        for i, (score_row, idx_row) in enumerate(zip(scores, indices)):
            top_score   = float(score_row[0])   # cosine similarity (0–1) for normalized vecs
            top_idx     = int(idx_row[0])
            sim_pct     = round(max(0.0, min(100.0, top_score * 100)), 2)

            if sim_pct > max_sim:
                max_sim = sim_pct

            entry = {
                "sentence":      sentences[i],
                "matched_source": corpus[top_idx],
                "similarity":    sim_pct,
                "type":          "exact" if sim_pct > 85 else "paraphrase" if sim_pct > 65 else "idea",
                "alternates":    [
                    {"source": corpus[int(idx_row[j])], "similarity": round(float(score_row[j]) * 100, 2)}
                    for j in range(1, k) if int(idx_row[j]) < len(corpus)
                ]
            }

            if sim_pct > 60:
                matches.append(entry)

            # Idea-level matches (50–65%): conceptual overlap but not paraphrase
            if 50 <= sim_pct <= 65:
                idea_matches.append(entry)

        print(json.dumps({
            "maxSimilarity": round(max_sim, 2),
            "matches":       matches,
            "ideaMatches":   idea_matches,
            "sentenceCount": len(sentences),
            "flaggedCount":  len(matches),
        }))

    except Exception as e:
        print(json.dumps({"error": str(e)}))


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--build":
        build_index()
    else:
        search()
