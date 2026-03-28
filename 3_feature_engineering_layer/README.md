# Layer 3: Feature Engineering Layer

## Overview
Once awakened by the Trigger Layer, this service prepares the analytical payload.

## Responsibilities
- **Time-Window Grouping**: Fetches transaction windows (e.g., last 90 days vs previous 90 days).
- **Signal Extraction**: Derives multi-dimensional features (e.g., number of overdrafts, income erosion anomalies, salary drift).
- **Payload Splitting**: Routes the synthesized feature payload into both the ML Layer and the Physics Engine Layer.
