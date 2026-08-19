"""
ML Training Pipeline — ArjunaVision Risk Model
Trains a Random Forest classifier on synthetic safety data.
"""
import numpy as np
import pickle
import os
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
import json

np.random.seed(42)

# ─── Synthetic Data Generation ─────────────────────────────────
def generate_dataset(n_samples=5000):
    """Generate synthetic labeled safety data."""
    data = []
    labels = []

    for _ in range(n_samples):
        # Random signal flags
        fall = np.random.random() < 0.15
        health_anomaly = np.random.random() < 0.12
        movement_anomaly = np.random.random() < 0.10
        route_deviation = np.random.random() < 0.08
        inactivity = np.random.random() < 0.15
        no_response = np.random.random() < 0.10
        gps_unavailable = np.random.random() < 0.05
        health_severity = np.random.uniform(0, 1) if health_anomaly else 0.0

        # Realistic health readings
        if health_anomaly:
            hr = np.random.normal(110, 20)
            systolic = np.random.normal(150, 20)
            spo2 = np.random.normal(93, 2)
        else:
            hr = np.random.normal(72, 10)
            systolic = np.random.normal(118, 10)
            spo2 = np.random.normal(98, 1)

        hr = np.clip(hr, 40, 200)
        systolic = np.clip(systolic, 80, 200)
        spo2 = np.clip(spo2, 85, 100)

        features = [
            int(fall), int(health_anomaly), int(movement_anomaly),
            int(route_deviation), int(inactivity), int(no_response),
            int(gps_unavailable), health_severity, hr, systolic, spo2
        ]

        # Label: HIGH_RISK (1) vs NOT (0)
        risk_score = (
            fall * 0.35 + health_anomaly * 0.25 + health_severity * 0.15 +
            movement_anomaly * 0.10 + route_deviation * 0.15 +
            inactivity * 0.15 + no_response * 0.25 +
            (1 if spo2 < 94 else 0) * 0.20 +
            (1 if hr > 130 or hr < 45 else 0) * 0.15
        )

        # Correlate signals for realism
        if fall and no_response:
            risk_score += 0.20
        if fall and health_anomaly and inactivity:
            risk_score += 0.25

        label = 1 if risk_score > 0.5 else 0

        data.append(features)
        labels.append(label)

    return np.array(data), np.array(labels)


def train():
    print("=" * 60)
    print("ArjunaVision — Risk Detection Model Training")
    print("=" * 60)

    X, y = generate_dataset(5000)
    print(f"\nDataset: {len(X)} samples | Class balance: {y.mean():.1%} high-risk")

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    # Random Forest pipeline
    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", RandomForestClassifier(
            n_estimators=150,
            max_depth=10,
            class_weight="balanced",  # Important: prefer false positives over false negatives
            random_state=42,
            n_jobs=-1,
        )),
    ])

    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)
    y_proba = pipeline.predict_proba(X_test)[:, 1]

    print("\n-- Metrics --------------------------------------")
    print(f"Accuracy:  {accuracy_score(y_test, y_pred):.3f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=["SAFE", "HIGH_RISK"]))
    print("\nConfusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    print(f"  TN={cm[0,0]}  FP={cm[0,1]}")
    print(f"  FN={cm[1,0]}  TP={cm[1,1]}")
    print(f"\n  False Negatives (missed emergencies): {cm[1,0]}")
    print(f"  [WARN] Minimizing false negatives is critical for safety.")

    # Feature importances
    feature_names = [
        "fall_detected", "health_anomaly", "movement_anomaly",
        "route_deviation", "inactivity", "no_response",
        "gps_unavailable", "health_severity", "heart_rate",
        "systolic_bp", "blood_oxygen"
    ]
    importances = pipeline.named_steps["clf"].feature_importances_
    print("\n-- Feature Importances --------------------------")
    for name, imp in sorted(zip(feature_names, importances), key=lambda x: -x[1]):
        bar = "#" * int(imp * 50)
        print(f"  {name:25s} {imp:.3f}  {bar}")

    # Save model
    model_dir = os.path.join(os.path.dirname(__file__), "..", "models")
    os.makedirs(model_dir, exist_ok=True)
    model_path = os.path.join(model_dir, "risk_model.pkl")
    with open(model_path, "wb") as f:
        pickle.dump(pipeline, f)
    print(f"\n[OK] Model saved to {model_path}")

    # Save metadata
    meta = {
        "model_type": "RandomForestClassifier",
        "n_estimators": 150,
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "features": feature_names,
        "training_samples": len(X_train),
        "class_balance": float(y.mean()),
        "false_negatives": int(cm[1, 0]),
        "true_positives": int(cm[1, 1]),
    }
    with open(os.path.join(model_dir, "metadata.json"), "w") as f:
        json.dump(meta, f, indent=2)
    print("[OK] Metadata saved")
    print("\n" + "=" * 60)


if __name__ == "__main__":
    train()
