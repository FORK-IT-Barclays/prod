import random

import pandas as pd


def build_random_profile(rng: random.Random):
    annual_inc = round(rng.uniform(28000.0, 140000.0), 2)
    loan_amnt = round(rng.uniform(3000.0, min(50000.0, annual_inc * 0.75)), 2)
    term_months = rng.choice([12, 24, 36, 48, 60])
    open_acc = rng.randint(1, 14)
    total_acc = open_acc + rng.randint(3, 20)
    revol_bal = round(rng.uniform(0.0, 25000.0), 2)
    revol_util = round(rng.uniform(0.0, 95.0), 2)
    delinq_2yrs = rng.randint(0, 3)
    pub_rec = rng.randint(0, 2)
    inq_last_6mths = rng.randint(0, 5)
    dti = round(rng.uniform(4.0, 42.0), 2)
    installment = round(loan_amnt / max(term_months, 1) + rng.uniform(20.0, 260.0), 2)

    return {
        "annual_inc": annual_inc,
        "loan_amnt": loan_amnt,
        "dti": dti,
        "term_months": term_months,
        "open_acc": open_acc,
        "total_acc": total_acc,
        "revol_bal": revol_bal,
        "revol_util": revol_util,
        "delinq_2yrs": delinq_2yrs,
        "pub_rec": pub_rec,
        "inq_last_6mths": inq_last_6mths,
        "installment": installment,
    }


def build_random_transactions(rng: random.Random, profile: dict) -> pd.DataFrame:
    end_date = pd.Timestamp.now().normalize()
    # 180 days required by feature engine to capture T1 and T2 windows reliably
    dates = pd.date_range(end=end_date, periods=180, freq="1D")

    salary_base = round(profile["annual_inc"] / 12.0, 2)
    balance = round(rng.uniform(800.0, 6000.0), 2)
    rows = []

    # Inject 'persona' for velocity signals: 
    # STRESSED = eroding balance, late salary, overdrafts
    # SAFE = steady balance, on-time salary
    persona = rng.choice(["SAFE", "STRESSED"])
    
    salary_day_t1 = rng.randint(25, 28)
    # Stressed persona sees salary date later in T2 (salary drift)
    salary_day_t2 = salary_day_t1 + rng.randint(2, 4) if persona == "STRESSED" else salary_day_t1

    bill_choices = [
        ("O2 Mobile Bill", "DD"),
        ("Octopus Energy", "DD"),
        ("Virgin Media", "DD"),
        ("Rent Payment", "DD"),
    ]
    spend_choices = [
        ("Grocery Store", "POS"),
        ("ATM Withdrawal", "ATM"),
        ("Coffee Shop", "POS"),
        ("Restaurant", "POS"),
        ("Fuel Station", "POS"),
    ]

    for date in dates:
        is_t2 = (end_date - date).days <= 90
        
        description = ""
        tx_type = ""
        credit = 0.0
        debit = 0.0

        target_salary_day = salary_day_t2 if is_t2 else salary_day_t1

        # Income: Monthly Salary
        if date.day == target_salary_day:
            description = rng.choice(["Monthly Salary", "Salary Credit", "Employer BGC"])
            tx_type = rng.choice(["BGC", "FPI"])
            # Stressed persona may have income erosion in T2
            multiplier = rng.uniform(0.7, 0.9) if (persona == "STRESSED" and is_t2) else rng.uniform(0.95, 1.05)
            credit = round(salary_base * multiplier, 2)
            
        # Bills: specific days
        elif date.day in [1, 15] and rng.random() > 0.1:
            description, tx_type = rng.choice(bill_choices)
            debit = round(rng.uniform(40.0, 800.0), 2)
            
        # Discretionary spend: Random days
        elif rng.random() > 0.6: 
            description, tx_type = rng.choice(spend_choices)
            # Stressed persona has higher spend relative to safe, causing overdrafts
            multiplier = 1.3 if (persona == "STRESSED" and is_t2) else 1.0
            debit = round(rng.uniform(15.0, 150.0) * multiplier, 2)

        # Skip empty days to simulate real transaction patterns
        if credit == 0 and debit == 0:
            continue

        balance = round(balance + credit - debit, 2)
        
        # Prevent SAFE persona from heavy overdrafts
        if persona == "SAFE" and balance < 100:
            balance += 500  # implicit top-up or savings transfer
            
        rows.append(
            {
                "Transaction Date": date.strftime("%d/%m/%Y"),
                "Transaction Description": description,
                "Transaction Type": tx_type,
                "Credit Amount": credit,
                "Debit Amount": debit,
                "Balance": balance,
            }
        )

    return pd.DataFrame(rows)



def build_next_transaction(rng: random.Random, profile: dict, last_transaction: dict | None):
    """
    Generate the next incoming demo transaction for an existing customer.
    Simulates a daily feed progression.
    """
    if last_transaction is None:
        next_date = pd.Timestamp.now().normalize()
        last_balance = round(rng.uniform(800.0, 6000.0), 2)
    else:
        next_date = pd.to_datetime(last_transaction["transaction_date"], dayfirst=True) + pd.Timedelta(days=1)
        last_balance = float(last_transaction["balance"])

    salary_base = round(profile["annual_inc"] / 12.0, 2)
    credit = 0.0
    debit = 0.0
    description = ""
    tx_type = ""

    # Basic probabilities for a daily feed
    if next_date.day in [25, 26, 27, 28] and rng.random() > 0.8:
        # Give a salary around late month
        description = rng.choice(["Monthly Salary", "Salary Credit", "Employer BGC"])
        tx_type = rng.choice(["BGC", "FPI"])
        credit = round(salary_base * rng.uniform(0.82, 1.18), 2)
    elif next_date.day in [1, 15] and rng.random() > 0.5:
        # Bills
        description, tx_type = rng.choice(
            [
                ("O2 Mobile Bill", "DD"),
                ("Octopus Energy", "DD"),
                ("Virgin Media", "DD"),
                ("Rent Payment", "DD"),
            ]
        )
        debit = round(rng.uniform(40.0, 400.0), 2)
    elif rng.random() > 0.4:
        # Discretionary spend on daily basis
        description, tx_type = rng.choice(
            [
                ("Grocery Store", "POS"),
                ("ATM Withdrawal", "ATM"),
                ("Coffee Shop", "POS"),
                ("Restaurant", "POS"),
                ("Fuel Station", "POS"),
            ]
        )
        debit = round(rng.uniform(15.0, 150.0), 2)

    if credit == 0 and debit == 0:
        # Create a small dummy transaction so stream isn't empty on this day
        description, tx_type = ("Coffee Shop", "POS")
        debit = round(rng.uniform(3.0, 10.0), 2)

    balance = round(last_balance + credit - debit, 2)
    
    # Avoid extreme overdraft in simple generation
    if balance < -1000:
        balance += 1500

    return {
        "transaction_date": next_date.strftime("%d/%m/%Y"),
        "description": description,
        "transaction_type": tx_type,
        "credit_amount": credit,
        "debit_amount": debit,
        "balance": balance,
    }
