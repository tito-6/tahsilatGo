#!/usr/bin/env python3
"""
Test script to verify Banka Havalesi TL totals from the yearly report API
This script will extract all Banka Havalesi payments in TL currency and verify totals
"""

import requests
import json

def test_banka_havalesi_tl_totals():
    """
    Test Banka Havalesi TL totals by calling the yearly report API
    and extracting relevant data
    """
    try:
        # Get the yearly report from API
        print("🔍 Testing Banka Havalesi TL Totals")
        print("=" * 50)
        
        response = requests.get('http://localhost:8080/api/reports/yearly/2025')
        
        if response.status_code != 200:
            print(f"❌ API Error: {response.status_code}")
            return False
            
        report = response.json()
        
        # Extract main payment methods
        payment_methods = report.get('payment_methods', {})
        mkm_methods = report.get('mkm_payment_methods', {})
        msm_methods = report.get('msm_payment_methods', {})
        
        print("📊 MAIN YEARLY TOTALS:")
        print("-" * 30)
        
        # General Banka Havalesi totals
        banka_havalesi_general = payment_methods.get('Banka Havalesi', {})
        general_tl = banka_havalesi_general.get('tl', 0)
        general_usd_original = banka_havalesi_general.get('usd', 0)
        general_total_usd = banka_havalesi_general.get('total_usd', 0)
        
        print(f"Banka Havalesi General:")
        print(f"  TL Amount: {general_tl:,.2f}")
        print(f"  USD Amount (original): {general_usd_original:,.2f}")
        print(f"  Total USD (TL converted + USD): {general_total_usd:,.2f}")
        
        # MKM Banka Havalesi totals
        banka_havalesi_mkm = mkm_methods.get('Banka Havalesi', {})
        mkm_tl = banka_havalesi_mkm.get('tl', 0)
        mkm_usd_original = banka_havalesi_mkm.get('usd', 0)
        mkm_total_usd = banka_havalesi_mkm.get('total_usd', 0)
        
        print(f"\nBanka Havalesi MKM:")
        print(f"  TL Amount: {mkm_tl:,.2f}")
        print(f"  USD Amount (original): {mkm_usd_original:,.2f}")
        print(f"  Total USD (TL converted + USD): {mkm_total_usd:,.2f}")
        
        # MSM Banka Havalesi totals
        banka_havalesi_msm = msm_methods.get('Banka Havalesi', {})
        msm_tl = banka_havalesi_msm.get('tl', 0)
        msm_usd_original = banka_havalesi_msm.get('usd', 0)
        msm_total_usd = banka_havalesi_msm.get('total_usd', 0)
        
        print(f"\nBanka Havalesi MSM:")
        print(f"  TL Amount: {msm_tl:,.2f}")
        print(f"  USD Amount (original): {msm_usd_original:,.2f}")
        print(f"  Total USD (TL converted + USD): {msm_total_usd:,.2f}")
        
        # Verification
        print(f"\n🔍 VERIFICATION:")
        print("-" * 30)
        
        # Check if MKM + MSM = General
        combined_tl = mkm_tl + msm_tl
        combined_total_usd = mkm_total_usd + msm_total_usd
        
        tl_match = abs(combined_tl - general_tl) < 0.01
        usd_match = abs(combined_total_usd - general_total_usd) < 0.01
        
        print(f"MKM TL + MSM TL = {combined_tl:,.2f}")
        print(f"General TL = {general_tl:,.2f}")
        print(f"TL Sum Match: {'✅' if tl_match else '❌'}")
        
        print(f"\nMKM USD + MSM USD = {combined_total_usd:,.2f}")
        print(f"General USD = {general_total_usd:,.2f}")
        print(f"USD Sum Match: {'✅' if usd_match else '❌'}")
        
        # Monthly breakdown
        print(f"\n📅 MONTHLY BREAKDOWN:")
        print("-" * 30)
        
        monthly_reports = report.get('monthly_reports', [])
        total_monthly_tl = 0
        total_monthly_usd = 0
        
        for month_report in monthly_reports:
            month = month_report.get('month', 'Unknown')
            month_payment_methods = month_report.get('payment_methods', {})
            month_banka_havalesi = month_payment_methods.get('Banka Havalesi', {})
            
            month_tl = month_banka_havalesi.get('tl', 0)
            month_usd = month_banka_havalesi.get('total_usd', 0)
            
            total_monthly_tl += month_tl
            total_monthly_usd += month_usd
            
            print(f"{month}: TL={month_tl:,.2f}, USD={month_usd:,.2f}")
        
        print(f"\nTotal from Monthly Reports:")
        print(f"  TL: {total_monthly_tl:,.2f}")
        print(f"  USD: {total_monthly_usd:,.2f}")
        
        # Final verification
        monthly_tl_match = abs(total_monthly_tl - general_tl) < 0.01
        monthly_usd_match = abs(total_monthly_usd - general_total_usd) < 0.01
        
        print(f"\nMonthly vs General TL Match: {'✅' if monthly_tl_match else '❌'}")
        print(f"Monthly vs General USD Match: {'✅' if monthly_usd_match else '❌'}")
        
        # Summary
        print(f"\n" + "=" * 50)
        print("📋 SUMMARY")
        
        all_checks_pass = tl_match and usd_match and monthly_tl_match and monthly_usd_match
        print(f"All Checks Pass: {'✅' if all_checks_pass else '❌'}")
        
        print(f"\n🎯 KEY FINDING:")
        print(f"Total Banka Havalesi in TL currency: {general_tl:,.2f} TL")
        print(f"This converts to: {general_total_usd:,.2f} USD")
        
        return all_checks_pass
        
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server. Make sure backend is running on localhost:8080")
        return False
    except Exception as e:
        print(f"❌ Error during test: {e}")
        return False

if __name__ == "__main__":
    test_banka_havalesi_tl_totals()