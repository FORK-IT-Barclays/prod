import os
import joblib
import pandas as pd
import numpy as np
from datetime import datetime, timezone
from typing import Dict, Optional

from shared.utils import (
    BEHAVIORAL_MODEL_PATH, HISTORIAN_MODEL_PATH, HISTORIAN_FEATURE_MAP_PATH,
    ECONOMIC_PPP_SCALER, EPS, VELOCITY_WINDOW_DAYS, 
    HISTORIAN_SENTINEL_ANNUAL_INC, HISTORIAN_SENTINEL_DTI,
    FUSION_BEHAVIORAL_CENTER, FUSION_BEHAVIORAL_WEIGHT
)

# --- Score Fusion Logic ---
def fuse_scores(historian: Optional[float], behavioral: Optional[float]) -> Optional[float]:
    """Combines structural (historian) and behavioral risk scores."""
    if historian is None and behavioral is None: return None
    if historian is None: return behavioral
    if behavioral is None: return historian
    
    # Sigmoidal centering for behavioral drift detection
    dist = behavioral - FUSION_BEHAVIORAL_CENTER
    behavioral_impact = 1 / (1 + np.exp(-1 * 12 * dist))
    
    # Weighted ensemble (Structural Baseline + Behavioral Signal)
    fused = (historian * (1 - FUSION_BEHAVIORAL_WEIGHT)) + (behavioral_impact * FUSION_BEHAVIORAL_WEIGHT)
    return float(np.clip(fused, 0, 1))

# --- Data Transformation Logic ---
class MoneyVisTransformer:
    """Standardizes UK-style banking transactions into tabular analytic frames."""
    def transform_batch(self, raw_df: pd.DataFrame) -> pd.DataFrame:
        if raw_df is None or raw_df.empty: return pd.DataFrame()
        df = raw_df.copy()
        df["date"] = pd.to_datetime(df["Transaction Date"], format="mixed", dayfirst=True)
        df["cash_in"] = df["Credit Amount"].astype(float).fillna(0)
        df["cash_out"] = df["Debit Amount"].abs().astype(float).fillna(0)
        df["balance"] = df["Balance"].astype(float).fillna(0)
        
        def tag_exp(desc):
            desc = str(desc).upper()
            if any(x in desc for x in ["SALARY", "PYMT"]): return "SALARY"
            if any(x in desc for x in ["LOAN", "MTG"]): return "LOAN_PAYMENT"
            if any(x in desc for x in ["TESCO", "ASDA", "SANS"]): return "GROCERY"
            return "MISC"
        df["tag"] = df["Transaction Description"].apply(tag_exp)
        return df.sort_values("date")

# --- Signal Extraction Logic ---
class RealTimeFeatureEngine:
    """Computes VECTOR Velocity signals for financial deterioration detection."""
    def compute_signals(self, ledger_df: pd.DataFrame, ref_date: pd.Timestamp) -> Optional[Dict[str, float]]:
        t2_end = ref_date
        t2_start = t2_end - pd.Timedelta(days=VELOCITY_WINDOW_DAYS)
        t1_start = t2_start - pd.Timedelta(days=VELOCITY_WINDOW_DAYS)
        
        df_t2 = ledger_df[(ledger_df["date"] >= t2_start) & (ledger_df["date"] < t2_end)]
        df_t1 = ledger_df[(ledger_df["date"] >= t1_start) & (ledger_df["date"] < t2_start)]
        
        df_t1 = df_t1[df_t1["tag"] != "LOAN_PAYMENT"]
        df_t2 = df_t2[df_t2["tag"] != "LOAN_PAYMENT"]
        if len(df_t1) < 2 or len(df_t2) < 2: return None
            
        def v(t1, t2): return float(np.clip((t2 - t1) / (abs(t1) + EPS), -5, 5))
        
        in_t1, in_t2 = df_t1["cash_in"].sum(), df_t2["cash_in"].sum()
        bal_t1, bal_t2 = df_t1["balance"].mean(), df_t2["balance"].mean()
        od_t1, od_t2 = (df_t1["balance"] < 0).sum(), (df_t2["balance"] < 0).sum()
        
        return {
            "income_erosion_v":     v(in_t1, in_t2),
            "liquidity_momentum_v": v(bal_t1, bal_t2),
            "overdraft_v":          float(np.clip(od_t2 - od_t1, -5, 5)),
            "tx_freq_v":            v(len(df_t1), len(df_t2)),
            "avg_balance_t2":       float(bal_t2 * ECONOMIC_PPP_SCALER),
            "min_balance_t2":       float(df_t2["balance"].min() * ECONOMIC_PPP_SCALER),
            "total_out_t2":         float(df_t2["cash_out"].sum() * ECONOMIC_PPP_SCALER),
            "total_in_t2":          float(in_t2 * ECONOMIC_PPP_SCALER),
            "overdraft_t2":         float(od_t2),
            "salary_drift_v":       v(in_t1, in_t2)
        }

