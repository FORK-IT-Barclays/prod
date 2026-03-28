# Layer 2: Trigger Calculation Layer

## Overview
This layer acts as the orchestrator and traffic controller, operating dual criteria (event-driven thresholds and chronological schedules) to determine when to wake up the heavy ML pipelines.

## Responsibilities
- **Event-Driven Thresholds (Salary-Weighted Triggers)**:
  - Continuously evaluates the user's spending against specific thresholds normalized by their expected monthly salary.
  - The model is triggered immediately if anomalous thresholds are breached for:
    - Total spending per day (e.g., daily cash-burn exceeds safe percentage of salary).
    - Total spending per week (e.g., sudden weekly spending spike decoupled from typical salary habits).
    - Total spending per month (e.g., rapid monthly income exhaustion pattern detected).
- **Time-Driven Checkpoints**: Monitors user profiles based on their chronological proximity to an upcoming payment due date.
  - T-30 Days: Initial baseline check.
  - T-21 Days: Mid-cycle momentum check.
  - T-14 Days: Critical window entry check.
  - Daily (T-14 down to T-0): High-granularity daily evaluation.
- **Threshold Execution**: If either the chronological checkpoints are hit OR any of the salary-weighted spending thresholds are breached, this layer fires an event to wake up the downstream Feature Engineering service.
