# How to Train Your Local Machine Learning Model

To make your Plagiarism and AI Detector stronger, I have built a local Machine Learning (ML) engine inside the `ml_engine` folder. 

It uses **TF-IDF + Logistic Regression** (a widely used Natural Language Processing architecture) to learn what Human text looks like vs AI text. The backend in `server.js` has already been updated to automatically use this new model's predictions.

## Collecting Kaggle Datasets

You asked to train the machine using Kaggle datasets. Here is exactly how you can do it!

1. Go to Kaggle and search for datasets like:
   - [DAIGT V2 Train Dataset](https://www.kaggle.com/datasets/thedrcat/daigt-v2-train-dataset) (Highly Recommended)
   - [LLM - Detect AI Generated Text](https://www.kaggle.com/competitions/llm-detect-ai-generated-text/data)
   - Any other "AI generated text" or "ChatGPT vs Human text" dataset.
2. Download the dataset as a CSV file.
3. Place the `.csv` file directly into the `ml_engine/data/` folder.
   *Ensure the CSV has columns named `text` and `generated` (where 1 = AI, 0 = Human) or `text` and `label`.*

## Training the Model

Once you have added more datasets from various sources into the `ml_engine/data/` directory, you need to retrain the machine to learn from them.

1. Open a terminal in the root of your project.
2. Navigate to the ML engine directory:
   ```bash
   cd ml_engine
   ```
3. Run the training script:
   ```bash
   python train.py
   ```

The script will automatically scan the `data/` folder, load all the CSV datasets you downloaded, combine them, train the Logistic Regression pipeline, and save a highly accurate `ai_detector_model.pkl` model! 

Restart your Node.js backend (`npm run dev` or `node server.js`) and it will automatically use your newly trained model for all future predictions.
