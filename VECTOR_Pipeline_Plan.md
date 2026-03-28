# 🚀 Pre-Delinquency Intervention Pipeline (VECTOR)
## Layered Microservice Architecture & Implementation Plan

To ensure a clean, modular microservice architecture for the hackathon, the pipeline is strictly separated into distinct sequential layers. Each layer executes its specific duty and passes the enriched payload to the next.

---

### Layer 1: Data Streaming Layer 
- **Continuous Ingestion**: Streams real-time transaction data and account state changes (via Kafka streams, RabbitMQ, or MongoDB Change Streams).
- **Metric Aggregation**: Continuously computes living metrics against the user's incoming salary:
  - Total spending per day.
  - Total spending per week.
  - Total spending per month.
- **State Store**: Maintains an updated ledger of raw data and basic aggregations, ready to be queried.

### Layer 2: Trigger Calculation Layer 
This layer acts as the orchestrator and traffic controller, operating dual criteria (event-driven thresholds and chronological schedules) to determine when to wake up the heavy ML pipelines.

- **Event-Driven Thresholds (Salary-Weighted Triggers)**:
  - Continuously evaluates the user's spending against specific thresholds normalized by their expected monthly salary.
  - The model is triggered immediately if anomalous thresholds are breached for:
    1. **Total spending per day** (e.g., daily cash-burn exceeds safe percentage of salary).
    2. **Total spending per week** (e.g., sudden weekly spending spike decoupled from typical salary habits).
    3. **Total spending per month** (e.g., rapid monthly income exhaustion pattern detected).
- **Time-Driven Checkpoints**: Monitors user profiles based on their chronological proximity to an upcoming payment due date.
  - `T-30 Days`: Initial baseline check.
  - `T-21 Days`: Mid-cycle momentum check.
  - `T-14 Days`: Critical window entry check.
  - `Daily (T-14 down to T-0)`: High-granularity daily evaluation.
- **Threshold Execution**: If *either* the chronological checkpoints are hit OR any of the salary-weighted spending thresholds are breached, this layer fires an event to wake up the downstream Feature Engineering service.

### Layer 3: Feature Engineering Layer
Once awakened by the Trigger Layer, this service prepares the analytical payload.
- **Time-Window Grouping**: Fetches transaction windows (e.g., last 90 days vs previous 90 days).
- **Signal Extraction**: Derives multi-dimensional features (e.g., number of overdrafts, income erosion anomalies, salary drift).
- **Payload Splitting**: Routes the synthesized feature payload into both the ML Layer and the Physics Engine Layer.

### Layer 4: ML & Formula Layer (Dual-Model Execution)
This layer handles the predictive intelligence and explainability.
- **Universal Financial Historian Model**: Evaluates structural, macro-economic risk (Leverage, Liquidity).
- **Behavioral Model**: Evaluates immediate transactional volatility and stress patterns.
- **Score Fusion**: Passes both model outputs through the System Logic Formula to yield a **Single Final Risk Score**.
- **SHAP Value Generation**: Crucially, this layer calculates and outputs SHAP (SHapley Additive exPlanations) values to determine exactly *which* features contributed most to the risk score.

### Layer 5: Physics Engine & Matrix Layer
Running sequentially or in parallel with the ML layer, this engine focuses purely on trajectory.
- **Kinematic Calculations**: Computes *Risk Velocity* (speed of financial deterioration) and *Risk Acceleration* (momentum of that decay).
- **Multi-Zone Matrix**: Plots the user onto a dynamic 9-Zone Framework (mapping Velocity vs. Acceleration). 
  - Identifies if the user is Stable (Zone 1), Slowly Deteriorating, or in a rapid Financial Death Spiral (Zone 9).

### Layer 6: Stress Type Classification Layer
This is the synthesis layer that diagnoses the exact cause of financial distress.
- **Inputs**: 
  1. **SHAP values** from the ML Layer (tells us *what* structural/behavioral pillars are failing).
  2. **Velocity/Acceleration metrics** from the Physics Engine (tells us *how fast* the failure is happening).
- **Classification Logic**: Combines these inputs to tag the user with a specific Stress Archetype persona:
  - *Acute Income Shock* (Sudden drop in incoming cash flow + High velocity).
  - *Chronic Overspender* (Slow, steady liquidity burn + Low acceleration).
  - *Liquidity Trap* (High structural debt, maxed out lines of credit + Dependent SHAP indicators).

### Layer 7: Action & Intervention Layer (GenAI Empathy & Governance)
This final layer transforms the analytical intelligence into proactive, customer-facing support. It replaces the reactive, generic collections approach with a human-centered, empathy-driven intervention strategy.
- **GenAI-Powered Empathy Engine**:
  - Replaces traditional, generic "Pay Now" templates with hyper-personalized communication.
  - Utilizes Generative AI to draft empathetic messages tailored exactly to the customer's *Stress Type Classification* and *Matrix Zone*.
  - Proactively offers supportive resolutions (e.g., "Payment Holidays" or bespoke restructuring plans) tailored to their specific crisis factor.
- **Human-in-the-Loop Safeguard**:
  - Any high-impact decision or severe risk zone escalation is automatically routed to a Relationship Manager via the dashboard queue.
  - Guaranteed regulatory alignment: No massive autonomous repayment restructuring occurs without human review and approval.
- **Future-Ready Agentic Orchestration**: 
  - Provides the backbone for future goal-driven AI Agents capable of prioritizing intervention channels while keeping Human-in-the-Loop pathways secure.