# --- Risk Engine Logic ---
class UniversalHistorian:
    """Structural risk baseline model based on banking ledger fields."""
    def __init__(self):
        self.model = joblib.load(HISTORIAN_MODEL_PATH)
        self.feature_names = list(joblib.load(HISTORIAN_FEATURE_MAP_PATH))
        self.model_version = os.path.basename(HISTORIAN_MODEL_PATH)

    def score_profile(self, profile: Dict[str, float]) -> Dict[str, object]:
        # Preprocessing and deriving ratio features
        df = pd.DataFrame([profile])
        df["annual_inc"] = df["annual_inc"].replace(0.0, HISTORIAN_SENTINEL_ANNUAL_INC).fillna(HISTORIAN_SENTINEL_ANNUAL_INC)
        df["loan_to_income_ratio"] = df["loan_amnt"] / df["annual_inc"]
        df["installment_burden"] = df["installment"] / (df["annual_inc"] / 12.0)
        
        for col in self.feature_names: 
            if col not in df: df[col] = 0.0
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)
            
        probability = float(self.model.predict_proba(df[self.feature_names])[0, 1])
        return {"historian_score": round(probability, 4), "scored_at": datetime.now(timezone.utc).isoformat()}

class RiskEngine:
    """Dual-model synthesis engine (VECTOR Core)."""
    def __init__(self):
        self.transformer = MoneyVisTransformer()
        self.feature_engine = RealTimeFeatureEngine()
        self.historian = UniversalHistorian()
        
        artifact = joblib.load(BEHAVIORAL_MODEL_PATH)
        self.behavioral_model = artifact["model"]
        self.behavioral_feature_names = list(artifact["features"])

    def predict_risk(self, raw_tx_df: pd.DataFrame, profile: dict, account_id: str = "T123", history: list = None):
        h_score = self.historian.score_profile(profile)["historian_score"]
        
        ledger = self.transformer.transform_batch(raw_tx_df)
        signals = self.feature_engine.compute_signals(ledger, ledger["date"].max())
        
        b_score = 0.0
        if signals:
            X = pd.DataFrame([signals])[self.behavioral_feature_names]
            b_score = float(self.behavioral_model.predict_proba(X)[0, 1])
            
        f_score = fuse_scores(h_score, b_score)
        
        # 9-Zone Kinematic Trajectory Logic
        vel = 0.0
        accel = 0.0
        if history and len(history) > 0:
            last_entry = history[-1]
            last_score = last_entry.get("final_risk_score", f_score) if isinstance(last_entry, dict) else f_score
            vel = f_score - last_score
            
            # Acceleration calculation (d²S/dt²)
            if len(history) > 1:
                prev_last = history[-2]
                prev_last_score = prev_last.get("final_risk_score", last_score) if isinstance(prev_last, dict) else last_score
                prev_vel = last_score - prev_last_score
                accel = vel - prev_vel

        # Map to Z1-Z9
        zone = "Z5" # Default
        if vel < -0.01:
            if accel < -0.01: zone = "Z1" # Sustainable Recovery
            elif accel > 0.01: zone = "Z3" # Plateauing Recovery
            else: zone = "Z2" # Steady Improvement
        elif vel > 0.01:
            if accel < -0.01: zone = "Z7" # Slowing Slide
            elif accel > 0.01: zone = "Z9" # Acute Crisis
            else: zone = "Z8" # Linear Deterioration
        else:
            if accel < -0.01: zone = "Z4" # Entering Stability
            elif accel > 0.01: zone = "Z6" # Emerging Volatility
            else: zone = "Z5" # Equilibrium
            
        archetype_map = {
            "Z1": "SUSTAINABLE_RECOVERY", "Z2": "STEADY_IMPROVEMENT", "Z3": "PLATEAUING_RECOVERY",
            "Z4": "ENTERING_STABILITY", "Z5": "STABLE_EQUILIBRIUM", "Z6": "EMERGING_VOLATILITY",
            "Z7": "SLOWING_DETERIORATION", "Z8": "LINEAR_DETERIORATION", "Z9": "ACUTE_CRISIS"
        }
        archetype = archetype_map.get(zone, "STABLE_EQUILIBRIUM")
        diagnosis = f"Categorized as {archetype} ({zone}) based on kinematic trajectory."

        explanations = self.explain_behavioral(signals)

        return {
            "account_id": account_id,
            "final_risk_score": round(f_score, 4),
            "kinematics": {"velocity": round(vel, 4), "acceleration": round(accel, 4), "zone": zone},
            "stress_archetype": archetype,
            "diagnosis": diagnosis,
            "behavioral": {
                "signals": signals, 
                "behavioral_score": round(b_score, 4),
                "shap_explanations": explanations
            },
            "historian": {"historian_score": h_score}
        }
