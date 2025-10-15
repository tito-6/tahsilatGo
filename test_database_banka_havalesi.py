#!/usr/bin/env python3
"""
Direct database query to verify Banka Havalesi TL totals
This script queries the SQLite database directly to validate the API results
"""

import sqlite3
import json

def query_database_banka_havalesi():
    """
    Query the database directly to get Banka Havalesi TL totals
    and compare with API results
    """
    try:
        print("🔍 Direct Database Query - Banka Havalesi TL Analysis")
        print("=" * 60)
        
        # Connect to database
        conn = sqlite3.connect('./backend/payments.db')
        cursor = conn.cursor()
        
        # Query 1: Get all Banka Havalesi payments in TL
        print("📊 Query 1: All Banka Havalesi payments in TL currency")
        print("-" * 50)
        
        query1 = """
        SELECT 
            payment_method,
            currency,
            SUM(amount) as total_tl_amount,
            COUNT(*) as payment_count,
            SUM(amount_usd) as total_usd_converted
        FROM payments 
        WHERE payment_method LIKE '%Havalesi%' 
        AND currency = 'TL'
        GROUP BY payment_method, currency
        ORDER BY total_tl_amount DESC
        """
        
        cursor.execute(query1)
        results1 = cursor.fetchall()
        
        for row in results1:
            method, currency, tl_amount, count, usd_converted = row
            print(f"Payment Method: {method}")
            print(f"Currency: {currency}")
            print(f"Total TL Amount: {tl_amount:,.2f}")
            print(f"Number of Payments: {count}")
            print(f"Total USD (converted): {usd_converted:,.2f}")
            print()
        
        # Query 2: Breakdown by project
        print("📊 Query 2: Banka Havalesi TL breakdown by project")
        print("-" * 50)
        
        query2 = """
        SELECT 
            project,
            SUM(amount) as total_tl_amount,
            COUNT(*) as payment_count,
            SUM(amount_usd) as total_usd_converted
        FROM payments 
        WHERE payment_method LIKE '%Havalesi%' 
        AND currency = 'TL'
        GROUP BY project
        ORDER BY total_tl_amount DESC
        """
        
        cursor.execute(query2)
        results2 = cursor.fetchall()
        
        total_tl_db = 0
        total_usd_db = 0
        
        for row in results2:
            project, tl_amount, count, usd_converted = row
            total_tl_db += tl_amount
            total_usd_db += usd_converted
            print(f"Project: {project}")
            print(f"Total TL Amount: {tl_amount:,.2f}")
            print(f"Number of Payments: {count}")
            print(f"Total USD (converted): {usd_converted:,.2f}")
            print()
        
        print(f"Database Total TL: {total_tl_db:,.2f}")
        print(f"Database Total USD: {total_usd_db:,.2f}")
        
        # Query 3: Check for any USD payments with Banka Havalesi
        print("📊 Query 3: Check for Banka Havalesi payments in USD")
        print("-" * 50)
        
        query3 = """
        SELECT 
            currency,
            SUM(amount) as total_amount,
            COUNT(*) as payment_count,
            SUM(amount_usd) as total_usd
        FROM payments 
        WHERE payment_method LIKE '%Havalesi%' 
        AND currency = 'USD'
        GROUP BY currency
        """
        
        cursor.execute(query3)
        results3 = cursor.fetchall()
        
        if results3:
            for row in results3:
                currency, amount, count, usd_total = row
                print(f"Currency: {currency}")
                print(f"Total Amount: {amount:,.2f}")
                print(f"Number of Payments: {count}")
                print(f"Total USD: {usd_total:,.2f}")
                total_usd_db += usd_total
        else:
            print("No Banka Havalesi payments found in USD currency")
        
        # Query 4: Sample payments for verification
        print("\n📊 Query 4: Sample Banka Havalesi TL payments")
        print("-" * 50)
        
        query4 = """
        SELECT 
            customer_name,
            payment_date,
            amount,
            currency,
            project,
            amount_usd,
            exchange_rate
        FROM payments 
        WHERE payment_method LIKE '%Havalesi%' 
        AND currency = 'TL'
        ORDER BY amount DESC
        LIMIT 5
        """
        
        cursor.execute(query4)
        results4 = cursor.fetchall()
        
        for row in results4:
            customer, date, amount, currency, project, amount_usd, rate = row
            print(f"Customer: {customer}")
            print(f"Date: {date}")
            print(f"Amount: {amount:,.2f} {currency}")
            print(f"Project: {project}")
            print(f"USD Equivalent: {amount_usd:,.2f}")
            print(f"Exchange Rate: {rate}")
            print("-" * 30)
        
        conn.close()
        
        print("\n🎯 DATABASE SUMMARY:")
        print("=" * 30)
        print(f"Total Banka Havalesi in TL: {total_tl_db:,.2f}")
        print(f"Total USD Equivalent: {total_usd_db:,.2f}")
        
        # Compare with API (from our previous test)
        api_tl = 168969103.61  # From API test
        api_usd = 6339349.73   # From API test
        
        print(f"\n📊 API vs Database Comparison:")
        print(f"API TL: {api_tl:,.2f}")
        print(f"DB TL:  {total_tl_db:,.2f}")
        print(f"TL Match: {'✅' if abs(api_tl - total_tl_db) < 0.01 else '❌'}")
        
        print(f"\nAPI USD: {api_usd:,.2f}")
        print(f"DB USD:  {total_usd_db:,.2f}")
        print(f"USD Match: {'✅' if abs(api_usd - total_usd_db) < 0.01 else '❌'}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error during database query: {e}")
        return False

if __name__ == "__main__":
    query_database_banka_havalesi()