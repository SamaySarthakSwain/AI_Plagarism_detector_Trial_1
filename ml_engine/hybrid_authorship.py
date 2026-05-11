"""
Feature 8: Human vs AI Hybrid Authorship Segmentation
=======================================================
Instead of giving one overall score, this tool segments the document
into paragraphs and classifies EACH section as:
  - Human-written
  - AI-generated
  - Human-edited AI
  - Uncertain

This is MUCH more useful than a single number.

Approach:
1. Split text into logical segments (paragraphs or ~5-sentence blocks)
2. Extract per-segment features (burstiness, TTR, entropy, AI vocabulary)
3. Apply rule-based scoring per segment
4. Detect stylistic shift points (where authorship changes)
"""

import sys
import json
import re
import math
import collections


# ── AI vocabulary fingerprints ────────────────────────────────────────────────

GPT_VOCAB = {
    "delve", "tapestry", "leverage", "utilize", "comprehensive",
    "navigate", "robust", "facilitate", "paradigm", "holistic", "testament",
    "landscape", "pivotal", "seamless", "crucial", "dynamic",
    "multifaceted", "plethora", "myriad", "embark", "realm", "foster",
    "underscore", "catalyst", "intricate", "nuanced", "symbiotic",
}

AI_TRANSITIONS = {
    "furthermore", "moreover", "in conclusion", "in summary", "ultimately",
    "to summarize", "overall", "additionally", "consequently", "thus", "hence",
    "it is important to note", "first and foremost", "it is worth noting",
    "with regard to", "in terms of", "as a result", "it can be observed",
}

HUMAN_SIGNALS = {
    "i think", "i believe", "i feel", "in my opinion", "from my perspective",
    "honestly", "frankly", "to be honest", "you know", "basically",
    "kind of", "sort of", "actually", "literally", "personally",
    "i've", "we've", "they've", "can't", "won't", "don't", "isn't", "didn't",
}


def compute_segment_entropy(text: str) -> float:
    counts = collections.Counter(c for c in text.lower() if c.isalpha())
    total = sum(counts.values())
    if total == 0:
        return 0.0
    return -sum((c/total) * math.log2(c/total) for c in counts.values() if c > 0)


def compute_burstiness_local(sentences: list[str]) -> float:
    if len(sentences) < 2:
        return 0.0
    lengths = [len(s.split()) for s in sentences]
    mean = sum(lengths) / len(lengths)
    variance = sum((x - mean)**2 for x in lengths) / len(lengths)
    std = math.sqrt(variance)
    return (std - mean) / (std + mean) if (std + mean) > 0 else 0.0


def classify_segment(segment: str) -> dict:
    """Classify a single text segment as human, AI, or hybrid."""
    text_lower = segment.lower()
    sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', segment) if len(s.strip()) > 5]
    words = re.findall(r'\b[a-zA-Z]+\b', segment)
    
    if len(words) < 10:
        return {
            "label": "UNCERTAIN",
            "confidence": 0,
            "aiScore": 0,
            "humanScore": 0,
            "signals": ["Segment too short to classify"],
            "segment": segment[:200]
        }

    word_count = len(words)
    unique_words = set(w.lower() for w in words)
    ttr = len(unique_words) / word_count

    entropy = compute_segment_entropy(segment)
    burstiness = compute_burstiness_local(sentences)
    avg_sent_len = word_count / max(1, len(sentences))

    # Count AI vocabulary hits
    gpt_hits = [w for w in GPT_VOCAB if w in text_lower]
    trans_hits = [t for t in AI_TRANSITIONS if t in text_lower]
    human_hits = [h for h in HUMAN_SIGNALS if h in text_lower]
    
    # Passive voice (simple heuristic)
    passive_count = len(re.findall(r'\b(is|are|was|were|be|been|being)\s+\w+ed\b', text_lower))
    
    # ── Scoring ────────────────────────────────────────────────────────────────
    ai_score = 0
    human_score = 0
    signals = []

    # AI signals
    if gpt_hits:
        ai_score += len(gpt_hits) * 12
        signals.append(f"AI vocab: {', '.join(gpt_hits[:4])}")

    if trans_hits:
        ai_score += len(trans_hits) * 10
        signals.append(f"AI transitions: {', '.join(trans_hits[:3])}")

    if burstiness < 0.05:
        ai_score += 20
        signals.append(f"Uniform sentence length (burstiness={burstiness:.3f})")

    if 14 <= avg_sent_len <= 26:
        ai_score += 10
        signals.append(f"Typical AI sentence length ({avg_sent_len:.1f} words)")

    if ttr < 0.4:
        ai_score += 15
        signals.append(f"Low vocabulary richness (TTR={ttr:.3f})")

    if passive_count > 1:
        ai_score += 8
        signals.append(f"Passive voice ({passive_count} instances)")

    # Human signals
    if human_hits:
        human_score += len(human_hits) * 15
        signals.append(f"Human expressions: {', '.join(human_hits[:3])}")

    if burstiness > 0.2:
        human_score += 20
        signals.append(f"Natural sentence variation (burstiness={burstiness:.3f})")

    if ttr > 0.6:
        human_score += 15
        signals.append(f"Rich vocabulary (TTR={ttr:.3f})")

    if avg_sent_len < 10 or avg_sent_len > 30:
        human_score += 10
        signals.append(f"Unusual sentence length pattern")

    # Normalize
    ai_score = min(100, ai_score)
    human_score = min(100, human_score)

    # Determine label
    if ai_score >= 60 and human_score < 30:
        label = "AI_GENERATED"
        confidence = ai_score
    elif human_score >= 60 and ai_score < 30:
        label = "HUMAN"
        confidence = human_score
    elif ai_score >= 40 and human_score >= 30:
        label = "HUMAN_EDITED_AI"
        confidence = max(ai_score, human_score)
    elif ai_score >= 30:
        label = "SUSPICIOUS"
        confidence = ai_score
    else:
        label = "HUMAN"
        confidence = max(50, human_score)

    return {
        "label": label,
        "confidence": round(confidence, 1),
        "aiScore": round(ai_score, 1),
        "humanScore": round(human_score, 1),
        "metrics": {
            "ttr": round(ttr, 4),
            "entropy": round(entropy, 3),
            "burstiness": round(burstiness, 4),
            "avgSentenceLength": round(avg_sent_len, 1),
            "wordCount": word_count,
        },
        "signals": signals[:5],
        "segment": segment[:300] + ("..." if len(segment) > 300 else ""),
    }


