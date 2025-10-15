#!/usr/bin/env python3
"""
Analyze ALL payment methods to see USD vs converted amounts
and identify what needs to be fixed
"""

import requests
import sqlite3

def analyze_all_payment_methods():
    """
    Analyze all payment methods to see the difference between raw USD and converted amounts
    """
    try:
        print("🔍 ANALYZING ALL PAYMENT METHODS")
        print("=" * 60)
        
        # Get API data
        response = requests.get('http://localhost:8080/api/reports/yearly/2025')
        if response.status_code != 200:
            print(f"❌ API Error: {response.status_code}")
            return
            
        report = response.json()
        
        # Connect to database for verification
        conn = sqlite3.connect('./backend/payments.db')
        cursor = conn.cursor()
        
        payment_methods = ['Banka Havalesi', 'Nakit', 'Çek']
        
        for method in payment_methods:
            print(f"\n📊 {method.upper()} ANALYSIS:")
            print("-" * 40)
            
            # API data
            general = report['payment_methods'].get(method, {})
            mkm = report['mkm_payment_methods'].get(method, {})
            msm = report['msm_payment_methods'].get(method, {})
            
            print(f"API Data (what frontend currently shows):")
            print(f"  General - TL: {general.get('tl', 0):,.2f}, USD: {general.get('usd', 0):,.2f}, Total USD: {general.get('total_usd', 0):,.2f}")
            print(f"  MKM - TL: {mkm.get('tl', 0):,.2f}, USD: {mkm.get('usd', 0):,.2f}, Total USD: {mkm.get('total_usd', 0):,.2f}")
            print(f"  MSM - TL: {msm.get('tl', 0):,.2f}, USD: {msm.get('usd', 0):,.2f}, Total USD: {msm.get('total_usd', 0):,.2f}")
            
            # Database verification
            query = """
            SELECT 
                currency,
                SUM(amount) as total_amount,
                COUNT(*) as count
            FROM payments 
            WHERE payment_method LIKE ?
            GROUP BY currency
            ORDER BY currency
            """
            
            cursor.execute(query, (f'%{method.split()[0]}%',))
            db_results = cursor.fetchall()
            
            print(f"\nDatabase verification (raw amounts by currency):")
            total_non_tl = 0
            for currency, amount, count in db_results:
                print(f"  {currency}: {amount:,.2f} ({count} payments)")
                if currency != 'TL':
                    total_non_tl += amount
            
            print(f"\nAnalysis:")
            print(f"  Raw non-TL payments: {total_non_tl:,.2f}")
            print(f"  API USD field: {general.get('usd', 0):,.2f}")
            print(f"  API Total USD field: {general.get('total_usd', 0):,.2f}")
            print(f"  Difference (converted TL): {general.get('total_usd', 0) - general.get('usd', 0):,.2f}")
            
            # Check if frontend is showing the right values
            should_show = general.get('usd', 0)
            currently_shows = general.get('total_usd', 0)
            
            if abs(should_show - currently_shows) > 0.01:
                print(f"  ❌ NEEDS FIX: Frontend should show {should_show:,.2f} but shows {currently_shows:,.2f}")
            else:
                print(f"  ✅ OK: Frontend correctly shows {should_show:,.2f}")
        
        conn.close()
        
        print(f"\n🎯 SUMMARY:")
        print("The USD columns should show ONLY payments where:")
        print("- 'Ödenen Döviz' = 'USD', 'EUR', or other non-TL currencies")
        print("- NO TL-to-USD conversion included")
        print("\nBased on our previous fix for Banka Havalesi, all methods need the same fix.")
        
        return True
        
    except Exception as e:
        print(f"❌ Error during analysis: {e}")
        return False

if __name__ == "__main__":
    analyze_all_payment_methods()