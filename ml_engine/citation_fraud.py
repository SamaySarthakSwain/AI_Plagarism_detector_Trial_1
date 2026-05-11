"""
Feature 4: Citation Fraud Detection
=====================================
Detects fake, hallucinated, or incorrect citations in academic text.

Pipeline:
1. Extract all citation patterns from text
2. Query CrossRef API to verify paper existence
3. Score citation validity (real/fake/unverified)
4. Return detailed report with evidence

Supported citation formats:
 - APA: Author (Year). Title. Journal.
 - IEEE: [1] Author, "Title," Journal, vol., pp., year.
 - MLA: Author. "Title." Journal, vol., year.
 - Inline: (Author, Year) or (Author et al., Year)
"""

import sys
import json
import re
import urllib.request
import urllib.parse
import urllib.error
import time


# ── Citation Pattern Library ──────────────────────────────────────────────────

CITATION_PATTERNS = [
    # Inline parenthetical: (Smith, 2020) or (Smith et al., 2019)
    {
        "pattern": r'\(([A-Z][a-z]+(?:\s+et\s+al\.)?),\s*(\d{4})\)',
        "type": "inline_apa",
        "groups": ["author", "year"]
    },
    # APA-style inline with page: (Smith, 2020, p. 45)
    {
        "pattern": r'\(([A-Z][a-z]+(?:\s+et\s+al\.)?),\s*(\d{4}),\s*p+\.\s*\d+\)',
        "type": "inline_apa_page",
        "groups": ["author", "year"]
    },
    # Quoted attribution: According to Smith (2020)
    {
        "pattern": r'(?:according to|as stated by|as noted by|as argued by|as shown by)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*\((\d{4})\)',
        "type": "attribution",
        "groups": ["author", "year"]
    },
    # "Harvard study" / "MIT research" / institution mentions
    {
        "pattern": r'(?:a|an|the)\s+(Harvard|MIT|Stanford|Oxford|Cambridge|Yale|Princeton|Columbia|Berkeley|UCLA|Chicago)\s+(?:study|research|paper|report)',
        "type": "institution",
        "groups": ["institution"]
    },
    # IEEE numbered reference: [1], [2], etc.
    {
        "pattern": r'\[(\d+)\]',
        "type": "ieee_ref",
        "groups": ["ref_num"]
    },
    # Direct DOI mentions
    {
        "pattern": r'(?:doi:|DOI:)\s*(10\.\d{4,}/\S+)',
        "type": "doi",
        "groups": ["doi"]
    },
    # "Studies show" / "Research indicates" (vague, non-verifiable)
    {
        "pattern": r'(?:studies show|research indicates|research suggests|experts say|scientists found|researchers found|it has been shown)',
        "type": "vague_reference",
        "groups": []
    },
]


def extract_citations(text: str) -> list[dict]:
    """Extract all citation instances from text."""
    citations = []
    text_lower = text.lower()

    for cpat in CITATION_PATTERNS:
        flags = re.IGNORECASE if cpat["type"] in ("attribution", "institution", "vague_reference") else 0
        for match in re.finditer(cpat["pattern"], text, flags):
            entry = {
                "type": cpat["type"],
                "raw": match.group(0),
                "position": match.start(),
                "context": text[max(0, match.start()-60):match.end()+60].strip(),
                "details": {}
            }
            for i, g in enumerate(cpat["groups"]):
                try:
                    entry["details"][g] = match.group(i + 1)
                except IndexError:
                    pass
            citations.append(entry)

    return citations


def query_crossref(author: str, year: str) -> dict:
    """
    Query CrossRef API to check if a paper by this author/year exists.
    Returns verification result.
    """
    try:
        query = f"{author} {year}"
        encoded = urllib.parse.quote(query)
        url = f"https://api.crossref.org/works?query={encoded}&rows=3&select=title,author,published-print,DOI"
        
        req = urllib.request.Request(url, headers={
            "User-Agent": "IntegrityAI-CitationChecker/1.0 (academic-tool)"
        })
        
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
        
        items = data.get("message", {}).get("items", [])
        if not items:
            return {"found": False, "confidence": 0}
        
        top = items[0]
        pub_year = None
        if "published-print" in top:
            date_parts = top["published-print"].get("date-parts", [[]])
            if date_parts and date_parts[0]:
                pub_year = str(date_parts[0][0])
        
        # Check if year matches
        year_match = pub_year == year if pub_year else False
        
        # Check if any author surname matches
        authors = top.get("author", [])
        author_surnames = [a.get("family", "").lower() for a in authors]
        author_match = any(author.lower() in s or s in author.lower() for s in author_surnames)
        
        confidence = 0
        if author_match:
            confidence += 50
        if year_match:
            confidence += 30
        if items:
            confidence += 20

        return {
            "found": confidence > 50,
            "confidence": min(100, confidence),
            "topResult": {
                "title": top.get("title", ["Unknown"])[0] if top.get("title") else "Unknown",
                "doi": top.get("DOI", ""),
                "year": pub_year,
                "authors": [f"{a.get('given','')} {a.get('family','')}" for a in authors[:3]]
            }
        }
    except Exception as e:
        return {"found": None, "confidence": 0, "error": str(e)}


