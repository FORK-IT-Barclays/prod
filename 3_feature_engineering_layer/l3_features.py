import os
import time
import logging
import sys
from datetime import datetime, timezone

# Add parent directory to sys.path to enable imports from 'shared'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.store import MongoRiskRepository
from shared.engine import RealTimeFeatureEngine, MoneyVisTransformer

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] VECTOR_L3: %(message)s')
logger = logging.getLogger("vector_layer_3")

class FeatureEngineeringLayer:
    """
    Layer 3: Signal Formulation Pipeline.
    Triggered by Layer 2 breaches, this layer calculates high-level risk features.
    """
    
    def __init__(self, interval=5.0):
        self.repo = MongoRiskRepository.from_env()
        self.interval = interval
        self.transformer = MoneyVisTransformer()
        self.feature_engine = RealTimeFeatureEngine()

    def process_awakened_accounts(self):
        cursor = self.repo.customers.find({"is_pipeline_awakened": True})
        
        for doc in cursor:
            account_id = doc["account_id"]
            try:
                txn_frame = self.repo.load_transaction_frame(account_id)
                if txn_frame is None or txn_frame.empty:
                    logger.warning(f"Insufficient history for {account_id}")
                    continue
                
                # Signal derivation
                ledger = self.transformer.transform_batch(txn_frame)
                target_date = ledger["date"].max()
                signals = self.feature_engine.compute_signals(ledger, target_date)
                
                if signals:
                    logger.info(f"Signal Extraction for {account_id}: derived {len(signals)} items")
                    self.repo.customers.update_one(
                         {"account_id": account_id},
                         {"$set": {
                             "l3_feature_payload": signals,
                             "has_incoming_feature_payload": True,
                             "signals_extracted_at": datetime.now(timezone.utc).isoformat()
                         }}
                    )
            except Exception as e:
                logger.error(f"Error extracting signals for {account_id}: {e}")

    def run_pipeline(self):
        logger.info("Initializing VECTOR Layer 3: Feature Extraction Pipeline...")
        while True:
            cycle_start = time.time()
            self.process_awakened_accounts()
            elapsed = time.time() - cycle_start
            wait_time = max(0.1, self.interval - elapsed)
            time.sleep(wait_time)

if __name__ == "__main__":
    pipeline = FeatureEngineeringLayer()
    pipeline.run_pipeline()
