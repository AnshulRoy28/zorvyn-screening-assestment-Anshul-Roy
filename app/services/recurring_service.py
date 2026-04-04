"""
Recurring Expense Detection Service

Automatically identifies recurring bills and subscriptions from transaction history.
Uses coefficient of variation (CV) to distinguish fixed subscriptions from variable spending.
"""

from datetime import datetime, date, timedelta
from collections import defaultdict
from sqlalchemy import extract
from app.models import Transaction
from app.database import db
import math


# Categories typically associated with subscriptions/bills
SUBSCRIPTION_CATEGORIES = {'Bills', 'Entertainment', 'Health'}

# CV thresholds: lower = more strict
CV_THRESHOLD_DEFAULT = 0.15      # 15% for general categories
CV_THRESHOLD_SUBSCRIPTION = 0.25  # 25% for subscription-likely categories

MIN_MONTHS = 2  # Minimum distinct months to be considered recurring


def detect_recurring_expenses(user_id):
    """
    Detect recurring expenses for a user by analyzing transaction patterns.
    
    Returns a list of detected recurring items, each with:
    - item_name, category, avg_amount, frequency_days, months_seen
    - last_date, next_expected, status, total_yearly_cost
    """
    # Get all expense transactions for user, ordered by date
    transactions = Transaction.query.filter_by(
        user_id=user_id, type='expense'
    ).order_by(Transaction.date.asc()).all()
    
    if not transactions:
        return []
    
    # Group transactions by normalized item_name
    groups = defaultdict(list)
    for t in transactions:
        key = t.item_name.strip().lower()
        groups[key].append(t)
    
    recurring = []
    today = date.today()
    
    for key, txns in groups.items():
        if len(txns) < MIN_MONTHS:
            continue
        
        # Check distinct months
        months_set = set()
        for t in txns:
            months_set.add((t.date.year, t.date.month))
        
        if len(months_set) < MIN_MONTHS:
            continue
        
        # Calculate coefficient of variation for amounts
        amounts = [t.amount for t in txns]
        mean_amount = sum(amounts) / len(amounts)
        
        if mean_amount == 0:
            continue
        
        variance = sum((a - mean_amount) ** 2 for a in amounts) / len(amounts)
        std_dev = math.sqrt(variance)
        cv = std_dev / mean_amount
        
        # Determine threshold based on category
        category = txns[0].category
        threshold = CV_THRESHOLD_SUBSCRIPTION if category in SUBSCRIPTION_CATEGORIES else CV_THRESHOLD_DEFAULT
        
        if cv > threshold:
            continue  # Too much variation — likely not a subscription
        
        # Calculate frequency (average days between consecutive transactions)
        dates_sorted = sorted([t.date for t in txns])
        if len(dates_sorted) >= 2:
            gaps = []
            for i in range(1, len(dates_sorted)):
                gap = (dates_sorted[i] - dates_sorted[i - 1]).days
                if gap > 0:  # Ignore same-day duplicates
                    gaps.append(gap)
            
            avg_frequency = sum(gaps) / len(gaps) if gaps else 30
        else:
            avg_frequency = 30
        
        # Determine frequency label
        if avg_frequency <= 9:
            freq_label = 'weekly'
        elif avg_frequency <= 18:
            freq_label = 'bi-weekly'
        elif avg_frequency <= 35:
            freq_label = 'monthly'
        elif avg_frequency <= 100:
            freq_label = 'quarterly'
        else:
            freq_label = 'yearly'
        
        # Calculate next expected date
        last_date = dates_sorted[-1]
        next_expected = last_date + timedelta(days=round(avg_frequency))
        
        # Determine status
        days_since_last = (today - last_date).days
        if days_since_last <= avg_frequency * 1.5:
            status = 'active'
        else:
            status = 'possibly_cancelled'
        
        # Estimate yearly cost
        occurrences_per_year = 365 / avg_frequency if avg_frequency > 0 else 12
        yearly_cost = mean_amount * occurrences_per_year
        
        recurring.append({
            'item_name': txns[0].item_name,  # Use original casing from first transaction
            'category': category,
            'avg_amount': round(mean_amount, 2),
            'amount_variation': round(cv * 100, 1),  # As percentage
            'frequency_days': round(avg_frequency),
            'frequency': freq_label,
            'months_seen': len(months_set),
            'occurrences': len(txns),
            'last_date': last_date.isoformat(),
            'next_expected': next_expected.isoformat(),
            'status': status,
            'yearly_cost': round(yearly_cost, 2)
        })
    
    # Sort by yearly cost descending (biggest expenses first)
    recurring.sort(key=lambda x: x['yearly_cost'], reverse=True)
    
    return recurring


def get_recurring_calendar(user_id, year, month):
    """
    Generate calendar data for a specific month showing expected recurring expenses.
    
    Returns:
    - month_info: year, month, days_in_month, first_day_weekday
    - expenses: list of {day, item_name, amount, category, status}
    - total_monthly: total expected recurring cost for this month
    """
    recurring = detect_recurring_expenses(user_id)
    
    # Calculate first/last day of requested month
    first_day = date(year, month, 1)
    if month == 12:
        last_day = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        last_day = date(year, month + 1, 1) - timedelta(days=1)
    
    days_in_month = last_day.day
    first_weekday = first_day.weekday()  # 0=Monday, 6=Sunday
    
    calendar_entries = []
    total_monthly = 0
    
    for item in recurring:
        # For each recurring item, estimate which day it falls on this month
        # Use the day-of-month from the last occurrence
        last_date = date.fromisoformat(item['last_date'])
        expected_day = last_date.day
        
        # Clamp to valid day in this month
        if expected_day > days_in_month:
            expected_day = days_in_month
        
        # Only include if frequency suggests it occurs this month
        freq = item['frequency']
        include = False
        
        if freq in ('monthly', 'weekly', 'bi-weekly'):
            include = True
        elif freq == 'quarterly':
            # Check if this month aligns with the quarterly cycle
            months_diff = (year - last_date.year) * 12 + (month - last_date.month)
            include = (months_diff % 3) == 0
        elif freq == 'yearly':
            include = (last_date.month == month)
        
        if include:
            calendar_entries.append({
                'day': expected_day,
                'item_name': item['item_name'],
                'amount': item['avg_amount'],
                'category': item['category'],
                'status': item['status'],
                'frequency': item['frequency']
            })
            
            if freq == 'weekly':
                total_monthly += item['avg_amount'] * 4
            elif freq == 'bi-weekly':
                total_monthly += item['avg_amount'] * 2
            else:
                total_monthly += item['avg_amount']
    
    return {
        'month_info': {
            'year': year,
            'month': month,
            'days_in_month': days_in_month,
            'first_weekday': first_weekday
        },
        'expenses': sorted(calendar_entries, key=lambda x: x['day']),
        'total_monthly': round(total_monthly, 2)
    }
