import os
import time
import logging
import sys
from datetime import datetime, timezone

# Add Risk-prediction paths
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "Risk-prediction/realtime_risk_engine"))

from shared.store import MongoRiskRepository

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] VECTOR_L5: %(message)s')
logger = logging.getLogger("vector_layer_5")

class PhysicsEngineLayer:
    """
    Layer 5: Continuous Risk Physics & Matrix Mapping.
    
    Computes Kinematic Velocity and Acceleration of risk deterioration, 
    mapping users onto a 9-Zone Physics Matrix.
    """
    
    def __init__(self, interval=5.0):
        self.repo = MongoRiskRepository.from_env()
        self.interval = interval

    def map_to_zone(self, velocity: float, acceleration: float) -> int:
        """
        Maps (Velocity, Acceleration) to 9-Zone Matrix.
        Zone 1: Stable. Zone 5: Moderately Deteriorating. Zone 9: Death Spiral.
        """
        # Simplified mapping logic for demo
        # Velocity > 0 means deteriorating
        # Acceleration > 0 means deterioration is speeding up
        if velocity <= 0 and acceleration <= 0: return 1 # Zone 1 (Stable)
        if velocity > 0.10 and acceleration > 0.05: return 9 # Zone 9 (Critical Spiral)
        if velocity > 0.05: return 5 # Zone 5 (Warning)
        if velocity > 0: return 2 # Zone 2 (Drift)
        return 1

    def calculate_kinematics(self, account_id: str, current_score: float, history: list) -> dict:
        """Computes dS/dt and d²S/dt²."""
        if len(history) < 1:
            return {"velocity": 0.0, "acceleration": 0.0, "zone": 1}
            
        prev_1 = history[-1].get("final_risk_score", current_score)
        v = current_score - prev_1 # dS/dt
        
        a = 0.0
        if len(history) >= 2:
            prev_2 = history[-2].get("final_risk_score", prev_1)
            v_prev = prev_1 - prev_2
            a = v - v_prev # d²S/dt²
            
        zone = self.map_to_zone(v, a)
        return {"velocity": round(v,4), "acceleration": round(a,4), "zone": zone}

    def process_kinematics(self):
        # Poll for accounts that have received a new ML fused score in Layer 4
        cursor = self.repo.customers.find({"has_incoming_fused_score": True})
        
        for doc in cursor:
            account_id = doc["account_id"]
            try:
                ml_result = doc.get("l4_ml_result", {})
                current_score = ml_result.get("final_risk_score", 0.0)
                history = doc.get("risk_history", [])
                
                # 1. KINEMATICS & 2. 9-ZONE MAPPING
                results = self.calculate_kinematics(account_id, current_score, history)
                
                logger.info(f"Layer 5 Kinematics for {account_id}: v={results['velocity']}, zone={results['zone']}")
                
                # 3. IDENTIFICATION: STORE PHYSICS DATA
                self.repo.customers.update_one(
                     {"account_id": account_id},
                     {"$set": {
                         "l5_physics_result": results,
                         "has_incoming_physics": True,
                         "has_incoming_fused_score": False, # Clear L4 trigger
                         "physics_at": datetime.now(timezone.utc).isoformat()
                     }}
                )
                
            except Exception as e:
                logger.error(f"Error in Physics Engine for {account_id}: {e}")

    def run_pipeline(self):
        logger.info("Initializing VECTOR Layer 5: Physics & Matrix Pipeline...")
        while True:
            cycle_start = time.time()
            self.process_kinematics()
            elapsed = time.time() - cycle_start
            wait_time = max(0.1, self.interval - elapsed)
            time.sleep(wait_time)

if __name__ == "__main__":
    pipeline = PhysicsEngineLayer()
    pipeline.run_pipeline()
