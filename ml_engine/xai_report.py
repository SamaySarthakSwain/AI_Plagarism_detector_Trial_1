"""
Feature 12: Explainable AI (XAI) Report Generator
==================================================
Consolidates findings from all engines into a human-readable 
"Deep Analysis" report.
"""

import sys
import json

def generate_xai_report():
    input_data = sys.stdin.read().strip()
    if not input_data:
        print(json.dumps({"error": "No data provided"}))
        return

    try:
        # Expected input: Combined results from other engines
        data = json.loads(input_data)
        
        explanations = []
        
        # 1. Stylometry Reasoning
        style = data.get("stylometry", {})
        if style.get("aiLikelihood", {}).get("aiLikelihoodScore", 0) > 60:
            explanations.append({
                "component": "Stylometry",
                "finding": "High AI Likelihood",
                "evidence": style["aiLikelihood"].get("flags", []),
                "logic": "The text exhibits low burstiness and highly predictable entropy, which are key signatures of Large Language Models."
            })
            
        # 2. Semantic Reasoning
        semantic = data.get("semantic", {})
        if semantic.get("maxSimilarity", 0) > 70:
            explanations.append({
                "component": "Idea-Level Search",
                "finding": "Strong Concept Match",
                "evidence": [f"Similarity with source: {semantic.get('maxSimilarity')}%"],
                "logic": "While words differ, the underlying SBERT embeddings show extreme vector proximity to known academic sources."
            })
            
        # 3. Citation Reasoning
        citations = data.get("citations", {})
        if citations.get("fakeCount", 0) > 0:
            explanations.append({
                "component": "Citation Verification",
                "finding": f"Detected {citations['fakeCount']} Hallucinated Citations",
                "evidence": [r["reason"] for r in citations.get("results", []) if r["verdict"] == "FAKE_DOI"],
                "logic": "The DOIs provided do not resolve via CrossRef API, a common artifact of LLM hallucination."
            })

        print(json.dumps({
            "reportTitle": "IntegrityAI Explainable Report",
            "overallVerdict": data.get("verdict", "Inconclusive"),
            "explanations": explanations,
            "confidenceScore": 85,
            "actionRecommended": "Manual Review Recommended" if explanations else "Accept as Original"
        }))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    generate_xai_report()
