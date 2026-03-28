"""
VECTOR Pipeline: Stream Transactions + Score All Customers x5
============================================================
1. Connect to MongoDB (realtime_risk_engine)
2. Seed portfolio if empty (100 customers, 200 tx each)
3. Stream 5 batches of new live transactions (one per customer per cycle)
4. After each stream cycle, run RiskEngine.predict_risk() for every customer
5. Persist every risk snapshot to risk_history[] in MongoDB
"""

import sys, os, time, logging
from datetime import datetime, timezone

# Ensure project root is on path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"), override=True)

from shared.store import MongoRiskRepository
from shared.engine import RiskEngine
from shared.utils import (
    build_random_profile,
    build_random_transactions,
    build_next_transaction
)
import random

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger("VECTOR.RunAll")

CYCLES          = 5          # how many stream+score cycles to run
STREAM_DELAY    = 0.05       # seconds between customer ingestions (keeps it snappy)
SEED_CUSTOMERS  = 100        # customers to seed if DB is empty


def seed_portfolio(repo: MongoRiskRepository, rng: random.Random):
    """Seed initial profiles + transaction history if the DB is empty."""
    existing = repo.list_account_ids()
    if existing:
        logger.info(f"Portfolio already seeded — {len(existing)} customers found, skipping seed.")
        return existing

    logger.info(f"Empty DB detected. Seeding {SEED_CUSTOMERS} customers…")
    for i in range(1, SEED_CUSTOMERS + 1):
        account_id = f"CUST_{i:03d}"
        profile    = build_random_profile(rng)
        txns       = build_random_transactions(rng, profile, count=200)

        repo.upsert_customer(account_id, profile)
        repo.transactions.update_one(
            {"account_id": account_id},
            {"$set": {
                "account_id":  account_id,
                "transactions": txns,
                "updated_at":  datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )

    account_ids = repo.list_account_ids()
    logger.info(f"Seeded {len(account_ids)} customers successfully.")
    return account_ids


def stream_one_cycle(repo: MongoRiskRepository, rng: random.Random, account_ids: list, cycle: int):
    """Append one live transaction per customer and update L1 metrics."""
    logger.info(f"[CYCLE {cycle}] Streaming new transactions for {len(account_ids)} customers…")
    for account_id in account_ids:
        try:
            profile = repo.load_profile(account_id) or {}
            history = repo.load_transaction_records(account_id)
            last_tx = history[-1] if history else {}
            next_tx = build_next_transaction(rng, profile, last_tx)
            repo.append_transaction(account_id, next_tx)
            time.sleep(STREAM_DELAY)
        except Exception as e:
            logger.error(f"  [STREAM] {account_id} — {e}")
    logger.info(f"[CYCLE {cycle}] Stream complete.")


def score_all_customers(repo: MongoRiskRepository, engine: RiskEngine, account_ids: list, cycle: int):
    """Run RiskEngine on every customer and persist results."""
    logger.info(f"[CYCLE {cycle}] Scoring {len(account_ids)} customers…")
    scored, failed = 0, 0

    for account_id in account_ids:
        try:
            profile   = repo.load_profile(account_id) or {}
            raw_df    = repo.load_transaction_frame(account_id)
            cust_doc  = repo.get_customer(account_id) or {}
            history   = cust_doc.get("risk_history", [])

            if raw_df is None or raw_df.empty:
                logger.warning(f"  [SCORE] {account_id} — no transactions, skipping.")
                failed += 1
                continue

            result = engine.predict_risk(
                raw_tx_df   = raw_df,
                profile     = profile,
                account_id  = account_id,
                history     = history
            )
            repo.save_prediction_result(account_id, result)
            logger.info(
                f"  [SCORE] {account_id} | "
                f"risk={result['final_risk_score']:.4f} | "
                f"archetype={result['stress_archetype']} | "
                f"velocity={result['kinematics']['velocity']:.4f}"
            )
            scored += 1

        except Exception as e:
            logger.error(f"  [SCORE] {account_id} — prediction failed: {e}")
            failed += 1

    logger.info(f"[CYCLE {cycle}] Scoring done — {scored} scored, {failed} skipped/failed.")
    return scored


def print_summary(repo: MongoRiskRepository, account_ids: list):
    """Print a final summary table from MongoDB."""
    print("\n" + "="*80)
    print(f"{'ACCOUNT':<12} {'RISK SCORE':>12} {'ARCHETYPE':<25} {'HISTORY ENTRIES':>15}")
    print("="*80)
    for account_id in account_ids[:20]:    # show first 20
        doc   = repo.get_customer(account_id) or {}
        score = doc.get("final_risk_score", "N/A")
        arch  = doc.get("stress_archetype", "N/A")
        hist  = len(doc.get("risk_history", []))
        score_str = f"{score:.4f}" if isinstance(score, float) else str(score)
        print(f"{account_id:<12} {score_str:>12} {arch:<25} {hist:>15}")
    if len(account_ids) > 20:
        print(f"  … and {len(account_ids) - 20} more customers (not shown)")
    print("="*80)
    print(f"All results stored in MongoDB 'realtime_risk_engine' → customers.risk_history\n")


if __name__ == "__main__":
    rng  = random.Random(42)
    repo = MongoRiskRepository.from_env()

    # Quick connectivity check
    try:
        repo.ping()
        logger.info("MongoDB connected ✓")
    except Exception as e:
        logger.error(f"Cannot connect to MongoDB: {e}")
        sys.exit(1)

    repo.ensure_indexes()

    # 1. Seed if needed
    account_ids = seed_portfolio(repo, rng)

    # 2. Load ML Engine once
    logger.info("Loading RiskEngine (behavioral + historian models)…")
    try:
        engine = RiskEngine()
        logger.info("RiskEngine loaded ✓")
    except Exception as e:
        logger.error(f"Failed to load RiskEngine: {e}")
        sys.exit(1)

    # 3. Run CYCLES stream+score loops
    total_scored = 0
    for cycle in range(1, CYCLES + 1):
        print(f"\n{'━'*60}")
        print(f"  VECTOR PIPELINE — CYCLE {cycle}/{CYCLES}")
        print(f"{'━'*60}")
        stream_one_cycle(repo, rng, account_ids, cycle)
        total_scored += score_all_customers(repo, engine, account_ids, cycle)

    # 4. Final summary
    print(f"\n✅ All {CYCLES} cycles complete. Total predictions stored: {total_scored}")
    print_summary(repo, account_ids)
