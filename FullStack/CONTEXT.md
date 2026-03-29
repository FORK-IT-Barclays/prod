# VECTOR: The Pre-Delinquency Intervention Engine

## 1. Project Overview
**VECTOR** is a high-fidelity risk prediction and intervention system designed to catch financial distress **14–21 days before** a payment is missed. It shifts the paradigm from reactive collections to proactive financial health management.

### 1.1 Platform Scope: Loan Accounts Only
The platform is used **only for accounts that have taken a loan**. Every such loan account is in scope for monitoring. Non-loan (e.g. deposit-only) accounts are not ingested or displayed. All metrics, queues, and dashboards refer to **monitored loan accounts** only.

### 1.2 Data Processing: Batch-by-Batch
All data is processed **in batches**, not in real-time streams. The pipeline:
- **Ingestion:** Loan-account data (payments, behavior, bureau, etc.) is pulled in **batches** (e.g. daily/scheduled batches or fixed-size chunks).
- **Computation:** Risk (S), velocity (V), and acceleration (A) are computed **per batch** over the batch’s accounts; signals S1–S8 are fused within each batch run.
- **Output:** Batch results (scores, tiers, diagnoses) are written to the monitoring store; the VECTOR UI reads from the **latest batch outputs** and shows batch metadata (e.g. last batch ID, batch size, run time).

Batch size and schedule (e.g. 5,000 accounts per batch, 4 batches per day) are configurable; the platform does not assume per-event streaming.

## 2. Core Innovation: Kinetic Risk Modeling
Instead of a static risk score, VECTOR calculates the trajectory of a customer's financial health using:
*   **$S$ (Risk Score):** The absolute probability of default at a point in time.
*   **$V$ (Velocity):** The first derivative of the score ($dS/dt$). Tells us if risk is increasing or decreasing.
*   **$A$ (Acceleration):** The second derivative of the score ($dV/dt$). This identifies "crisis spirals" where risk is not just increasing, but increasing *faster*.

## 3. The Octet Signals (S1–S8)
VECTOR fuses 8 key behavioral and financial signals:
- **S1 — Payment Drift:** Delay in days between due date and entry date.
- **S2 — Liquidity Strain:** Income vs debt obligations and savings depletion.
- **S3 — Credit Exhaustion:** Revolving utilization rates and credit limit trends.
- **S4 — Behavioral Velocity:** Transaction frequency spikes and category shifts (Austerity).
- **S5 — Engagement Decay:** App login frequency and digital channel interaction drops.
- **S6 — External Risk:** Bureau inquiries and third-party credit activity.
- **S7 — Cash Preference Shift:** Spike in ATM withdrawals vs digital/UPI transactions.
- **S8 — Payment Failure Pattern:** Bounced standing instructions and auto-debit failures.

---

## 4. Dataset Signal Mapping
Detailed breakdown of signal availability across public datasets.

| Dataset | Role | Available Signals | Missing / Augmentation Target |
|---------|------|-------------------|-------------------------------|
| **Home Credit Default Risk** | PRIMARY | S1, S2, S3, S6, S8 | S4, S5, S7 (Synthetic) |
| **UCI Default (Taiwan)** | VALIDATION | S1, S3 | S2 (Proxy), S4, S5, S6, S7, S8 |
| **Lending Club** | LABELS | S1, S2, S3, S6, S8 | S4, S5, S7 (Synthetic) |
| **GiveMeSomeCredit** | VALIDATION | S1, S2, S3 | S8 (Proxy), S4, S5, S6, S7 |
| **BankSim** | BEHAVIORAL | S4, S7 | S1, S2, S3, S5, S6, S8 |
| **NeurIPS 2022 BAF** | ENGAGEMENT | S4, S5, S6 | S1, S3, S7, S8, S2 (Proxy) |

### Master Signal Coverage Summary
| Dataset | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 | Score |
|---------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:-----:|
| Home Credit | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | **88%** |
| UCI Taiwan | ✅ | ⚡ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | **82%** |
| Lending Club | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | **74%** |
| GiveMeSomeCredit | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ⚡ | **78%** |
| BankSim | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | **65%** |
| NeurIPS BAF | ❌ | ⚡ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | **70%** |

---

## 5. Recommended Dataset Strategy
| Role | Dataset | Application |
|------|---------|-------------|
| **Primary Training** | Home Credit | Richest multi-table coverage for core financial signals. |
| **Behavioral (S4, S7)** | BankSim | Use merchant categories to extract velocity and cash shift signals. |
| **Engagement (S5)** | NeurIPS BAF | Device/session metadata to simulate app engagement decay. |
| **Labels** | Lending Club | Use "Late 16–30 days" labels for ground truth pre-delinquency. |

---

## 6. Operational Decision Matrix
How VECTOR routes customers based on Kinetic signals.

| SCENARIO | RISK (S) | VELOCITY (V) | ACCEL (A) | DIAGNOSIS | TIER | ACTION |
|----------|----------|--------------|-----------|-----------|------|--------|
| 1 | High | Positive | Positive | **CRISIS SPIRAL** | T3 | Immediate RM Call / Dossier sent. |
| 2 | Low | Positive | Positive | **HIDDEN ACCEL** | T3 | Pre-emptive RM Call/SMS. |
| 3 | High | Positive | Stable | **MANAGED DECLINE**| T2 | Scheduled intervention (3 days prior).|
| 4 | High | Stable/Neg | Stable/Neg | **STABLE HIGH RISK**| T2 | Watch List / Auto-monitor. |
| 5 | Low | Positive | Stable | **EARLY WARNING** | T1 | Automated Educational Nudge. |
| 6 | Low | Stable | Positive | **MOMENTUM SHIFT**| T1 | Soft Alert / Daily Re-scan. |
| 7 | Any | Negative | Negative | **STRONG RECOVERY**| T1 | Auto-close case / Log Success. |
| 8 | Any | Stable | Stable | **NEUTRAL** | T1 | Standard weekly background scan. |

---

## 7. Batch Processing Model
- **Input:** Only **loan accounts** (accounts with an active or closed loan) are included in each batch.
- **Batch lifecycle:** Ingest batch → compute S/V/A and Octet signals per account → apply Decision Matrix → persist tier/diagnosis → expose to UI.
- **UI:** Displays last batch ID, batch run time, accounts processed per batch, and next scheduled batch where applicable. All portfolio and queue metrics are derived from the latest batch run(s).

---
*Note: This document serves as the master context for the VECTOR project implementation.*
