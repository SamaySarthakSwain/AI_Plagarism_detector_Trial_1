"""
Feature 2: Writing Style Fingerprinting (Stylometry)
=====================================================
Analyzes the unique linguistic fingerprint of a text.
Detects:
 - Whether different sections were written by different authors
 - AI vs Human authorship signals from stylometric features
 - Stylistic inconsistencies that suggest AI injection

Metrics:
 - Average sentence length (complexity)
 - Vocabulary richness (Type-Token Ratio)
 - Shannon Entropy (predictability)
 - Passive voice frequency
 - POS tag distributions (noun/verb/adj ratios)
 - Punctuation density
 - Lexical diversity across paragraphs
 - Burstiness (variance in sentence length — humans are bursty, AI is uniform)
"""

import sys
import json
import math
import re
import collections

# ── Dependency guard ─────────────────────────────────────────────────────────
try:
    import spacy
except ImportError:
    print(json.dumps({"error": "spacy not installed. Run: pip install spacy && python -m spacy download en_core_web_sm"}))
    sys.exit(1)


def load_nlp():
    try:
        return spacy.load("en_core_web_sm")
    except OSError:
        print(json.dumps({"error": "Model not found. Run: python -m spacy download en_core_web_sm"}))
        sys.exit(1)


def shannon_entropy(text: str) -> float:
    """Shannon entropy over character distribution (higher = more random/human-like)."""
    counts = collections.Counter(text)
    total = sum(counts.values())
    if total == 0:
        return 0.0
    return round(-sum((c / total) * math.log2(c / total) for c in counts.values() if c > 0), 3)


def burstiness(sentence_lengths: list[int]) -> float:
    """
    Burstiness = (std - mean) / (std + mean).
    Human writing is bursty (B > 0).
    AI writing is uniform (B near 0 or negative).
    """
    if len(sentence_lengths) < 2:
        return 0.0
    mean = sum(sentence_lengths) / len(sentence_lengths)
    variance = sum((x - mean) ** 2 for x in sentence_lengths) / len(sentence_lengths)
    std = math.sqrt(variance)
    if std + mean == 0:
        return 0.0
    return round((std - mean) / (std + mean), 4)


def lexical_diversity_per_paragraph(paragraphs: list[str], nlp) -> list[dict]:
    """Compute TTR and avg sentence length per paragraph for authorship shift detection."""
    results = []
    for i, para in enumerate(paragraphs):
        if len(para.strip()) < 20:
            continue
        doc = nlp(para)
        words = [t for t in doc if not t.is_punct and not t.is_space]
        sents = list(doc.sents)
        ttr = len(set(t.lower_ for t in words)) / max(1, len(words))
        avg_len = sum(len(list(s)) for s in sents) / max(1, len(sents))
        passive = sum(1 for t in doc if t.dep_ in ("nsubjpass", "auxpass"))
        results.append({
            "paragraph": i + 1,
            "ttr": round(ttr, 4),
            "avgSentenceLength": round(avg_len, 2),
            "passiveCount": passive,
            "wordCount": len(words),
        })
    return results


def ai_likelihood_score(metrics: dict) -> dict:
    """
    Heuristic scoring to determine AI vs Human likelihood.
    Returns score 0–100 and explanation flags.
    """
    score = 0
    flags = []

    avg_len = metrics["averageSentenceLength"]
    ttr = metrics["vocabularyRichness"]
    entropy = metrics["entropy"]
    passive_freq = metrics["passiveVoiceFrequency"]
    burstiness_val = metrics["burstiness"]
    comma_density = metrics["commaDensity"]

    # AI tends to have moderate, consistent sentence lengths (15–25 words)
    if 14 <= avg_len <= 26:
        score += 20
        flags.append("Sentence length in typical AI range (14–26 words)")

    # AI has lower vocabulary richness (reuses words more)
    if ttr < 0.45:
        score += 20
        flags.append(f"Low vocabulary richness (TTR={ttr:.3f}) — AI tends to reuse vocabulary")

    # AI has lower entropy (more predictable word patterns)
    if entropy < 4.2:
        score += 15
        flags.append(f"Low character entropy ({entropy}) — unusually predictable text")

    # AI uses passive voice more frequently
    if passive_freq > 0.08:
        score += 10
        flags.append(f"High passive voice frequency ({passive_freq:.3f})")

    # AI is NOT bursty — uniform sentence lengths
    if burstiness_val < 0.1:
        score += 25
        flags.append(f"Low burstiness ({burstiness_val:.4f}) — human writing varies more")

    # AI uses many commas (complex compound sentences)
    if comma_density > 0.04:
        score += 10
        flags.append(f"High comma density ({comma_density:.4f}) — long compound sentences")

    score = min(100, score)

    if score >= 70:
        verdict = "AI-Generated"
    elif score >= 45:
        verdict = "Possibly AI-Assisted"
    elif score >= 25:
        verdict = "Uncertain"
    else:
        verdict = "Likely Human"

    return {"aiLikelihoodScore": score, "verdict": verdict, "flags": flags}


