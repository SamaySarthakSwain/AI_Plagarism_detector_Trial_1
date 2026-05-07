import os
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib
import combine_datasets

def load_data():
    print("Loading datasets...")
    texts = []
    labels = []
    
    # 1. Provide an initial baseline dataset so it works immediately
    initial_data = [
        ("The quick brown fox jumps over the lazy dog.", 0), # 0 = Human
        ("I went to the store to buy some groceries for dinner.", 0),
        ("In this paper, we explore the nuances of artificial intelligence.", 0),
        ("As an AI language model, I don't have personal feelings.", 1), # 1 = AI
        ("To summarize, it is crucial to leverage robust synergies to facilitate growth.", 1),
        ("Furthermore, delving into this tapestry reveals a myriad of possibilities.", 1),
        ("Here is a comprehensive overview of the topic you requested.", 1)
    ]
    
    for t, l in initial_data:
        texts.append(t)
        labels.append(l)

    # 2. Try loading HuggingFace Datasets (Optional, uncomment to download gigabytes of data)
    try:
        from datasets import load_dataset
        print("Attempting to load data from Hugging Face...")
        # Using a small subset of a known AI text dataset to keep training fast.
        # "Hello-SimpleAI/HC3" is a popular ChatGPT vs Human dataset.
        # We load a small portion for demonstration.
        hf_data = load_dataset("Hello-SimpleAI/HC3", name="all", split="train[:5%]", trust_remote_code=True)
        
        for item in hf_data:
            # Human answers
            if 'human_answers' in item and len(item['human_answers']) > 0:
                texts.append(item['human_answers'][0])
                labels.append(0)
            # AI answers
            if 'chatgpt_answers' in item and len(item['chatgpt_answers']) > 0:
                texts.append(item['chatgpt_answers'][0])
                labels.append(1)
        print(f"Successfully loaded HF dataset. Total samples so far: {len(texts)}")
    except Exception as e:
        print(f"Skipping Hugging Face dataset: {e}")

    # 3. Load from Kaggle / Local CSV files
    # If the user drops Kaggle datasets into ml_engine/data/ folder:
    data_dir = os.path.join(os.path.dirname(__file__), "data")
    if os.path.exists(data_dir):
        for file in os.listdir(data_dir):
            if file.endswith(".csv"):
                print(f"Loading local dataset: {file}")
                df = pd.read_csv(os.path.join(data_dir, file))
                # Assuming the Kaggle CSV has 'text' and 'generated' (1 for AI, 0 for Human) columns
                # Adjust column names as needed based on the Kaggle dataset downloaded
                if 'text' in df.columns and 'generated' in df.columns:
                    texts.extend(df['text'].dropna().tolist())
                    labels.extend(df['generated'].dropna().tolist())
                elif 'text' in df.columns and 'label' in df.columns:
                    texts.extend(df['text'].dropna().tolist())
                    labels.extend(df['label'].dropna().tolist())
                else:
                    print(f"Skipping {file}: Could not find 'text' and 'generated'/'label' columns.")

    # 4. Load from dynamically downloaded Kaggle datasets
    print("Loading downloaded Kaggle datasets...")
    kaggle_texts, kaggle_labels = combine_datasets.load_all_datasets()
    texts.extend(kaggle_texts)
    labels.extend(kaggle_labels)
    
    return texts, labels

def train_model():
    texts, labels = load_data()
    
    if len(texts) < 10:
        print("Warning: Very small dataset. Please download Kaggle datasets into the ml_engine/data folder.")
        
    print(f"Training model on {len(texts)} samples...")
    
    # Split the data
    X_train, X_test, y_train, y_test = train_test_split(texts, labels, test_size=0.2, random_state=42)
    
    # Create a TF-IDF + Logistic Regression pipeline
    # We use n-grams up to 2 (words and pairs of words)
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(max_features=50000, ngram_range=(1, 2))),
        ('clf', LogisticRegression(C=1.0, max_iter=1000))
    ])
    
    print("Fitting model...")
    pipeline.fit(X_train, y_train)
    
    print("Evaluating model...")
    predictions = pipeline.predict(X_test)
    print(classification_report(y_test, predictions, target_names=["Human (0)", "AI (1)"]))
    
    # Save the model
    model_path = os.path.join(os.path.dirname(__file__), "ai_detector_model.pkl")
    joblib.dump(pipeline, model_path)
    print(f"Model successfully saved to {model_path}!")

if __name__ == "__main__":
    train_model()
