#!/usr/bin/env python3
"""
Query to show total payments in TL currency only (Ödenen Tutar where Ödenen Döviz = TL)
No USD conversion - just the raw TL amounts from imported data
"""

import sqlite3
import json

def query_raw_tl_payments():
    """
    Query the database to get raw TL payment amounts without USD conversion
    Shows exactly what was in "Ödenen Tutar" field for "Ödenen Döviz" = TL
    """
    try:
        print("💰 RAW TL PAYMENTS ANALYSIS (No USD Conversion)")
        print("=" * 60)
        
        # Connect to database
        conn = sqlite3.connect('./backend/payments.db')
        cursor = conn.cursor()
        
        # Query 1: Total of all TL payments (raw amounts)
        print("📊 Query 1: Total of all payments in TL currency")
        print("-" * 50)
        
        query1 = """
        SELECT 
            currency,
            SUM(amount) as total_raw_amount,
            COUNT(*) as payment_count,
            AVG(amount) as avg_amount,
            MIN(amount) as min_amount,
            MAX(amount) as max_amount
        FROM payments 
        WHERE currency = 'TL'
        GROUP BY currency
        """
        
        cursor.execute(query1)
        result1 = cursor.fetchone()
        
        if result1:
            currency, total_raw, count, avg_amt, min_amt, max_amt = result1
            print(f"Currency: {currency}")
            print(f"Total Raw TL Amount: {total_raw:,.2f} TL")
            print(f"Number of Payments: {count}")
            print(f"Average Payment: {avg_amt:,.2f} TL")
            print(f"Minimum Payment: {min_amt:,.2f} TL")
            print(f"Maximum Payment: {max_amt:,.2f} TL")
        
        # Query 2: Breakdown by payment method (TL only)
        print(f"\n📊 Query 2: TL payments breakdown by payment method")
        print("-" * 50)
        
        query2 = """
        SELECT 
            payment_method,
            SUM(amount) as total_raw_amount,
            COUNT(*) as payment_count
        FROM payments 
        WHERE currency = 'TL'
        GROUP BY payment_method
        ORDER BY total_raw_amount DESC
        """
        
        cursor.execute(query2)
        results2 = cursor.fetchall()
        
        total_by_method = 0
        for row in results2:
            method, total_raw, count = row
            total_by_method += total_raw
            print(f"Payment Method: {method}")
            print(f"  Total TL Amount: {total_raw:,.2f} TL")
            print(f"  Number of Payments: {count}")
            print()
        
        print(f"Total across all methods: {total_by_method:,.2f} TL")
        
        # Query 3: Breakdown by project (TL only)
        print(f"\n📊 Query 3: TL payments breakdown by project")
        print("-" * 50)
        
        query3 = """
        SELECT 
            project,
            SUM(amount) as total_raw_amount,
            COUNT(*) as payment_count
        FROM payments 
        WHERE currency = 'TL'
        GROUP BY project
        ORDER BY total_raw_amount DESC
        """
        
        cursor.execute(query3)
        results3 = cursor.fetchall()
        
        total_by_project = 0
        for row in results3:
            project, total_raw, count = row
            total_by_project += total_raw
            print(f"Project: {project}")
            print(f"  Total TL Amount: {total_raw:,.2f} TL")
            print(f"  Number of Payments: {count}")
            print()
        
        print(f"Total across all projects: {total_by_project:,.2f} TL")
        
        # Query 4: Banka Havalesi specifically in TL (as requested)
        print(f"\n📊 Query 4: Banka Havalesi payments in TL only")
        print("-" * 50)
        
        query4 = """
        SELECT 
            SUM(amount) as total_raw_amount,
            COUNT(*) as payment_count
        FROM payments 
        WHERE currency = 'TL' 
        AND payment_method LIKE '%Havalesi%'
        """
        
        cursor.execute(query4)
        result4 = cursor.fetchone()
        
        if result4:
            total_raw, count = result4
            print(f"Banka Havalesi TL Payments:")
            print(f"  Total Raw TL Amount: {total_raw:,.2f} TL")
            print(f"  Number of Payments: {count}")
        
        # Query 5: Sample of largest TL payments
        print(f"\n📊 Query 5: Top 10 largest TL payments")
        print("-" * 50)
        
        query5 = """
        SELECT 
            customer_name,
            payment_date,
            amount,
            payment_method,
            project
        FROM payments 
        WHERE currency = 'TL'
        ORDER BY amount DESC
        LIMIT 10
        """
        
        cursor.execute(query5)
        results5 = cursor.fetchall()
        
        for i, row in enumerate(results5, 1):
            customer, date, amount, method, project = row
            print(f"{i}. {customer}")
            print(f"   Amount: {amount:,.2f} TL")
            print(f"   Date: {date}")
            print(f"   Method: {method}")
            print(f"   Project: {project}")
            print("-" * 30)
        
        # Query 6: Monthly breakdown of TL payments
        print(f"\n📊 Query 6: Monthly breakdown of TL payments")
        print("-" * 50)
        
        query6 = """
        SELECT 
            strftime('%Y-%m', payment_date) as month,
            SUM(amount) as total_raw_amount,
            COUNT(*) as payment_count
        FROM payments 
        WHERE currency = 'TL'
        GROUP BY strftime('%Y-%m', payment_date)
        ORDER BY month
        """
        
        cursor.execute(query6)
        results6 = cursor.fetchall()
        
        yearly_total = 0
        for row in results6:
            month, total_raw, count = row
            yearly_total += total_raw
            print(f"{month}: {total_raw:,.2f} TL ({count} payments)")
        
        print(f"\nTotal for all months: {yearly_total:,.2f} TL")
        
        conn.close()
        
        print(f"\n🎯 FINAL SUMMARY:")
        print("=" * 40)
        print(f"TOTAL TL PAYMENTS (Raw Ödenen Tutar where Ödenen Döviz = TL):")
        print(f"Amount: {result1[1]:,.2f} TL")
        print(f"Count: {result1[2]} payments")
        print()
        print("This represents the sum of all 'Ödenen Tutar' values")
        print("where 'Ödenen Döviz' = 'TL' from the imported Excel data")
        print("NO currency conversion applied - raw TL amounts only")
        
        return True
        
    except Exception as e:
        print(f"❌ Error during database query: {e}")
        return False

if __name__ == "__main__":
    query_raw_tl_payments()