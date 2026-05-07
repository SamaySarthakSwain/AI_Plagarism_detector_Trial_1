import kagglehub
import os
import json

paths = {}
def save_paths():
    with open('downloaded_paths.json', 'w') as f:
        json.dump(paths, f, indent=4)

datasets = [
    ("1", "shanegerami/ai-vs-human-text"),
    ("2", "sunilthite/llm-detect-ai-generated-text-dataset"),
    ("3", "ruvelpereira/mit-plagairism-detection-dataset"),
    ("4", "ehsankhani/student-code-similarity-and-plagiarism-labels"),
    ("5", "lburleigh/tla-lab-ai-detection-for-essays-aide-dataset"),
    ("6", "manisha717/dataset-for-ppt")
]

for id, name in datasets:
    print(f"Downloading dataset {id}: {name}...")
    try:
        path = kagglehub.dataset_download(name)
        print(f"Path {id}:", path)
        paths[id] = path
        save_paths()
    except Exception as e:
        print(f"Failed to download {name}: {e}")

print("All downloads complete!")
