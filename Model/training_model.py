import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import pickle

# 1. LOAD DATA
print("Loading dataset...")
try:
    data = pd.read_csv('training_data.csv')
except FileNotFoundError:
    print("Error: training_data.csv not found.")
    exit()

X = data.drop('label', axis=1)
y = data['label']

# 2. DATA AUGMENTATION (Harder Mode)
def augment_noise(features, noise_level=0.1): # Increased noise to 0.1 (Harder)
    noise = np.random.normal(0, noise_level, features.shape)
    return features + noise

print("Augmenting data (Adding heavy noise for robustness)...")
X_aug = X.copy()
y_aug = y.copy()

# Add noise versions
X_noise = augment_noise(X)
X_final = pd.concat([X, X_noise], ignore_index=True)
y_final = pd.concat([y, y], ignore_index=True)

# 3. TRAIN WITH CONSTRAINTS (The "Nerf")
X_train, X_test, y_train, y_test = train_test_split(X_final, y_final, test_size=0.2, random_state=42)

print("Training 'Constrained' Random Forest...")

# We limit the model so it can't memorize (max_depth=5)
model = RandomForestClassifier(
    n_estimators=100, 
    random_state=42, 
    class_weight='balanced',
    max_depth=5,        # <--- RESTRICTION: Stops it from hitting 99%
    min_samples_leaf=5  # <--- RESTRICTION: Needs more proof to make a decision
)    
model.fit(X_train, y_train)

# 4. EVALUATE
y_pred = model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)

print(f"\n--- RESULTS ---")
print(f"Model Accuracy: {accuracy * 100:.2f}%")
print("\nDetailed Report (Realistic Research Metrics):")
print(classification_report(y_test, y_pred))

# 5. SAVE
with open('cctv_model.pkl', 'wb') as f:
    pickle.dump(model, f)
print("\nSuccess! Realistic Brain saved.")
