#!/bin/bash

# VECTOR Standalone Pipeline Orchestrator (Layers 1-4)
# ---------------------------------------------------

# Set shared environment
export MONGODB_URI="mongodb://localhost:27017"
export MONGODB_DB_NAME="realtime_risk_engine"

# Kill existing
pkill -f "python3.*_layer" || true
echo "🚀 Initializing VECTOR Pipeline Core (L1-L4)..."

# L1: Data Streaming
echo "Starting Layer 1: Ingestion & Aggregation..."
cd 1_data_streaming_layer
python3 l1_stream.py > ../l1.log 2>&1 &
cd ..

# L2: Trigger Calculation
echo "Starting Layer 2: Trigger Orchestration..."
cd 2_trigger_calculation_layer
python3 l2_trigger.py > ../l2.log 2>&1 &
cd ..

# L3: Feature Engineering
echo "Starting Layer 3: Feature Engineering..."
cd 3_feature_engineering_layer
python3 l3_features.py > ../l3.log 2>&1 &
cd ..

# L4: ML Scoring
echo "Starting Layer 4: ML & Score Fusion..."
cd 4_ml_and_formula_layer
python3 l4_ml.py > ../l4.log 2>&1 &
cd ..

echo "✅ 4 Standalone Layers active."
echo "Check Logs: tail -f l1.log l2.log l3.log l4.log"
