# 🛡️ IntegrityAI: Technical Whitepaper & Exhaustive Documentation

IntegrityAI represents a paradigm shift in academic honesty tools. While traditional detectors rely on simple string matching, IntegrityAI treats text as a multi-dimensional data structure, analyzing semantic vectors, linguistic biometrics, and cross-lingual relationships. This document serves as the definitive guide to its architecture, methodology, and data foundations.

---

## 🚀 1. Detailed Feature Breakdown (Minimum 100 Words Each)

### 🧠 F1: Idea-Level Semantic Detection
Most plagiarism tools fail when a user rewords a sentence using synonyms. IntegrityAI solves this by utilizing **Sentence-BERT (SBERT)** embeddings to map the "meaning" of text into a 384-dimensional vector space. By calculating the **Cosine Similarity** between the input and a massive academic corpus stored in a **FAISS (Facebook AI Similarity Search)** vector database, the system identifies conceptual overlaps. This means that if a student takes a unique argument about medical ethics and rewrites it in their own words, the mathematical "distance" between the two ideas remains extremely small, triggering a high-confidence plagiarism flag. This approach is essential for catching high-level academic dishonesty where the *logic* is stolen, not just the *words*.

### 🖊️ F2: Writing Style Fingerprinting (Stylometry)
Every human has a unique "linguistic fingerprint" defined by their vocabulary choice, sentence complexity, and punctuation habits. IntegrityAI performs **Stylometric Analysis** by measuring metrics like **Shannon Entropy** (predictability of character patterns) and **Burstiness** (the variance in sentence length). AI models like GPT-4 are designed to be helpful and clear, which often results in "smooth" text with low burstiness and predictable entropy. By contrast, human writing is naturally "erratic"—it features sudden shifts in complexity and irregular sentence structures. Our system uses **spaCy** to extract POS (Part-of-Speech) distributions, allowing us to detect if a specific paragraph was likely written by a different author or an AI model by identifying stylistic inconsistencies.

### 🖼️ F3: Multi-modal Plagiarism Detection
Modern cheating isn't limited to text; it often involves screenshots of paywalled papers or diagrams from textbooks. IntegrityAI's **Multi-modal engine** utilizes **Tesseract OCR (Optical Character Recognition)** to extract text from images, scanned PDFs, and even handwritten notes. Once the text is extracted, it is passed through the same semantic pipeline as standard text. Furthermore, the system uses image embeddings to detect "Visual Plagiarism"—where the layout or structure of a diagram is identical to a known source. This ensures that students cannot bypass detection by simply "flattening" their work into an image file, a common trick used to evade standard text-based scanners.

### 📚 F4: Citation Fraud & Hallucination Detection
One of the biggest issues with AI-generated academic work is "hallucination"—the tendency for models to invent plausible-sounding but fake citations. IntegrityAI addresses this by integrating directly with the **CrossRef REST API**, which indexes over 120 million scholarly records. When a citation is detected, our system extracts the **DOI (Digital Object Identifier)** or author/year metadata and queries the global academic index in real-time. If the citation does not resolve to a real paper, or if the paper's title does not match the claims made in the text, the system flags it as "Citation Fraud." This is critical for maintaining academic integrity in research papers where source verification is mandatory.

### 🔗 F5: AI Rewrite Chain Detection
Sophisticated users often try to hide AI content by running it through "rewriters" like Quillbot or WordAI. IntegrityAI detects these **Rewrite Chains** by identifying "Linguistic Artifacts" left behind by paraphrasing algorithms. These tools often over-utilize specific transition words (e.g., "Furthermore", "Notably", "In light of") and smooth out the complexity of the text to make it more readable. By analyzing the **Token Probability Distribution** and comparing it against known rewrite signatures, IntegrityAI can identify if a document has been through a "GPT -> Rewriter -> Human Edit" pipeline. This multi-layered approach makes it significantly harder for users to "launder" AI-generated content into original-looking prose.

### 🕸️ F6: Knowledge Graph Comparison (Logical Mapping)
Plagiarism can occur at the level of the *argument structure*. IntegrityAI uses **Natural Language Processing (NLP)** to extract Subject-Verb-Object (SVO) triples from the text, constructing a temporary **Knowledge Graph** of the document's logic. For example, if a paper argues that "AI (Subject) improves (Verb) Healthcare (Object)" and follows it with specific evidence, our system maps this relationship. By comparing the resulting graph against the logic graphs of known academic papers, we can detect "Logical Plagiarism"—where the user has stolen the entire flow and reasoning of an author's work without using any of their original words. This is the most advanced form of structural detection currently available.

### 🌐 F7: Real-Time Internet Scanning
While many tools rely on old database snapshots, IntegrityAI performs **Real-Time Internet Scans** using the **DuckDuckGo HTML Engine**. When a document is submitted, the system extracts the three most "unique" and complex sentences and queries the live web index. The system then scrapes the top 5 results, cleans the HTML content, and performs a **Jaccard Similarity** check against the user's submission. This allows us to catch plagiarism from news articles, blogs, and social media posts that were published just minutes ago. This real-time capability is essential for newsrooms and universities that need to verify content against the rapidly evolving digital landscape.

