import os
import time
import logging
from datetime import datetime, timezone
from pymongo import MongoClient
import sys

from shared.store import MongoRiskRepository

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] VECTOR_L2: %(message)s')
logger = logging.getLogger("vector_layer_2")

class TriggerCalculationLayer:
    """
    Layer 2: Trigger Orchestrator.
    
    Evaluates Event-Driven (Salary-weighted) and Time-Driven (Checkpoints) triggers.
    """
    
    def __init__(self, interval=5.0):
        self.repo = MongoRiskRepository.from_env()
        self.interval = interval

    def evaluate_event_triggers(self, account_id: str, profile: dict, metrics: dict) -> list:
        """Determines if spending exceeds safe thresholds normalized by salary."""
        salary = profile.get("annual_inc", 36000) / 12.0
        triggers = []
        
        # 1. Total spending per day (Threshold: > 15% of salary in a single day)
        if metrics.get("daily_spend", 0) > (salary * 0.15):
            triggers.append("DAILY_BURN_BREACH")
            
        # 2. Total spending per week (Threshold: > 45% of salary)
        if metrics.get("weekly_spend", 0) > (salary * 0.45):
            triggers.append("WEEKLY_SPIKE_BREACH")
            
        # 3. Total spending per month (Threshold: > 95% of salary - income exhaustion)
        if metrics.get("monthly_spend", 0) > (salary * 0.95):
            triggers.append("MONTHLY_EXHAUSTION_BREACH")
            
        return triggers

    def evaluate_time_checkpoints(self, profile: dict) -> list:
        """Determines if the account is in a critical payment window."""
        # Note: In a real system, we look at the 'next_payment_date'.
        # For simulation, we'll use a virtual 'payment_day' field.
        # If today is exactly certain days before payment.
        payment_day = profile.get("payment_day", 1)  # Assume pay day is 1st of next month
        today = datetime.now(timezone.utc).day
        
        triggers = []
        # T-30, T-21, T-14 Checkpoints
        # For simulation, we'll trigger T-14 if today is 16-17 etc.
        # Simplified: Check if today is within 14 days of '1st'
        if 15 <= today <= 31: # Simulation: End of month is T-14 window entry
            triggers.append("T-14_CRITICAL_WINDOW")
            
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
                    
                    event_triggers = self.evaluate_event_triggers(account_id, profile, metrics)
                    time_triggers = self.evaluate_time_checkpoints(profile)
                    
                    all_triggers = event_triggers + time_triggers
                    
                    if all_triggers:
                        logger.info(f"Trigger Breach identified for {account_id}: {all_triggers}")
                        
                        # 3. THRESHOLD EXECUTION: FIRE DOWNSTREAM WAKE-UP
                        self.repo.customers.update_one(
                            {"account_id": account_id},
                            {"$set": {
                                "l2_active_triggers": all_triggers,
                                "is_pipeline_awakened": True,
                                "pipeline_awakened_at": datetime.now(timezone.utc).isoformat()
                            }}
                        )
                    else:
                        # De-activate trigger if no breaches found
                        self.repo.customers.update_one(
                            {"account_id": account_id},
                            {"$set": {"is_pipeline_awakened": False}}
                        )
                        
                except Exception as e:
                    logger.error(f"Error evaluating triggers for {account_id}: {e}")
            
            elapsed = time.time() - cycle_start
            wait_time = max(0.1, self.interval - elapsed)
            logger.info(f"Trigger Evaluation Cycle Complete for {len(account_ids)} accounts. Monitoring for next tick...")
            time.sleep(wait_time)

if __name__ == "__main__":
    pipeline = TriggerCalculationLayer()
    pipeline.run_pipeline()
