import os
import random
import time
import logging
import sys
from datetime import datetime, timezone

# Add parent directory to sys.path to enable imports from 'shared'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.store import MongoRiskRepository
from shared.utils import build_next_transaction, build_random_profile, build_random_transactions

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] VECTOR_L1: %(message)s')
logger = logging.getLogger("vector_layer_1")

class DataStreamingLayer:
    """
    Layer 1: Continuous Ingestion & Metric Aggregation.
    Ingests simulated transactions and computes basic living metrics.
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
                # Seed transactions directly into DB
                from pandas import DataFrame
                self.repo.transactions.update_one(
                    {"account_id": account_id},
                    {"$set": {"account_id": account_id, "transactions": txns, "updated_at": datetime.now(timezone.utc).isoformat()}},
                    upsert=True
                )
            self.account_ids = self.repo.list_account_ids()

    def aggregate_metrics(self, history: list) -> dict:
        if not history: return {"daily_spend": 0.0, "weekly_spend": 0.0, "monthly_spend": 0.0}
        
        import pandas as pd
        tx_df = pd.DataFrame(history)
        tx_df["amount"] = tx_df["debit_amount"].astype(float)
        
        monthly = tx_df.tail(30)["amount"].sum()
        weekly = tx_df.tail(7)["amount"].sum()
        daily = tx_df.iloc[-1]["amount"] if not tx_df.empty else 0.0
        
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
                    history = self.repo.load_transaction_records(account_id)
                    
                    last_tx = history[-1] if history else {}
                    next_tx = build_next_transaction(self.rng, profile, last_tx)
                    
                    # 1. INGESTION
                    self.repo.append_transaction(account_id, next_tx)
                    
                    # 2. AGGREGATION
                    metrics = self.aggregate_metrics(history + [next_tx])
                    
                    # Store Metrics
                    self.repo.customers.update_one(
                        {"account_id": account_id},
                        {"$set": {"l1_metrics": metrics, "updated_at": datetime.now(timezone.utc).isoformat()}}
                    )
                    
                except Exception as e:
                    logger.error(f"Error streaming for {account_id}: {e}")
            
            elapsed = time.time() - cycle_start
            wait_time = max(0.1, self.interval - elapsed)
            logger.info(f"Stream Cycle Complete. Throttling {wait_time:.2f}s...")
            time.sleep(wait_time)

if __name__ == "__main__":
    pipeline = DataStreamingLayer()
    pipeline.run_pipeline()
