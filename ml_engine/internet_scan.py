"""
Feature 7: Real-Time Internet Scanning
=========================================
Live comparison of submitted text against web content.

Architecture:
1. Extract key sentences from input text
2. Search web for matching content (DuckDuckGo)
3. Scrape returned pages for text
4. Compute semantic similarity against scraped content
5. Return ranked matches with URLs and similarity scores

Note: Uses only standard library for HTTP to avoid extra dependencies.
      DuckDuckGo HTML scraping (no API key required).
"""

import sys
import json
import re
import urllib.request
import urllib.parse
import html
import time


def extract_key_sentences(text: str, max_sentences: int = 5) -> list[str]:
    """Extract the most important sentences for searching."""
    sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if len(s.strip()) > 30]
    
    # Prefer longer, more specific sentences (more unique = better search terms)
    sentences.sort(key=lambda s: len(s), reverse=True)
    return sentences[:max_sentences]


def ddg_search(query: str) -> list[dict]:
    """Search DuckDuckGo HTML (no API key needed) and return result URLs + snippets."""
    try:
        encoded = urllib.parse.quote(query[:120])
        url = f"https://html.duckduckgo.com/html/?q={encoded}"
        
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (compatible; academic-integrity-checker/1.0)",
            "Accept": "text/html",
        })
        
        with urllib.request.urlopen(req, timeout=8) as resp:
            content = resp.read().decode("utf-8", errors="ignore")
        
        results = []
        
        # Extract results from DDG HTML
        result_blocks = re.findall(r'<div class="result[^"]*"[^>]*>(.*?)</div>\s*</div>', content, re.DOTALL)
        
        for block in result_blocks[:5]:
            # Extract URL
            url_match = re.search(r'href="(https?://[^"]+)"', block)
            # Extract title
            title_match = re.search(r'<a[^>]*class="result__a"[^>]*>(.*?)</a>', block, re.DOTALL)
            # Extract snippet
            snippet_match = re.search(r'<a[^>]*class="result__snippet"[^>]*>(.*?)</a>', block, re.DOTALL)
            
            if url_match:
                clean_url = url_match.group(1)
                # Skip DDG internal links
                if "duckduckgo.com" in clean_url:
                    continue
                    
                title = ""
                if title_match:
                    title = re.sub(r'<[^>]+>', '', title_match.group(1)).strip()
                    title = html.unescape(title)
                    
                snippet = ""
                if snippet_match:
                    snippet = re.sub(r'<[^>]+>', '', snippet_match.group(1)).strip()
                    snippet = html.unescape(snippet)
                
                results.append({"url": clean_url, "title": title, "snippet": snippet})
        
        return results
        
    except Exception as e:
        return [{"error": str(e)}]


def scrape_page_text(url: str, max_chars: int = 3000) -> str:
    """Fetch and clean text from a URL."""
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (compatible; academic-integrity-checker/1.0)",
            "Accept": "text/html",
        })
        
        with urllib.request.urlopen(req, timeout=6) as resp:
            content = resp.read().decode("utf-8", errors="ignore")
        
        # Remove scripts, styles
        content = re.sub(r'<script[^>]*>.*?</script>', ' ', content, flags=re.DOTALL | re.IGNORECASE)
        content = re.sub(r'<style[^>]*>.*?</style>', ' ', content, flags=re.DOTALL | re.IGNORECASE)
        
        # Remove all HTML tags
        text = re.sub(r'<[^>]+>', ' ', content)
        text = html.unescape(text)
        
        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text[:max_chars]
        
    except Exception:
        return ""


def simple_similarity(text_a: str, text_b: str) -> float:
    """
    Fast word-overlap similarity (Jaccard index).
    For production: use SBERT embeddings.
    """
    if not text_a or not text_b:
        return 0.0
    
    # Normalize and tokenize
    words_a = set(re.findall(r'\b[a-z]{3,}\b', text_a.lower()))
    words_b = set(re.findall(r'\b[a-z]{3,}\b', text_b.lower()))
    
    if not words_a or not words_b:
        return 0.0
    
    intersection = len(words_a & words_b)
    union = len(words_a | words_b)
    
    return round(intersection / union, 4) if union > 0 else 0.0


