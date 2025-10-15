#!/usr/bin/env python3

import requests
import json

def test_yearly_report_api():
    """Test the yearly report API and validate values."""
    url = "http://localhost:8080/api/reports/yearly/2025"
    
    print("Testing Yearly Report API...")
    print("=" * 50)
    
    try:
        response = requests.get(url)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ API Response received successfully")
            print()
            
            # Expected values based on user's request
            expected_mkm = 16_275_245.52
            expected_msm = 6_643_401.72
            expected_total = 22_918_647.24
            
            # Get actual values
            actual_mkm = data.get('project_summary', {}).get('mkm', 0)
            actual_msm = data.get('project_summary', {}).get('msm', 0)
            actual_total = actual_mkm + actual_msm
            
            print("PROJECT SUMMARY VALIDATION:")
            print("-" * 30)
            print(f"MKM Expected: ${expected_mkm:,.2f}")
            print(f"MKM Actual:   ${actual_mkm:,.2f}")
            print(f"Difference:   ${abs(actual_mkm - expected_mkm):,.2f}")
            print(f"Match: {'✅' if abs(actual_mkm - expected_mkm) < 1.0 else '❌'}")
            print()
            
            print(f"MSM Expected: ${expected_msm:,.2f}")
            print(f"MSM Actual:   ${actual_msm:,.2f}")
            print(f"Difference:   ${abs(actual_msm - expected_msm):,.2f}")
            print(f"Match: {'✅' if abs(actual_msm - expected_msm) < 1.0 else '❌'}")
            print()
            
            print(f"Total Expected: ${expected_total:,.2f}")
            print(f"Total Actual:   ${actual_total:,.2f}")
            print(f"Difference:     ${abs(actual_total - expected_total):,.2f}")
            print(f"Match: {'✅' if abs(actual_total - expected_total) < 1.0 else '❌'}")
            print()
            
            # Check ÇEK fields (should be 0.00, not showing as dashes)
            print("ÇEK VALIDATION:")
            print("-" * 15)
            cek_location = data.get('location_summary', {}).get('ÇEK', {})
            cek_payment = data.get('payment_methods', {}).get('Çek', {})
            
            print(f"ÇEK Location MKM: ${cek_location.get('mkm', 0):,.2f}")
            print(f"ÇEK Location MSM: ${cek_location.get('msm', 0):,.2f}")
            print(f"ÇEK Location Total: ${cek_location.get('total', 0):,.2f}")
            print(f"ÇEK Payment Total USD: ${cek_payment.get('total_usd', 0):,.2f}")
            print(f"All ÇEK values are 0.00: {'✅' if all(v == 0 for v in [cek_location.get('mkm', 0), cek_location.get('msm', 0), cek_location.get('total', 0), cek_payment.get('total_usd', 0)]) else '❌'}")
            print()
            
            # Display full data structure for review
            print("FULL API RESPONSE:")
            print("-" * 20)
            print(json.dumps(data, indent=2))
            
        else:
            print(f"❌ API Error: {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Could not connect to backend server")
        print("Make sure the server is running on http://localhost:8080")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    test_yearly_report_api()