def verify_doi(doi: str) -> dict:
    """Verify a DOI exists via doi.org."""
    try:
        url = f"https://doi.org/{doi}"
        req = urllib.request.Request(url, method="HEAD", headers={
            "User-Agent": "IntegrityAI-CitationChecker/1.0"
        })
        with urllib.request.urlopen(req, timeout=5) as resp:
            return {"valid": resp.status < 400, "resolvedUrl": resp.url}
    except urllib.error.HTTPError as e:
        return {"valid": e.code < 400, "statusCode": e.code}
    except Exception as e:
        return {"valid": False, "error": str(e)}


def score_citation(citation: dict, verification: dict) -> dict:
    """Assign risk score and verdict to a citation."""
    ctype = citation["type"]
    
    if ctype == "vague_reference":
        return {
            "riskScore": 70,
            "verdict": "UNVERIFIABLE",
            "reason": "Vague reference with no specific source — cannot be verified"
        }
    
    if ctype == "institution":
        institution = citation["details"].get("institution", "")
        return {
            "riskScore": 60,
            "verdict": "SUSPICIOUS",
            "reason": f"'{institution} study' claim without specific citation — common in AI-generated text"
        }
    
    if ctype == "doi":
        if verification.get("valid"):
            return {"riskScore": 5, "verdict": "VERIFIED", "reason": "DOI resolves to a real paper"}
        else:
            return {"riskScore": 95, "verdict": "FAKE_DOI", "reason": "DOI does not resolve — likely hallucinated"}
    
    if ctype in ("inline_apa", "inline_apa_page", "attribution"):
        confidence = verification.get("confidence", 0)
        found = verification.get("found")
        
        if found is None:
            return {"riskScore": 40, "verdict": "UNVERIFIED", "reason": "Could not query CrossRef (network error)"}
        elif found and confidence > 70:
            return {"riskScore": 10, "verdict": "VERIFIED", "reason": f"Paper found in CrossRef (confidence={confidence}%)"}
        elif found and confidence > 40:
            return {"riskScore": 35, "verdict": "POSSIBLE_MATCH", "reason": f"Partial match found (confidence={confidence}%)"}
        else:
            return {"riskScore": 80, "verdict": "NOT_FOUND", "reason": f"No matching paper found in CrossRef"}
    
    return {"riskScore": 50, "verdict": "UNKNOWN", "reason": "Unknown citation type"}


def check_citations():
    text = sys.stdin.read().strip()
    if not text:
        print(json.dumps({"error": "No text provided"}))
        return

    citations = extract_citations(text)
    
    if not citations:
        print(json.dumps({
            "totalCitations": 0,
            "verifiedCount": 0,
            "suspiciousCount": 0,
            "fakeCount": 0,
            "overallRisk": 0,
            "verdict": "NO_CITATIONS",
            "results": [],
            "summary": "No citation patterns detected in this text."
        }))
        return

    results = []
    verified = 0
    suspicious = 0
    fake = 0

    for i, citation in enumerate(citations[:15]):  # Limit to 15 citations per run
        verification = {}
        
        # Rate limit: 1 request/sec to be polite to APIs
        if i > 0:
            time.sleep(0.5)
        
        ctype = citation["type"]
        if ctype in ("inline_apa", "inline_apa_page", "attribution"):
            author = citation["details"].get("author", "")
            year   = citation["details"].get("year", "")
            if author and year:
                verification = query_crossref(author, year)
        
        elif ctype == "doi":
            doi = citation["details"].get("doi", "")
            if doi:
                verification = verify_doi(doi)
        
        scoring = score_citation(citation, verification)
        
        verdict = scoring["verdict"]
        if verdict == "VERIFIED":
            verified += 1
        elif verdict in ("FAKE_DOI", "NOT_FOUND"):
            fake += 1
        elif verdict in ("SUSPICIOUS", "UNVERIFIABLE"):
            suspicious += 1

        results.append({
            "citation": citation["raw"],
            "type": ctype,
            "context": citation["context"],
            "verification": verification,
            "riskScore": scoring["riskScore"],
            "verdict": verdict,
            "reason": scoring["reason"],
        })

    total = len(results)
    overall_risk = round(
        (fake * 90 + suspicious * 60 + (total - fake - suspicious - verified) * 40) / max(1, total)
    )

    if overall_risk >= 70:
        summary_verdict = "HIGH_RISK — Multiple fake or unverifiable citations detected"
    elif overall_risk >= 40:
        summary_verdict = "MEDIUM_RISK — Some citations could not be verified"
    elif overall_risk >= 15:
        summary_verdict = "LOW_RISK — Most citations appear legitimate"
    else:
        summary_verdict = "CLEAN — Citations appear valid"

    print(json.dumps({
        "totalCitations": total,
        "verifiedCount": verified,
        "suspiciousCount": suspicious,
        "fakeCount": fake,
        "overallRisk": overall_risk,
        "verdict": summary_verdict,
        "results": results,
    }))


if __name__ == "__main__":
    check_citations()
