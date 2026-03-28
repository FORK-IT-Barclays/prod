import os
import random
import threading
import time
import logging
import pandas as pd

import sys, os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '1_data_streaming_layer')))
from src.demo_data import build_next_transaction, build_random_profile, build_random_transactions
from shared.store import MongoRiskRepository
from shared.engine import RiskEngine

logger = logging.getLogger("realtime_risk_engine.demo_stream")


class DemoStreamController:
    """
    VECTOR Pipeline Orchestrator (Layer 1-6).
    
    Handles continuous ingestion and sequential multi-layer scoring.
    """

    def __init__(self):
        self._thread = None
        self._stop_event = threading.Event()
        self._lock = threading.Lock()
        self._rng = random.Random()
        self._interval_seconds = float(os.getenv("DEMO_INTERVAL_SECONDS", "1.5"))
        self._total_generated = 0
        self._last_cycle_generated = 0
        self._last_cycle_at = None
        
        try:
            self.engine = RiskEngine()
        except Exception as e:
            logger.error(f"Scoring Engine Init Failed: {e}")
            self.engine = None

    def is_running(self):
        return self._thread is not None and self._thread.is_alive()

    def get_stats(self):
        account_count = 0
        try:
            repo = MongoRiskRepository.from_env()
            account_count = len(repo.list_account_ids())
        except Exception:
            pass
        return {
            "running": self.is_running(),
            "account_count": account_count,
            "total_generated": self._total_generated,
            "last_cycle_at": self._last_cycle_at,
        }

    def _ensure_seed_data(self, repo: MongoRiskRepository):
        account_ids = repo.list_account_ids()
        if account_ids: return account_ids
        customer_count = int(os.getenv("SAMPLE_CUSTOMER_COUNT", "10"))
        for offset in range(customer_count):
            account_id = f"CUST_{offset+1:03d}"
            profile = build_random_profile(self._rng)
            transactions = build_random_transactions(self._rng, profile)
            repo.upsert_customer(account_id, profile)
            repo.upsert_transactions(account_id, transactions)
        return repo.list_account_ids()

    def _run_loop(self):
        repo = MongoRiskRepository.from_env()
        repo.ensure_indexes()
        self._ensure_seed_data(repo)
        
        logger.info("VECTOR PIPELINE STARTING: L1 Ingestion -> L6 Synthesis")

        while not self._stop_event.is_set():
            cycle_generated = 0
            account_ids = repo.list_account_ids()
            
            for account_id in account_ids:
                # LAYER 1: INGESTION
                profile = repo.load_profile(account_id)
                history_doc = repo.get_customer(account_id) or {}
                risk_history = history_doc.get("risk_history", [])
                
                # Fetch last transaction to build the next one
                txn_doc = repo.get_transactions(account_id) or {}
                txns = txn_doc.get("transactions", [])
                last_tx = txns[-1] if txns else None
                
                next_tx = build_next_transaction(self._rng, profile, last_tx)
                repo.append_transaction(account_id, next_tx)
                cycle_generated += 1

                # LAYER 4-6: SCORING + PHYSICS + SYNTHESIS
                if self.engine:
                    try:
                        raw_df = repo.load_transaction_frame(account_id)
                        result = self.engine.predict_risk(
                            raw_tx_df=raw_df,
                            profile=profile,
                            account_id=account_id,
                            history=risk_history
                        )
                        repo.save_prediction_result(account_id, result)
                    except Exception as e:
                        logger.error(f"Pipeline error for {account_id}: {e}")

            self._last_cycle_generated = cycle_generated
            self._total_generated += cycle_generated
            self._last_cycle_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            
            logger.info(f"PIPELINE TICK: Processed {len(account_ids)} accounts. Total Tx: {self._total_generated}")
            self._stop_event.wait(self._interval_seconds)

    def start(self):
        with self._lock:
            if self.is_running(): return False
            self._stop_event.clear()
            self._thread = threading.Thread(target=self._run_loop, daemon=True)
            self._thread.start()
            return True

    def stop(self):
        with self._lock:
            if not self.is_running(): return False
            self._stop_event.set()
            self._thread.join(timeout=5)
            return True
