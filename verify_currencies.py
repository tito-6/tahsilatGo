#!/usr/bin/env python3
"""
Quick verification of currency breakdown
"""

import requests

def verify_currency_breakdown():
    try:
        response = requests.get('http://localhost:8080/api/payments')
        data = response.json()
        
        methods = ['Banka Havalesi', 'Nakit', 'Çek']
        
        for method_name in methods:
            print(f"\n{method_name.upper()} CURRENCY BREAKDOWN:")
            print("-" * 40)
            
            # Find payments for this method
            payments = [p for p in data if method_name.split()[0] in p['payment_method']]
            
            currencies = {}
            for p in payments:
                curr = p['currency']
                currencies[curr] = currencies.get(curr, 0) + p['amount']
            
            for curr, amt in sorted(currencies.items()):
                print(f"  {curr}: {amt:,.2f}")
            
            total_non_tl = sum(amt for curr, amt in currencies.items() if curr != 'TL')
            print(f"  Total non-TL: {total_non_tl:,.2f}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    verify_currency_breakdown()