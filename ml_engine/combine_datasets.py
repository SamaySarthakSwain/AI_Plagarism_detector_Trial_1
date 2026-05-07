import os
import json
import pandas as pd

def load_all_datasets():
    print("Loading paths from downloaded_paths.json...")
    if not os.path.exists("downloaded_paths.json"):
        print("No downloaded_paths.json found.")
        return [], []
        
    with open("downloaded_paths.json", "r") as f:
        paths = json.load(f)

    all_texts = []
    all_labels = []

    for idx, path in paths.items():
        if path is None:
            continue
        print(f"Inspecting path {idx}: {path}")
        
        # Find all CSV files in the path
        csv_files = []
        for root, dirs, files in os.walk(path):
            for file in files:
                if file.endswith(".csv"):
                    csv_files.append(os.path.join(root, file))
                    
        for csv_file in csv_files:
            print(f"Loading {csv_file}...")
            try:
                # Try reading with different encodings if utf-8 fails
                try:
                    df = pd.read_csv(csv_file)
                except UnicodeDecodeError:
                    df = pd.read_csv(csv_file, encoding='latin1')
                
                print(f"Columns found: {list(df.columns)}")
                
                # Heuristic mapping for 'text'
                text_col = None
                for col in df.columns:
                    if col.lower() in ['text', 'content', 'source_text', 'essay', 'string', 'prompt_text', 'review']:
                        text_col = col
                        break
                        
                # Heuristic mapping for 'label' (0 for human, 1 for AI)
                label_col = None
                for col in df.columns:
                    if col.lower() in ['label', 'generated', 'is_ai', 'ai_generated', 'class', 'category']:
                        label_col = col
                        break
                        
                if text_col and label_col:
                    print(f"Using text_col='{text_col}', label_col='{label_col}'")
                    # Clean NA values
                    df_clean = df.dropna(subset=[text_col, label_col])
                    
                    texts = df_clean[text_col].astype(str).tolist()
                    raw_labels = df_clean[label_col].tolist()
                    
                    # Convert labels to 0 (human) and 1 (AI)
                    labels = []
                    for lbl in raw_labels:
                        if isinstance(lbl, (int, float)):
                            labels.append(1 if lbl > 0 else 0)
                        elif isinstance(lbl, str):
                            l = lbl.lower().strip()
                            if l in ['1', 'ai', 'generated', 'true', 'yes', 'machine']:
                                labels.append(1)
                            else:
                                labels.append(0)
                        else:
                            labels.append(0)
                    
                    all_texts.extend(texts)
                    all_labels.extend(labels)
                    print(f"Extracted {len(texts)} samples from {csv_file}")
                else:
                    print(f"Warning: Could not identify text and label columns in {csv_file}")
            except Exception as e:
                print(f"Error reading {csv_file}: {e}")

    print(f"Total samples collected: {len(all_texts)}")
    return all_texts, all_labels
