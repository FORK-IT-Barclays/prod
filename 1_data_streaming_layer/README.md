# Layer 1: Data Streaming Layer

## Overview
Continuous Ingestion: Streams real-time transaction data and account state changes (via Kafka streams, RabbitMQ, or MongoDB Change Streams).

## Responsibilities
- **Metric Aggregation**: Continuously computes living metrics against the user's incoming salary:
  - Total spending per day.
  - Total spending per week.
  - Total spending per month.
- **State Store**: Maintains an updated ledger of raw data and basic aggregations, ready to be queried.
