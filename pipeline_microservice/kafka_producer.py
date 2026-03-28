import time
import json
from datetime import datetime
from kafka import KafkaProducer
from shared.store import MongoRiskRepository

KAFKA_BROKER = 'localhost:9092'

def stream_transactions():
    repo = MongoRiskRepository.from_env()
    producer = KafkaProducer(
        bootstrap_servers=[KAFKA_BROKER],
        value_serializer=lambda v: json.dumps(v).encode('utf-8')
    )
    
    # We load transactions for all users to stream
    txs = list(repo.transactions.find().sort("timestamp", 1).limit(500))
    print(f"Loaded {len(txs)} transactions to stream.")
    
    for tx in txs:
        # We delete _id to keep payload serializable
        if '_id' in tx:
            del tx['_id']
            
        print(f"Emitting TX for {tx['account_id']} | Amount: {tx['amount']}")
        producer.send('transactions.raw', value=tx)
        
        # Simulate pacing
        time.sleep(0.05)
        
    producer.flush()
    print("Stream completed.")

if __name__ == "__main__":
    stream_transactions()
