import sys
import os
import joblib
import json

def predict():
    text = sys.stdin.read().strip()
    if not text:
        print(json.dumps({"error": "No text provided"}))
        return
    
    model_path = os.path.join(os.path.dirname(__file__), "ai_detector_model.pkl")
    
    if not os.path.exists(model_path):
        print(json.dumps({"error": "Model not found. Please run train.py first."}))
        return

    try:
        pipeline = joblib.load(model_path)
        
        # predict_proba returns [[prob_human, prob_ai]]
        probs = pipeline.predict_proba([text])[0]
        prob_ai = float(probs[1]) * 100
        
        print(json.dumps({"aiScore": prob_ai}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    predict()
