import os
import time
import logging
import sys
from datetime import datetime, timezone

# Add parent directory to sys.path to enable imports from 'shared'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.store import MongoRiskRepository

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] VECTOR_L2: %(message)s')
logger = logging.getLogger("vector_layer_2")

class TriggerCalculationLayer:
    """
    Layer 2: Trigger Orchestrator.
    Determines when to 'awaken' the deep-learning pipeline based on spending breaches.
    """
    
    def __init__(self, interval=5.0):
        self.repo = MongoRiskRepository.from_env()
        self.interval = interval

    def evaluate_event_triggers(self, profile: dict, metrics: dict) -> list:
        salary = (profile.get("annual_inc") or 36000.0) / 12.0
        triggers = []
        
        # 1. Total spending per day (Threshold: > 15% of salary)
        if metrics.get("daily_spend", 0.0) > (salary * 0.15):
            triggers.append("DAILY_BURN_BREACH")
            
        # 2. Total spending per week (Threshold: > 45% of salary)
        if metrics.get("weekly_spend", 0.0) > (salary * 0.45):
            triggers.append("WEEKLY_SPIKE_BREACH")
            
        # 3. Total spending per month (Threshold: > 95% of salary)
        if metrics.get("monthly_spend", 0.0) > (salary * 0.95):
            triggers.append("MONTHLY_EXHAUSTION_BREACH")
            
        return triggers

    def run_pipeline(self):
        logger.info("Initializing VECTOR Layer 2: Trigger Orchestration Pipeline...")
        while True:
            cycle_start = time.time()
            account_ids = self.repo.list_account_ids()
            
            for account_id in account_ids:
                try:
                    doc = self.repo.get_customer(account_id)
                    profile = doc.get("profile", {})
                    metrics = doc.get("l1_metrics", {})
                    
                    if not metrics: continue
                    
                    event_triggers = self.evaluate_event_triggers(profile, metrics)
                    if event_triggers:
                        logger.info(f"Trigger Breach for {account_id}: {event_triggers}")
                        self.repo.customers.update_one(
                            {"account_id": account_id},
                            {"$set": {
                                "l2_active_triggers": event_triggers,
                                "is_pipeline_awakened": True,
                                "pipeline_awakened_at": datetime.now(timezone.utc).isoformat()
                            }}
                        )
                    else:
                        self.repo.customers.update_one(
                            {"account_id": account_id},
                            {"$set": {"is_pipeline_awakened": False}}
                        )
                        
                except Exception as e:
                    logger.error(f"Error evaluating triggers for {account_id}: {e}")
            
            elapsed = time.time() - cycle_start
            wait_time = max(0.1, self.interval - elapsed)
            time.sleep(wait_time)

if __name__ == "__main__":
    pipeline = TriggerCalculationLayer()
    pipeline.run_pipeline()
