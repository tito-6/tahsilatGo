#!/usr/bin/env python3
"""
Simple script to process payments API and show raw TL totals
"""

import requests
import json

def verify_api_tl_totals():
    try:
        print("📊 API VERIFICATION - Raw TL Payments")
        print("=" * 50)
        
        response = requests.get('http://localhost:8080/api/payments')
        if response.status_code != 200:
            print(f"❌ API Error: {response.status_code}")
            return
            
        data = response.json()
        
        # Filter TL payments only (data is a list directly)
        tl_payments = [p for p in data if p['currency'] == 'TL']
        total_tl = sum(p['amount'] for p in tl_payments)
        
        print(f"Total TL Payments: {total_tl:,.2f} TL")
        print(f"Number of TL Payments: {len(tl_payments)}")
        print()
        
        # Group by payment method
        methods = {}
        for p in tl_payments:
            method = p['payment_method']
            methods[method] = methods.get(method, 0) + p['amount']
        
        print("By Payment Method:")
        for method, amount in sorted(methods.items(), key=lambda x: x[1], reverse=True):
            print(f"  {method}: {amount:,.2f} TL")
        
        print()
        
        # Group by project
        projects = {}
        for p in tl_payments:
            project = p['project']
            projects[project] = projects.get(project, 0) + p['amount']
        
        print("By Project:")
        for project, amount in sorted(projects.items(), key=lambda x: x[1], reverse=True):
            print(f"  {project}: {amount:,.2f} TL")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    verify_api_tl_totals()