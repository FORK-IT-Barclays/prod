import os
import random
import time
import logging
from datetime import datetime, timezone
import pandas as pd
from pymongo import MongoClient
import sys

# Add Risk-prediction to path to reuse shared logic
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "Risk-prediction/realtime_risk_engine"))

from demo_data import build_next_transaction, build_random_profile, build_random_transactions
from shared.store import MongoRiskRepository

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] VECTOR_L1: %(message)s')
logger = logging.getLogger("vector_layer_1")

class DataStreamingLayer:
    """
    Layer 1: Continuous Ingestion & Metric Aggregation.
    
    Responsible for simulating or fetching real-time transactions and 
    continuously computing spend metrics relative to salary.
    """
    
    def __init__(self, interval=2.0):
        self.repo = MongoRiskRepository.from_env()
        self.rng = random.Random()
        self.interval = interval
        self.account_ids = []

    def _ensure_seed(self):
        self.account_ids = self.repo.list_account_ids()
        if not self.account_ids:
            logger.info("No accounts found. Seeding initial portfolio...")
            for i in range(1, 11):
                account_id = f"CUST_{i:03d}"
                profile = build_random_profile(self.rng)
                txns = build_random_transactions(self.rng, profile)
                self.repo.upsert_customer(account_id, profile)
                self.repo.upsert_transactions(account_id, txns)
            self.account_ids = self.repo.list_account_ids()

    def aggregate_metrics(self, history: list) -> dict:
        """
        Computes Layer 1 living metrics against incoming salary.
        - Total spending per day/week/month.
        """
        if not history: return {"daily_spend": 0, "weekly_spend": 0, "monthly_spend": 0}
        
        # Simple aggregation on last window
        # In a real system, this would be a rolling window in Mongo
        tx_df = pd.DataFrame(history)
        tx_df["amount"] = tx_df["debit_amount"].astype(float)
        
        # Monthly spend (last 30 transactions)
        monthly = tx_df.tail(30)["amount"].sum()
        # Weekly (last 7)
        weekly = tx_df.tail(7)["amount"].sum()
        # Daily (last 1)
        daily = tx_df.iloc[-1]["amount"] if not tx_df.empty else 0
        
        return {
            "daily_spend": round(float(daily), 2),
            "weekly_spend": round(float(weekly), 2),
            "monthly_spend": round(float(monthly), 2),
            "last_ingested_at": datetime.now(timezone.utc).isoformat()
        }

    def run_pipeline(self):
        logger.info("Initializing VECTOR Layer 1: Data Streaming Pipeline...")
        self.repo.ensure_indexes()
        self._ensure_seed()
        
        while True:
            cycle_start = time.time()
            for account_id in self.account_ids:
                try:
                    profile = self.repo.load_profile(account_id)
                    txn_doc = self.repo.get_transactions(account_id) or {}
                    history = txn_doc.get("transactions", [])
                    
                    last_tx = history[-1] if history else None
                    next_tx = build_next_transaction(self.rng, profile, last_tx)
                    
                    # 1. INGESTION (State Store)
                    self.repo.append_transaction(account_id, next_tx)
                    
                    # 2. AGGREGATION (Metric Generation)
                    metrics = self.aggregate_metrics(history + [next_tx])
                    
                    # Store Metrics in Customer State for Layer 2 consumption
                    self.repo.customers.update_one(
                        {"account_id": account_id},
                        {"$set": {"l1_metrics": metrics, "updated_at": datetime.now(timezone.utc).isoformat()}}
                    )
                    
                except Exception as e:
                    logger.error(f"Error streaming for {account_id}: {e}")
            
            # Simple throttle to maintain data velocity
            elapsed = time.time() - cycle_start
            wait_time = max(0.1, self.interval - elapsed)
            logger.info(f"Stream Cycle Complete. Ingested {len(self.account_ids)} events. Throttling {wait_time:.2f}s...")
            time.sleep(wait_time)

if __name__ == "__main__":
    interval = float(os.getenv("VECTOR_STREAM_INTERVAL", "2.0"))
    pipeline = DataStreamingLayer(interval=interval)
    pipeline.run_pipeline()