def analyze_style():
    nlp = load_nlp()
    text = sys.stdin.read().strip()

    if not text:
        print(json.dumps({"error": "No text provided"}))
        return

    doc = nlp(text)

    # ── Basic counts ─────────────────────────────────────────────────────────
    sentences     = list(doc.sents)
    all_tokens    = [t for t in doc if not t.is_space]
    words         = [t for t in all_tokens if not t.is_punct]
    num_words     = len(words)
    num_sentences = len(sentences)

    if num_sentences == 0 or num_words == 0:
        print(json.dumps({"error": "Text too short for analysis"}))
        return

    # ── Sentence lengths ──────────────────────────────────────────────────────
    sent_lengths = [len([t for t in s if not t.is_punct and not t.is_space]) for s in sentences]
    avg_sent_len = sum(sent_lengths) / num_sentences

    # ── Vocabulary richness (TTR) ─────────────────────────────────────────────
    unique_words = set(t.lower_ for t in words)
    ttr = len(unique_words) / num_words

    # ── Entropy ──────────────────────────────────────────────────────────────
    entropy = shannon_entropy(text)

    # ── Passive voice ─────────────────────────────────────────────────────────
    passive_count = sum(1 for t in doc if t.dep_ in ("nsubjpass", "auxpass"))
    passive_freq  = passive_count / num_sentences

    # ── POS distribution ─────────────────────────────────────────────────────
    pos_counts = collections.Counter(t.pos_ for t in words)
    pos_dist   = {pos: round(count / num_words, 4) for pos, count in pos_counts.most_common(10)}

    # ── Punctuation analysis ──────────────────────────────────────────────────
    punct_counts = collections.Counter(t.text for t in all_tokens if t.is_punct)
    total_punct  = sum(punct_counts.values())
    comma_density = punct_counts.get(",", 0) / max(1, len(all_tokens))

    # ── Burstiness ────────────────────────────────────────────────────────────
    burst = burstiness(sent_lengths)

    # ── Transition words (AI overuses them) ──────────────────────────────────
    TRANSITIONS = {
        "furthermore", "moreover", "in conclusion", "in summary", "ultimately",
        "additionally", "consequently", "thus", "hence", "therefore",
        "it is important to note", "first and foremost", "overall"
    }
    text_lower = text.lower()
    transition_count = sum(1 for tw in TRANSITIONS if tw in text_lower)
    transition_density = transition_count / num_sentences

    # ── Paragraph-level analysis ──────────────────────────────────────────────
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    if len(paragraphs) < 2:
        paragraphs = [p.strip() for p in text.split("\n") if len(p.strip()) > 40]
    para_analysis = lexical_diversity_per_paragraph(paragraphs, nlp)

    # ── Authorship shift detection ─────────────────────────────────────────────
    authorship_shifts = []
    if len(para_analysis) >= 2:
        for j in range(1, len(para_analysis)):
            prev = para_analysis[j-1]
            curr = para_analysis[j]
            ttr_shift = abs(curr["ttr"] - prev["ttr"])
            len_shift = abs(curr["avgSentenceLength"] - prev["avgSentenceLength"])
            if ttr_shift > 0.15 or len_shift > 8:
                authorship_shifts.append({
                    "betweenParagraphs": [prev["paragraph"], curr["paragraph"]],
                    "ttrShift": round(ttr_shift, 4),
                    "sentLengthShift": round(len_shift, 2),
                    "warning": "Possible author change or AI injection detected"
                })

    # ── Aggregate metrics ─────────────────────────────────────────────────────
    metrics = {
        "averageSentenceLength": round(avg_sent_len, 2),
        "vocabularyRichness": round(ttr, 4),
        "entropy": entropy,
        "passiveVoiceFrequency": round(passive_freq, 4),
        "burstiness": burst,
        "commaDensity": round(comma_density, 4),
        "transitionDensity": round(transition_density, 4),
        "posDistribution": pos_dist,
        "punctuationCounts": dict(punct_counts.most_common(5)),
        "wordCount": num_words,
        "sentenceCount": num_sentences,
        "uniqueWordCount": len(unique_words),
    }

    # ── AI likelihood ─────────────────────────────────────────────────────────
    likelihood = ai_likelihood_score(metrics)

    result = {
        "metrics": metrics,
        "aiLikelihood": likelihood,
        "paragraphAnalysis": para_analysis,
        "authorshipShifts": authorship_shifts,
    }

    print(json.dumps(result))


if __name__ == "__main__":
    analyze_style()