def ngram_similarity(text_a: str, text_b: str, n: int = 3) -> float:
    """N-gram overlap similarity — catches phrase matches better."""
    def get_ngrams(text, n):
        words = re.findall(r'\b[a-z]{2,}\b', text.lower())
        return set(tuple(words[i:i+n]) for i in range(len(words)-n+1))
    
    ngrams_a = get_ngrams(text_a, n)
    ngrams_b = get_ngrams(text_b, n)
    
    if not ngrams_a or not ngrams_b:
        return 0.0
    
    intersection = len(ngrams_a & ngrams_b)
    return round(intersection / max(len(ngrams_a), len(ngrams_b)), 4)


def scan_internet():
    text = sys.stdin.read().strip()
    if not text:
        print(json.dumps({"error": "No text provided"}))
        return

    word_count = len(text.split())
    if word_count < 20:
        print(json.dumps({"error": "Text too short for internet scanning (min 20 words)"}))
        return

    key_sentences = extract_key_sentences(text, max_sentences=3)
    
    all_web_results = []
    scraped_matches = []

    for i, sentence in enumerate(key_sentences):
        if i > 0:
            time.sleep(1)  # Rate limit
        
        search_results = ddg_search(sentence)
        
        for result in search_results[:3]:
            if result.get("error") or result.get("url") in [r.get("url") for r in all_web_results]:
                continue
            
            # Add to results list
            all_web_results.append(result)
            
            # Scrape page content
            page_text = scrape_page_text(result["url"])
            if not page_text:
                continue
            
            # Compare
            word_sim = simple_similarity(text, page_text)
            phrase_sim = ngram_similarity(text, page_text, n=4)
            
            # Combined similarity (phrase match is more indicative)
            combined_sim = round(word_sim * 0.4 + phrase_sim * 0.6, 4)
            similarity_pct = round(combined_sim * 100, 1)
            
            if similarity_pct > 5:  # Only report meaningful matches
                scraped_matches.append({
                    "url": result["url"],
                    "title": result.get("title", "Unknown"),
                    "snippet": result.get("snippet", ""),
                    "wordSimilarity": round(word_sim * 100, 1),
                    "phraseSimilarity": round(phrase_sim * 100, 1),
                    "combinedSimilarity": similarity_pct,
                    "verdict": (
                        "HIGH_MATCH" if similarity_pct > 40 else
                        "MEDIUM_MATCH" if similarity_pct > 15 else
                        "LOW_MATCH"
                    )
                })
    
    # Sort by similarity
    scraped_matches.sort(key=lambda x: x["combinedSimilarity"], reverse=True)
    
    # Overall plagiarism score from internet
    max_similarity = max((m["combinedSimilarity"] for m in scraped_matches), default=0)
    high_matches = [m for m in scraped_matches if m["verdict"] == "HIGH_MATCH"]
    
    if max_similarity > 40:
        verdict = "PLAGIARISM_DETECTED — Content found on the web"
    elif max_similarity > 15:
        verdict = "SUSPICIOUS — Partial matches found"
    elif scraped_matches:
        verdict = "LOW_RISK — Minor overlaps found (common phrases)"
    else:
        verdict = "CLEAN — No significant web matches found"

    print(json.dumps({
        "maxSimilarity": max_similarity,
        "verdict": verdict,
        "matchCount": len(scraped_matches),
        "highMatchCount": len(high_matches),
        "searchedSentences": key_sentences,
        "matches": scraped_matches[:8],
        "webResultsScanned": len(all_web_results),
    }))


if __name__ == "__main__":
    scan_internet()
