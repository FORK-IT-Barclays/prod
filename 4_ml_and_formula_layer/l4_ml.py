import os
import time
import logging
import sys
from datetime import datetime, timezone

# Add parent directory to sys.path to enable imports from 'shared'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.store import MongoRiskRepository
from shared.engine import RiskEngine

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] VECTOR_L4: %(message)s')
logger = logging.getLogger("vector_layer_4")

class MLFormulaLayer:
    """
    Layer 4: ML Ensemble & Risk Synthesis.
    Consolidates signals into a final Score and Persona Archetype.
    """
    
    def __init__(self, interval=5.0):
        self.repo = MongoRiskRepository.from_env()
        self.interval = interval
        try:
            self.engine = RiskEngine()
        except Exception as e:
            logger.error(f"ML Engine Initialization Failed: {e}")
            self.engine = None

    def process_payloads(self):
        cursor = self.repo.customers.find({"has_incoming_feature_payload": True})
        
        for doc in cursor:
            account_id = doc["account_id"]
            try:
                profile = doc.get("profile", {})
                if not self.engine: continue
                
                txn_frame = self.repo.load_transaction_frame(account_id)
                history = doc.get("risk_history", [])
                
                result = self.engine.predict_risk(txn_frame, profile, account_id, history)
                
                if result:
                    logger.info(f"Analysis Complete for {account_id}: Risk Score {result.get('final_risk_score')}")
                    
                    self.repo.customers.update_one(
                         {"account_id": account_id},
                         {"$set": {
                             "l4_ml_result": result,
                             "has_incoming_fused_score": True,
                             "has_incoming_feature_payload": False,
                             "scored_at": datetime.now(timezone.utc).isoformat()
                         }}
                    )
                    self.repo.save_prediction_result(account_id, result)
                
            except Exception as e:
                logger.error(f"Error in ML Layer {account_id}: {e}")

    def run_pipeline(self):
        logger.info("Initializing VECTOR Layer 4: ML & Synthesis Pipeline...")
        while True:
            cycle_start = time.time()
            self.process_payloads()
            elapsed = time.time() - cycle_start
            wait_time = max(0.1, self.interval - elapsed)
            time.sleep(wait_time)

if __name__ == "__main__":
    pipeline = MLFormulaLayer()
    pipeline.run_pipeline()
