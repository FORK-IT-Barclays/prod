import os
from datetime import datetime, timezone
import pandas as pd
from pymongo import MongoClient
try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

DEFAULT_URI = "mongodb://localhost:27017"
DEFAULT_DB = "realtime_risk_engine"
DEFAULT_CUSTOMERS_COLLECTION = "customers"
DEFAULT_TRANSACTIONS_COLLECTION = "transactions"
# .env is in parent directory relative to microservice layers
ENV_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")

class MongoRiskRepository:
    """Consolidated state management layer for VECTOR signals and ML metrics."""
    
    def __init__(self, uri: str, db_name: str = DEFAULT_DB, customers_collection: str = DEFAULT_CUSTOMERS_COLLECTION, transactions_collection: str = DEFAULT_TRANSACTIONS_COLLECTION):
        self.client = MongoClient(uri)
        self.db = self.client[db_name]
        self.customers = self.db[customers_collection]
        self.transactions = self.db[transactions_collection]

    @classmethod
    def from_env(cls):
        if load_dotenv is not None:
            load_dotenv(ENV_PATH, override=True)
        uri = os.getenv("MONGODB_URI", DEFAULT_URI)
        db_name = os.getenv("MONGODB_DB_NAME", DEFAULT_DB)
        return cls(uri, db_name)

    def ping(self): return self.client.admin.command("ping")
    def ensure_indexes(self):
        self.customers.create_index("account_id", unique=True)
        self.transactions.create_index("account_id", unique=True)

    def get_customer(self, id: str): return self.customers.find_one({"account_id": id}, {"_id": 0})
    def get_transactions(self, id: str): return self.transactions.find_one({"account_id": id}, {"_id": 0})
    def load_transaction_records(self, id: str): return (self.get_transactions(id) or {}).get("transactions", [])
    def load_profile(self, id: str): return (self.get_customer(id) or {}).get("profile")

    def upsert_customer(self, account_id: str, profile: dict):
        self.customers.update_one({"account_id": account_id}, {"$set": {"account_id": account_id, "profile": profile, "updated_at": datetime.now(timezone.utc).isoformat()}}, upsert=True)

    def append_transaction(self, account_id: str, txn: dict):
        self.transactions.update_one({"account_id": account_id}, {"$set": {"account_id": account_id, "updated_at": datetime.now(timezone.utc).isoformat()}, "$push": {"transactions": txn}}, upsert=True)

    def load_transaction_frame(self, account_id: str):
        txns = self.load_transaction_records(account_id)
        if not txns: return None
        rows = []
        for tx in txns:
            rows.append({
                "Transaction Date": tx["transaction_date"],
                "Transaction Description": tx["description"],
                "Transaction Type": tx["transaction_type"],
                "Credit Amount": tx["credit_amount"],
                "Debit Amount": tx["debit_amount"],
                "Balance": tx["balance"]
            })
        return pd.DataFrame(rows)

    def list_account_ids(self):
        cids = set(self.customers.distinct("account_id"))
        tids = set(self.transactions.distinct("account_id"))
        return sorted(cids | tids)

    def save_prediction_result(self, account_id: str, result: dict):
        now = datetime.now(timezone.utc).isoformat()
        snapshot = {
            "calculated_at": now,
            "status": result.get("status", "OK"),
            "final_risk_score": result.get("final_risk_score"),
            "historian_score": result.get("historian", {}).get("historian_score") if result.get("historian") else None,
            "behavioral_score": result.get("behavioral", {}).get("behavioral_score") if result.get("behavioral") else None,
            "signals": result.get("behavioral", {}).get("signals") if result.get("behavioral") else {},
            "velocity": result.get("kinematics", {}).get("velocity", 0.1),
            "acceleration": result.get("kinematics", {}).get("acceleration", 0.0),
            "stress_archetype": result.get("stress_archetype", "STABLE_MONITOR"),
            "diagnosis": result.get("diagnosis", "Parameters within range.")
        }
        self.customers.update_one(
            {"account_id": account_id},
            {
                "$set": {
                    "latest_prediction": snapshot,
                    "updated_at": now,
                    "final_risk_score": snapshot["final_risk_score"],
                    "stress_archetype": snapshot["stress_archetype"]
                },
                "$push": {"risk_history": {"$each": [snapshot], "$slice": -100}}
            },
            upsert=True
        )