def detect_shift_points(segments: list[dict]) -> list[dict]:
    """Identify where authorship changes between adjacent segments."""
    shifts = []
    for i in range(1, len(segments)):
        prev = segments[i-1]
        curr = segments[i]
        
        label_changed = prev["label"] != curr["label"]
        ai_score_delta = abs(curr["aiScore"] - prev["aiScore"])
        
        if label_changed or ai_score_delta > 35:
            shifts.append({
                "betweenSegments": [i, i+1],
                "from": prev["label"],
                "to": curr["label"],
                "aiScoreDelta": round(ai_score_delta, 1),
                "severity": "HIGH" if ai_score_delta > 50 else "MEDIUM",
                "warning": f"Potential authorship change: {prev['label']} → {curr['label']}"
            })
    
    return shifts


def analyze_hybrid_authorship():
    text = sys.stdin.read().strip()
    if not text:
        print(json.dumps({"error": "No text provided"}))
        return

    # ── Split into segments ───────────────────────────────────────────────────
    # Try paragraph splitting first
    raw_paragraphs = [p.strip() for p in re.split(r'\n{2,}', text) if len(p.strip()) > 30]

    # If no paragraphs, split by sentence groups (~4 sentences each)
    if len(raw_paragraphs) <= 1:
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if len(s.strip()) > 15]
        chunk_size = 4
        raw_paragraphs = [
            ' '.join(sentences[i:i+chunk_size])
            for i in range(0, len(sentences), chunk_size)
            if sentences[i:i+chunk_size]
        ]

    if not raw_paragraphs:
        print(json.dumps({"error": "Could not segment text"}))
        return

    # ── Classify each segment ─────────────────────────────────────────────────
    segment_results = [classify_segment(para) for para in raw_paragraphs]

    # ── Shift detection ───────────────────────────────────────────────────────
    shifts = detect_shift_points(segment_results)

    # ── Overall stats ─────────────────────────────────────────────────────────
    label_counts = collections.Counter(s["label"] for s in segment_results)
    total = len(segment_results)

    human_pct    = round(label_counts.get("HUMAN", 0) / total * 100, 1)
    ai_pct       = round(label_counts.get("AI_GENERATED", 0) / total * 100, 1)
    hybrid_pct   = round(label_counts.get("HUMAN_EDITED_AI", 0) / total * 100, 1)
    suspect_pct  = round(label_counts.get("SUSPICIOUS", 0) / total * 100, 1)

    overall_ai = round(sum(s["aiScore"] for s in segment_results) / total, 1)

    if overall_ai >= 60:
        overall_verdict = "Predominantly AI-Generated"
    elif overall_ai >= 35:
        overall_verdict = "Mixed Human and AI Authorship"
    elif shifts:
        overall_verdict = "Mostly Human with AI Insertions"
    else:
        overall_verdict = "Predominantly Human-Written"

    print(json.dumps({
        "overallVerdict": overall_verdict,
        "overallAiScore": overall_ai,
        "composition": {
            "humanPercent": human_pct,
            "aiPercent": ai_pct,
            "hybridPercent": hybrid_pct,
            "suspiciousPercent": suspect_pct,
        },
        "totalSegments": total,
        "shiftCount": len(shifts),
        "authorshipShifts": shifts,
        "segments": segment_results,
    }))


if __name__ == "__main__":
    analyze_hybrid_authorship()
