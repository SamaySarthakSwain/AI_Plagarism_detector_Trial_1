"""
Feature 6: Knowledge Graph Comparison
=======================================
Detects structural plagiarism by extracting logical triples (S-V-O) 
and entity relationships.

Architecture:
1. Extract Named Entities (NER)
2. Extract Subject-Verb-Object (SVO) triples using spaCy dependency parsing
3. Construct a local "idea graph"
4. Compare input graph against a reference logical structure
"""

import sys
import json
import collections

try:
    import spacy
except ImportError:
    print(json.dumps({"error": "Missing: pip install spacy"}))
    sys.exit(1)

def load_nlp():
    try:
        return spacy.load("en_core_web_sm")
    except OSError:
        print(json.dumps({"error": "Missing model: python -m spacy download en_core_web_sm"}))
        sys.exit(1)

def extract_triples(doc):
    """Extract (Subject, Relation, Object) triples from a spaCy doc."""
    triples = []
    for token in doc:
        if token.pos_ == "VERB":
            subj = [w for w in token.lefts if w.dep_ in ("nsubj", "nsubjpass")]
            obj = [w for w in token.rights if w.dep_ in ("dobj", "pobj", "attr", "obj")]
            
            if subj and obj:
                triples.append({
                    "subject": subj[0].text.lower(),
                    "relation": token.lemma_.lower(),
                    "object": obj[0].text.lower(),
                    "full_subj": " ".join([t.text for t in subj[0].subtree]),
                    "full_obj": " ".join([t.text for t in obj[0].subtree])
                })
    return triples

def extract_entities(doc):
    """Extract named entities and their types."""
    return [{"text": ent.text, "label": ent.label_} for ent in doc.ents]

def analyze_logic():
    nlp = load_nlp()
    text = sys.stdin.read().strip()
    if not text:
        print(json.dumps({"error": "No text provided"}))
        return

    doc = nlp(text)
    triples = extract_triples(doc)
    entities = extract_entities(doc)
    
    # Analyze logical density
    entity_types = collections.Counter([e["label"] for e in entities])
    
    # Heuristic for "Stolen Logic" 
    # (In a real system, we'd compare this to a DB of known logical flows)
    logic_density = len(triples) / max(1, len(list(doc.sents)))
    
    print(json.dumps({
        "triples": triples,
        "entities": entities,
        "logicDensity": round(logic_density, 2),
        "entityDistribution": dict(entity_types),
        "summary": f"Extracted {len(triples)} logical relationships and {len(entities)} entities.",
        "verdict": "LOGIC_STRUCTURE_EXTRACTED"
    }))

if __name__ == "__main__":
    analyze_logic()
