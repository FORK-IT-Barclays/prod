import json
import logging
import threading
from kafka import KafkaConsumer, KafkaProducer
from shared.store import MongoRiskRepository
from shared.engine import RiskEngine

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(threadName)s: %(message)s')
logger = logging.getLogger("workers")

KAFKA_BROKER = 'localhost:9092'

# Global components
try:
    repo = MongoRiskRepository.from_env()
    engine = RiskEngine()
except Exception as e:
    logger.error(f"Failed to init repo/engine: {e}")

producer = KafkaProducer(
    bootstrap_servers=[KAFKA_BROKER],
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

def _consume_and_produce(consumer_topic, producer_topic, process_func, group_id):
    consumer = KafkaConsumer(
        consumer_topic,
        bootstrap_servers=[KAFKA_BROKER],
        group_id=group_id,
        auto_offset_reset='earliest',
        value_deserializer=lambda m: json.loads(m.decode('utf-8'))
    )
    logger.info(f"Started Worker for {consumer_topic} -> {producer_topic}")
    for msg in consumer:
        try:
            payload = msg.value
            result = process_func(payload)
            if result is not None and producer_topic is not None:
                producer.send(producer_topic, result)
        except Exception as e:
            logger.error(f"Error in {group_id}: {e}")

# --- LAYER 2: TRIGGER WORKER ---
def trigger_logic(payload):
    # Pass-through in simulation; but normally evaluates transaction size
    # Here, we just add a "trigger_ts" and forward.
    # payload is the raw transaction doc
    payload['passed_l2'] = True
    return payload

# --- LAYER 3: FEATURE WORKER ---
def feature_logic(payload):
    account_id = payload['account_id']
    # compute velocity/acceleration features. The repo already has historical context.
    # In a true streaming model, we lookup recent transactions.
    txn_frame = repo.load_transaction_frame(account_id)
    # The feature computation is embedded in Layer4 engine currently, 
    # but we represent the pipeline by acknowledging it here.
    payload['passed_l3'] = True
    return payload

# --- LAYER 4: ML WORKER ---
def ml_logic(payload):
    account_id = payload['account_id']
    customer = repo.customers.find_one({"account_id": account_id})
    if not customer:
        return None
    profile = customer.get("profile", {})
    history = customer.get("risk_history", [])
    txn_frame = repo.load_transaction_frame(account_id)
    
    # dual model engine
    score_res = engine.predict_risk(txn_frame, profile, account_id, history)
    payload['l4_score'] = score_res
    return payload

# --- LAYER 5: PHYSICS WORKER ---
def physics_logic(payload):
    account_id = payload['account_id']
    l4_score = payload.get('l4_score')
    if not l4_score:
        return None
    # Physics is applied inside predict_risk and stored. 
    # We update MongoDB one last time
    repo.save_prediction_result(account_id, l4_score)
    repo.customers.update_one(
         {"account_id": account_id},
         {"$set": {
             "scored_at": payload.get('timestamp')
         }}
    )
    # Also attach the full risk payload for the Frontend WebSockets
    payload['final_result'] = l4_score
    # We produce to transactions.final (the processor loop handles it automatically if we return)
    return payload

def start_workers():
    threads = [
        threading.Thread(target=_consume_and_produce, args=("transactions.raw", "transactions.triggered", trigger_logic, "cg-l2"), name="L2-Trigger"),
        threading.Thread(target=_consume_and_produce, args=("transactions.triggered", "transactions.features", feature_logic, "cg-l3"), name="L3-Feature"),
        threading.Thread(target=_consume_and_produce, args=("transactions.features", "transactions.scored", ml_logic, "cg-l4"), name="L4-ML"),
        threading.Thread(target=_consume_and_produce, args=("transactions.scored", "transactions.final", physics_logic, "cg-l5"), name="L5-Physics"),
    ]
    for t in threads:
        t.daemon = True
        t.start()
    logger.info("All pipeline microservice workers are running.")
    for t in threads:
        t.join()

if __name__ == "__main__":
    start_workers()
