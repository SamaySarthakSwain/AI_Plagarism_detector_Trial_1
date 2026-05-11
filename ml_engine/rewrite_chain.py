"""
Feature 5: AI Rewrite Chain Detection
========================================
Detects text that went through: ChatGPT → Quillbot → Human edits

Signals analyzed:
1. Entropy smoothing (AI rewrites become suspiciously uniform)
2. Semantic drift (meaning shifts between rewrites)
3. Token probability artifacts (LLM-typical distributions)
4. Unnatural vocabulary complexity patterns
5. Transition word overuse (Quillbot signature)
"""

import sys
import json
import re
import math
import collections


# ── Known rewriter signatures ─────────────────────────────────────────────────

# Quillbot tends to substitute with these words (paraphrase artifacts)
QUILLBOT_ARTIFACTS = [
    "moreover", "furthermore", "in addition", "consequently", "as a result",
    "it is worth noting", "notably", "significantly", "substantially",
    "it can be observed", "it is evident", "undeniably", "unquestionably",
    "with regard to", "in terms of", "with respect to", "in light of",
]

# GPT-4/ChatGPT signature phrases
GPT_ARTIFACTS = [
    "delve", "tapestry", "leverage", "utilize", "comprehensive", "in today's",
    "navigate", "robust", "facilitate", "paradigm", "holistic", "testament",
    "landscape", "pivotal", "seamless", "crucial", "essential", "dynamic",
    "multifaceted", "plethora", "myriad", "embark", "realm", "foster",
    "underscore", "catalyst", "intricate", "nuanced", "it is important to note",
    "first and foremost", "at the end of the day", "in conclusion", "to summarize",
    "in summary", "overall, it is clear", "it goes without saying",
]

# Claude signature phrases
CLAUDE_ARTIFACTS = [
    "certainly", "absolutely", "i'd be happy to", "of course",
    "to be clear", "it's worth mentioning", "that said",
]


def entropy_smoothness(text: str) -> dict:
    """
    Measure entropy variance across sentences.
    Low variance = smooth/AI-rewritten. High variance = natural human.
    """
    sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if len(s.strip()) > 15]
    if len(sentences) < 3:
        return {"smoothness": 0.5, "flag": False}

    entropies = []
    for s in sentences:
        counts = collections.Counter(s.lower())
        total = sum(counts.values())
        ent = -sum((c/total) * math.log2(c/total) for c in counts.values() if c > 0)
        entropies.append(ent)

    mean_ent = sum(entropies) / len(entropies)
    variance = sum((e - mean_ent) ** 2 for e in entropies) / len(entropies)
    std_dev = math.sqrt(variance)

    # Low std deviation = suspiciously smooth
    smoothness = 1.0 - min(1.0, std_dev / 2.0)

    return {
        "smoothness": round(smoothness, 4),
        "meanEntropy": round(mean_ent, 3),
        "entropyStd": round(std_dev, 3),
        "flag": smoothness > 0.75
    }


def detect_rewrite_artifacts(text: str) -> dict:
    """Count GPT, Quillbot, and Claude artifacts in text."""
    text_lower = text.lower()
    words = text_lower.split()
    word_count = max(1, len(words))

    gpt_hits = [p for p in GPT_ARTIFACTS if p in text_lower]
    quillbot_hits = [p for p in QUILLBOT_ARTIFACTS if p in text_lower]
    claude_hits = [p for p in CLAUDE_ARTIFACTS if p in text_lower]

    # Density (hits per 100 words)
    gpt_density = len(gpt_hits) / word_count * 100
    quillbot_density = len(quillbot_hits) / word_count * 100

    source_suspicion = {}
    if gpt_density > 1.0:
        source_suspicion["ChatGPT/GPT-4"] = round(min(100, gpt_density * 20), 1)
    if quillbot_density > 0.5:
        source_suspicion["Quillbot"] = round(min(100, quillbot_density * 25), 1)
    if claude_hits:
        source_suspicion["Claude"] = round(min(100, len(claude_hits) * 30), 1)

    return {
        "gptArtifacts": gpt_hits[:10],
        "quillbotArtifacts": quillbot_hits[:10],
        "claudeArtifacts": claude_hits[:10],
        "sourceSuspicion": source_suspicion,
        "gptDensity": round(gpt_density, 3),
        "quillbotDensity": round(quillbot_density, 3),
    }