### 👥 F8: Hybrid Authorship Segmentation
Traditional tools give a single "AI %" for the whole document, which is often misleading. IntegrityAI uses **Segmented Authorship Analysis** to break a document into logical paragraphs and analyze each one independently. This allows the system to identify "Hybrid Documents"—where a human has written the introduction but used an AI to generate the technical body of the text. By highlighting specific sections as "Likely AI," "Likely Human," or "Human-Edited AI," we provide teachers with a granular "Heatmap" of originality. This transparency helps avoid false positives and allows for more nuanced conversations about academic integrity and the proper use of AI tools.

### 🌍 F9/F10: Cross-Language & Translation Plagiarism
A common form of high-level plagiarism involves taking a source in one language (e.g., a German academic paper) and translating it into another (e.g., English). IntegrityAI uses **Multilingual Siamese Networks** (specifically `paraphrase-multilingual-MiniLM-L12-v2`) which map 50+ languages into a single, shared vector space. In this space, the English sentence "The cat sat on the mat" and its French equivalent "Le chat s'est assis sur le tapis" have nearly identical coordinates. By comparing English submissions against our multilingual corpus, we can detect if a user has simply "translated their way" around plagiarism, a trick that defeats almost every other major detector on the market today.

### 🕵️ F11: Behavioral Forensics & Authorship Shifts
This feature analyzes the **lexical consistency** across a single document to identify sudden "Authorship Shifts." If the first three paragraphs use simple vocabulary and short sentences, but the fourth paragraph suddenly features graduate-level terminology and complex passive voice, the system flags a "Behavioral Inconsistency." This often indicates that the user has "pasted" a high-quality source into their own work. By monitoring the variance in **Type-Token Ratio (TTR)** and **Readability Indices (Flesch-Kincaid)**, IntegrityAI identifies the exact moment where the writing style changes, providing clear evidence of external intervention or "Copy-Paste" plagiarism that string-matching alone would miss.

### 📝 F12: Explainable AI (XAI) Deep Reports
One of the biggest complaints about AI detectors is that they are "Black Boxes"—they give a score but no reason. IntegrityAI's **Deep Reason Report** provides a full breakdown of *why* a document was flagged. It cites specific evidence, such as: "Low entropy detected in Paragraph 3," "Unresolved DOI in Citation 2," or "Semantic overlap with Wikipedia's entry on Thermodynamics." By synthesizing findings from the stylometric, semantic, and citation engines into a human-readable report, we empower users and educators to understand the logic behind the score. This explainability is crucial for academic appeals and ensures that the platform is used as a fair and transparent tool for learning.

---

## 🏗️ 2. Technical Architecture: How it was Made

IntegrityAI was developed using a **De-coupled Micro-Engine Architecture** to ensure high performance and scalability. The frontend is built with **React 18** and **Vite**, utilizing **TypeScript** for type safety and **Tailwind CSS** for a premium, responsive UI. The styling incorporates **Aurora background shaders** and **Glassmorphism**, creating a state-of-the-art user experience that feels more like a modern creative tool than a dry academic scanner.

The backend is an **Express (Node.js)** orchestrator that manages a fleet of **Python ML workers**. When a request arrives, the Node.js server validates the input and spawns a specific Python process for the requested analysis (e.g., `stylometry.py` or `semantic_search.py`). This allows us to leverage the massive ecosystem of Python ML libraries (like **PyTorch**, **Transformers**, and **spaCy**) while maintaining the high-concurrency and fast I/O of Node.js. All vector data is managed by **FAISS (Facebook AI Similarity Search)**, which allows for near-instant retrieval of similar ideas from our reference database.

---

## 📊 3. Data Science: Sources & Volume

### The Datasets
IntegrityAI's models are trained on several multi-gigabyte datasets to ensure high accuracy. For AI detection, we utilize the **DAIGT (Detecting AI-Generated Text)** dataset from Kaggle, which contains over 500,000 human and AI-authored essays across various prompts. For semantic search, we use a curated version of the **WikiText-103** and **ArXiv Open Access** corpora, which provide a "Golden Standard" for human academic prose. These datasets allow our models to learn the subtle statistical differences between how humans and AI structure arguments and choose vocabulary.

### The APIs & Platforms
The platform is integrated with several industry-leading APIs to provide real-time verification capabilities. **CrossRef** provides the backbone for citation verification, giving us access to metadata for over 120 million scholarly works. **DuckDuckGo** serves as our real-time web crawler, allowing us to bypass the heavy costs and latency of traditional search APIs. The entire platform is designed to be deployment-ready for **Vercel** and **Netlify**, using serverless edge functions for simple tasks and high-performance local servers for the heavy-lifting ML engines. All transformer models are hosted on **Hugging Face**, ensuring that we are always using the latest, most optimized weights for our analysis.

---

## 🧪 4. The Scoring Logic: Weighted Probability Fusion

IntegrityAI does not rely on a single algorithm; instead, it uses a **Weighted Probability Fusion (WPF)** system to calculate the final "Integrity Score." Each engine (Semantic, Stylometric, Citation, etc.) generates an independent confidence score from 0-100. The system then applies a weighted average based on the reliability of each tool for the given text length:
*   **Semantic Overlap (40%)**: The strongest indicator of conceptual plagiarism.
*   **Stylometric Variance (30%)**: Critical for detecting AI-generated content.
*   **Fact/Citation Integrity (20%)**: Essential for identifying "Hallucinated" AI work.
*   **Structural Logic (10%)**: Adds a final layer of logical consistency check.

This multi-factor approach ensures that the final result is robust and resistant to "adversarial attacks" where a user might try to fool one specific engine while failing others.
