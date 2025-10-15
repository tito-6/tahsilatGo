#!/usr/bin/env python3
"""
API verification for USD Banka Havalesi payments
"""

import requests
import json

def verify_api_usd_banka_havalesi():
    try:
        print("💵 API VERIFICATION - USD Banka Havalesi Payments")
        print("=" * 55)
        
        response = requests.get('http://localhost:8080/api/payments')
        if response.status_code != 200:
            print(f"❌ API Error: {response.status_code}")
            return
            
        data = response.json()
        
        # Filter USD Banka Havalesi payments only
        usd_banka_havalesi = [p for p in data if p['currency'] == 'USD' and 'Havalesi' in p['payment_method']]
        total_usd = sum(p['amount'] for p in usd_banka_havalesi)
        
        print(f"Total USD Banka Havalesi: {total_usd:,.2f} USD")
        print(f"Number of Payments: {len(usd_banka_havalesi)}")
        print()
        
        if usd_banka_havalesi:
            # Group by project
            projects = {}
            for p in usd_banka_havalesi:
                project = p['project']
                projects[project] = projects.get(project, 0) + p['amount']
            
            print("By Project:")
            for project, amount in sorted(projects.items(), key=lambda x: x[1], reverse=True):
                count = len([p for p in usd_banka_havalesi if p['project'] == project])
                print(f"  {project}: {amount:,.2f} USD ({count} payments)")
            
            print()
            
            # Group by account
            accounts = {}
            for p in usd_banka_havalesi:
                account = p['account_name']
                accounts[account] = accounts.get(account, 0) + p['amount']
            
            print("By Account:")
            for account, amount in sorted(accounts.items(), key=lambda x: x[1], reverse=True):
                count = len([p for p in usd_banka_havalesi if p['account_name'] == account])
                print(f"  {account}: {amount:,.2f} USD ({count} payments)")
            
            print()
            
            # Top 5 largest payments
            print("Top 5 Largest USD Banka Havalesi Payments:")
            sorted_payments = sorted(usd_banka_havalesi, key=lambda x: x['amount'], reverse=True)
            for i, p in enumerate(sorted_payments[:5], 1):
                print(f"  {i}. {p['customer_name']}")
                print(f"     Amount: {p['amount']:,.2f} USD")
                print(f"     Date: {p['payment_date']}")
                print(f"     Project: {p['project']}")
                print()
        else:
            print("No USD Banka Havalesi payments found")
        
        # Compare with total USD payments
        all_usd = [p for p in data if p['currency'] == 'USD']
        total_all_usd = sum(p['amount'] for p in all_usd)
        
        print(f"📊 Comparison with all USD payments:")
        print(f"Total USD Banka Havalesi: {total_usd:,.2f} USD")
        print(f"Total All USD Payments: {total_all_usd:,.2f} USD")
        print(f"Percentage: {(total_usd/total_all_usd*100):,.2f}%" if total_all_usd > 0 else "0%")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    verify_api_usd_banka_havalesi()