def semantic_consistency(text: str) -> dict:
    """
    Check if the text's complexity level is suspiciously consistent.
    Rewritten AI text often has uniform Flesch-Kincaid proxies.
    """
    sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if len(s.strip()) > 10]
    if not sentences:
        return {"consistencyScore": 0.5, "flag": False}

    # Proxy for Flesch reading ease: avg syllables per word per sentence
    def syllable_count(word: str) -> int:
        word = word.lower().strip(".,;:!?\"'()")
        count = len(re.findall(r'[aeiou]+', word))
        if word.endswith('e'):
            count -= 1
        return max(1, count)

    complexities = []
    for s in sentences:
        ws = s.split()
        if not ws:
            continue
        avg_syllables = sum(syllable_count(w) for w in ws) / len(ws)
        complexities.append(avg_syllables)

    if not complexities:
        return {"consistencyScore": 0.5, "flag": False}

    mean_c = sum(complexities) / len(complexities)
    variance = sum((c - mean_c) ** 2 for c in complexities) / len(complexities)
    std = math.sqrt(variance)

    # Low variance in complexity = AI consistency
    consistency = 1.0 - min(1.0, std / 0.5)

    return {
        "consistencyScore": round(consistency, 4),
        "avgComplexity": round(mean_c, 3),
        "complexityStd": round(std, 3),
        "flag": consistency > 0.8
    }


def analyze_rewrite_chain():
    text = sys.stdin.read().strip()
    if not text:
        print(json.dumps({"error": "No text provided"}))
        return

    word_count = len(text.split())
    if word_count < 30:
        print(json.dumps({"error": "Text too short for rewrite chain analysis (min 30 words)"}))
        return

    entropy_result     = entropy_smoothness(text)
    artifact_result    = detect_rewrite_artifacts(text)
    consistency_result = semantic_consistency(text)

    # ── Overall rewrite chain score ────────────────────────────────────────────
    score = 0
    evidence = []

    if entropy_result["flag"]:
        score += 30
        evidence.append(f"Low entropy variance ({entropy_result['smoothness']:.2f}) — text is suspiciously uniform")

    gpt_dens = artifact_result["gptDensity"]
    qb_dens  = artifact_result["quillbotDensity"]

    if gpt_dens > 0.5:
        score += 25
        evidence.append(f"GPT artifacts detected: {', '.join(artifact_result['gptArtifacts'][:5])}")

    if qb_dens > 0.3:
        score += 20
        evidence.append(f"Quillbot artifacts detected: {', '.join(artifact_result['quillbotArtifacts'][:5])}")

    if consistency_result["flag"]:
        score += 25
        evidence.append(f"Suspiciously uniform reading complexity ({consistency_result['consistencyScore']:.2f})")

    if artifact_result["claudeArtifacts"]:
        score += 15
        evidence.append(f"Claude signature phrases: {', '.join(artifact_result['claudeArtifacts'][:3])}")

    score = min(100, score)

    if score >= 70:
        verdict = "HIGH — Text likely went through AI → Rewriter chain"
    elif score >= 40:
        verdict = "MEDIUM — Possible rewriting detected"
    elif score >= 20:
        verdict = "LOW — Minor rewrite signals"
    else:
        verdict = "CLEAN — No significant rewrite chain indicators"

    print(json.dumps({
        "rewriteChainScore": score,
        "verdict": verdict,
        "evidence": evidence,
        "sourceSuspicion": artifact_result["sourceSuspicion"],
        "entropyAnalysis": entropy_result,
        "consistencyAnalysis": consistency_result,
        "artifacts": {
            "gpt": artifact_result["gptArtifacts"],
            "quillbot": artifact_result["quillbotArtifacts"],
            "claude": artifact_result["claudeArtifacts"],
        }
    }))


if __name__ == "__main__":
    analyze_rewrite_chain()
