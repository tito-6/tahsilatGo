#!/usr/bin/env python3
"""
Query to show Banka Havalesi payments in USD currency only (Ödenen Tutar where Ödenen Döviz = USD)
No TL conversion - just the raw USD amounts from imported data
"""

import sqlite3
import json

def query_usd_banka_havalesi():
    """
    Query the database to get Banka Havalesi payments in USD currency
    Shows exactly what was in "Ödenen Tutar" field for "Ödenen Döviz" = USD and payment method = Banka Havalesi
    """
    try:
        print("💵 USD BANKA HAVALESİ PAYMENTS ANALYSIS")
        print("=" * 60)
        
        # Connect to database
        conn = sqlite3.connect('./backend/payments.db')
        cursor = conn.cursor()
        
        # Query 1: Total USD Banka Havalesi payments
        print("📊 Query 1: Total Banka Havalesi payments in USD currency")
        print("-" * 50)
        
        query1 = """
        SELECT 
            payment_method,
            currency,
            SUM(amount) as total_usd_amount,
            COUNT(*) as payment_count,
            AVG(amount) as avg_amount,
            MIN(amount) as min_amount,
            MAX(amount) as max_amount
        FROM payments 
        WHERE currency = 'USD' 
        AND payment_method LIKE '%Havalesi%'
        GROUP BY payment_method, currency
        """
        
        cursor.execute(query1)
        result1 = cursor.fetchone()
        
        if result1:
            method, currency, total_usd, count, avg_amt, min_amt, max_amt = result1
            print(f"Payment Method: {method}")
            print(f"Currency: {currency}")
            print(f"Total USD Amount: {total_usd:,.2f} USD")
            print(f"Number of Payments: {count}")
            print(f"Average Payment: {avg_amt:,.2f} USD")
            print(f"Minimum Payment: {min_amt:,.2f} USD")
            print(f"Maximum Payment: {max_amt:,.2f} USD")
        else:
            print("No Banka Havalesi payments found in USD currency")
            
        # Query 2: USD Banka Havalesi breakdown by project
        print(f"\n📊 Query 2: USD Banka Havalesi breakdown by project")
        print("-" * 50)
        
        query2 = """
        SELECT 
            project,
            SUM(amount) as total_usd_amount,
            COUNT(*) as payment_count
        FROM payments 
        WHERE currency = 'USD' 
        AND payment_method LIKE '%Havalesi%'
        GROUP BY project
        ORDER BY total_usd_amount DESC
        """
        
        cursor.execute(query2)
        results2 = cursor.fetchall()
        
        total_by_project = 0
        if results2:
            for row in results2:
                project, total_usd, count = row
                total_by_project += total_usd
                print(f"Project: {project}")
                print(f"  Total USD Amount: {total_usd:,.2f} USD")
                print(f"  Number of Payments: {count}")
                print()
            print(f"Total across all projects: {total_by_project:,.2f} USD")
        else:
            print("No USD Banka Havalesi payments found by project")
        
        # Query 3: All USD Banka Havalesi payments (detailed list)
        print(f"\n📊 Query 3: All USD Banka Havalesi payments (detailed)")
        print("-" * 50)
        
        query3 = """
        SELECT 
            customer_name,
            payment_date,
            amount,
            project,
            account_name,
            exchange_rate
        FROM payments 
        WHERE currency = 'USD' 
        AND payment_method LIKE '%Havalesi%'
        ORDER BY amount DESC
        """
        
        cursor.execute(query3)
        results3 = cursor.fetchall()
        
        if results3:
            for i, row in enumerate(results3, 1):
                customer, date, amount, project, account, rate = row
                print(f"{i}. {customer}")
                print(f"   Amount: {amount:,.2f} USD")
                print(f"   Date: {date}")
                print(f"   Project: {project}")
                print(f"   Account: {account}")
                print(f"   Exchange Rate: {rate}")
                print("-" * 40)
        else:
            print("No USD Banka Havalesi payments found")
        
        # Query 4: Monthly breakdown of USD Banka Havalesi
        print(f"\n📊 Query 4: Monthly breakdown of USD Banka Havalesi")
        print("-" * 50)
        
        query4 = """
        SELECT 
            strftime('%Y-%m', payment_date) as month,
            SUM(amount) as total_usd_amount,
            COUNT(*) as payment_count
        FROM payments 
        WHERE currency = 'USD' 
        AND payment_method LIKE '%Havalesi%'
        GROUP BY strftime('%Y-%m', payment_date)
        ORDER BY month
        """
        
        cursor.execute(query4)
        results4 = cursor.fetchall()
        
        yearly_total = 0
        if results4:
            for row in results4:
                month, total_usd, count = row
                yearly_total += total_usd
                print(f"{month}: {total_usd:,.2f} USD ({count} payments)")
            print(f"\nTotal for all months: {yearly_total:,.2f} USD")
        else:
            print("No monthly USD Banka Havalesi payments found")
        
        # Query 5: Compare with all USD payments (any method)
        print(f"\n📊 Query 5: Compare with all USD payments (any method)")
        print("-" * 50)
        
        query5 = """
        SELECT 
            payment_method,
            SUM(amount) as total_usd_amount,
            COUNT(*) as payment_count
        FROM payments 
        WHERE currency = 'USD'
        GROUP BY payment_method
        ORDER BY total_usd_amount DESC
        """
        
        cursor.execute(query5)
        results5 = cursor.fetchall()
        
        total_all_usd = 0
        print("All USD payments by method:")
        for row in results5:
            method, total_usd, count = row
            total_all_usd += total_usd
            print(f"  {method}: {total_usd:,.2f} USD ({count} payments)")
        
        print(f"\nTotal USD across all methods: {total_all_usd:,.2f} USD")
        
        # Query 6: Account breakdown for USD Banka Havalesi
        print(f"\n📊 Query 6: USD Banka Havalesi by account")
        print("-" * 50)
        
        query6 = """
        SELECT 
            account_name,
            SUM(amount) as total_usd_amount,
            COUNT(*) as payment_count
        FROM payments 
        WHERE currency = 'USD' 
        AND payment_method LIKE '%Havalesi%'
        GROUP BY account_name
        ORDER BY total_usd_amount DESC
        """
        
        cursor.execute(query6)
        results6 = cursor.fetchall()
        
        if results6:
            for row in results6:
                account, total_usd, count = row
                print(f"Account: {account}")
                print(f"  Total USD: {total_usd:,.2f} USD ({count} payments)")
                print()
        else:
            print("No USD Banka Havalesi accounts found")
        
        conn.close()
        
        print(f"\n🎯 FINAL SUMMARY:")
        print("=" * 40)
        if result1:
            print(f"TOTAL BANKA HAVALESİ IN USD (Raw Ödenen Tutar where Ödenen Döviz = USD):")
            print(f"Amount: {result1[2]:,.2f} USD")
            print(f"Count: {result1[3]} payments")
            print()
            print("This represents the sum of all 'Ödenen Tutar' values")
            print("where 'Ödenen Döviz' = 'USD' AND payment method contains 'Havalesi'")
            print("NO currency conversion applied - raw USD amounts only")
        else:
            print("NO BANKA HAVALESİ PAYMENTS FOUND IN USD CURRENCY")
            print("All Banka Havalesi payments appear to be in TL currency only")
        
        return True
        
    except Exception as e:
        print(f"❌ Error during database query: {e}")
        return False

if __name__ == "__main__":
    query_usd_banka_havalesi()