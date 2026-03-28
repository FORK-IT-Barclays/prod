import os
import random
from datetime import datetime, timedelta

# --- Config Constants ---
ECONOMIC_PPP_SCALER = 35.0
F2_OPTIMAL_THRESHOLD = 0.46
HISTORIAN_SENTINEL_ANNUAL_INC = 62000.0
HISTORIAN_SENTINEL_DTI = 17.0
EPS = 1e-6

# Path Configuration (Relative to this shared module)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")

BEHAVIORAL_MODEL_PATH = os.path.join(MODELS_DIR, "behavioral_engine_v2.pkl")
HISTORIAN_MODEL_PATH = os.path.join(MODELS_DIR, "universal_historian_v1.pkl")
HISTORIAN_FEATURE_MAP_PATH = os.path.join(MODELS_DIR, "universal_features_map.pkl")

VELOCITY_WINDOW_DAYS = 90
TOTAL_LOOKBACK_DAYS = 180
FUSION_BEHAVIORAL_CENTER = F2_OPTIMAL_THRESHOLD
FUSION_BEHAVIORAL_WEIGHT = 0.30

# --- Demo Data Generators ---
def build_random_profile(rng: random.Random) -> dict:
    """Creates a random UK-style financial architect profile."""
    inc = rng.randint(22000, 120000)
    return {
        "annual_inc": inc,
        "loan_amnt": rng.randint(5000, 45000),
        "dti": round(rng.uniform(5, 45), 2),
        "term_months": rng.choice([36, 60]),
        "open_acc": rng.randint(2, 12),
        "total_acc": rng.randint(5, 30),
        "revol_bal": rng.randint(1000, 25000),
        "revol_util": round(rng.uniform(10, 95), 2),
        "delinq_2yrs": rng.randint(0, 2),
        "pub_rec": 0,
        "inq_last_6mths": rng.randint(0, 3),
        "installment": round(rng.uniform(150, 950), 2),
        "payment_day": rng.randint(1, 28)
    }

def build_random_transactions(rng: random.Random, profile: dict, count: int = 200) -> list:
    """Simulates multi-month transaction history."""
    txns = []
    balance = rng.uniform(2000, 15000)
    salary = profile["annual_inc"] / 12.0
    start_date = datetime.now() - timedelta(days=200)
    
    for i in range(count):
        tx_date = start_date + timedelta(days=i, hours=rng.randint(0,23))
        is_salary = (tx_date.day == profile.get("payment_day", 1))
        
        if is_salary:
            amt = salary
            desc = "BARCLAYS_SALARY_PYMT"
            tx_type = "CREDIT"
            balance += amt
            credit, debit = amt, 0.0
        else:
            amt = rng.uniform(5, 500)
            desc = rng.choice(["TESCO_STORES", "SHELL_FUEL", "AMZN_UK", "EE_MOBILE", "TRAINLINE"])
            tx_type = "DEBIT"
            balance -= amt
            credit, debit = 0.0, amt
            
        txns.append({
            "transaction_date": tx_date.isoformat(),
            "description": desc,
            "transaction_type": tx_type,
            "credit_amount": round(credit, 2),
            "debit_amount": round(debit, 2),
            "balance": round(balance, 2)
        })
    return txns

def build_next_transaction(rng: random.Random, profile: dict, last_tx: dict) -> dict:
    salary = profile["annual_inc"] / 12.0
    prev_bal = last_tx.get("balance", 5000.0)
    
    is_salary = (datetime.now().day == profile.get("payment_day", 1))
    if is_salary:
        amt, desc, tx_type = salary, "BARCLAYS_SALARY_PYMT", "CREDIT"
        new_bal = prev_bal + amt
        credit, debit = amt, 0.0
    else:
        amt, desc, tx_type = rng.uniform(10, 800), "MISC_UK_EXPENSE", "DEBIT"
        new_bal = prev_bal - amt
        credit, debit = 0.0, amt
        
    return {
        "transaction_date": datetime.now().isoformat(),
        "description": desc,
        "transaction_type": tx_type,
        "credit_amount": round(credit, 2),
        "debit_amount": round(debit, 2),
        "balance": round(new_bal, 2)
    }
