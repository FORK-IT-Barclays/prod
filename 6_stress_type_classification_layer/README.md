# Layer 6: Stress Type Classification Layer

## Overview
This is the synthesis layer that diagnoses the exact cause of financial distress.

## Inputs
- SHAP values from the ML Layer (tells us what structural/behavioral pillars are failing).
- Velocity/Acceleration metrics from the Physics Engine (tells us how fast the failure is happening).

## Classification Logic
Combines these inputs to tag the user with a specific Stress Archetype persona:
- **Acute Income Shock**: Sudden drop in incoming cash flow + High velocity.
- **Chronic Overspender**: Slow, steady liquidity burn + Low acceleration.
- **Liquidity Trap**: High structural debt, maxed out lines of credit + Dependent SHAP indicators.
