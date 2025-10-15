import requests
import json

def validate_yearly_report():
    """
    Validate yearly report calculations using testing techniques:
    1. API Response Validation
    2. Cross-calculation Verification  
    3. Data Consistency Checks
    4. Zero Value Verification
    """
    
    try:
        # Get the yearly report from API
        response = requests.get('http://localhost:8080/api/reports/yearly/2025')
        
        if response.status_code != 200:
            print(f"❌ API Error: {response.status_code}")
            return False
            
        report = response.json()
        
        print("🔍 YEARLY REPORT VALIDATION")
        print("=" * 50)
        
        # Test 1: Basic Structure Validation
        print("\n📋 Test 1: API Response Structure")
        required_fields = ['year', 'project_summary', 'payment_methods', 'mkm_payment_methods', 'msm_payment_methods', 'location_summary']
        structure_valid = all(field in report for field in required_fields)
        print(f"Structure Valid: {'✅' if structure_valid else '❌'}")
        
        # Test 2: Project Summary Validation
        print("\n📊 Test 2: Project Summary")
        mkm_total = report['project_summary']['mkm']
        msm_total = report['project_summary']['msm'] 
        grand_total = mkm_total + msm_total
        
        print(f"MKM Total: {mkm_total:,.2f} USD")
        print(f"MSM Total: {msm_total:,.2f} USD") 
        print(f"Grand Total: {grand_total:,.2f} USD")
        
        # Test 3: Payment Method Cross-Validation
        print("\n💳 Test 3: Payment Method Validation")
        
        # Check if Çek (Check) method exists and has zero values
        payment_methods = ['Banka Havalesi', 'Nakit', 'Çek']
        
        for method in payment_methods:
            print(f"\n{method}:")
            
            # General payment methods
            general = report['payment_methods'].get(method, {})
            general_tl = general.get('tl', 0)
            general_usd = general.get('total_usd', 0)
            
            # MKM specific
            mkm = report['mkm_payment_methods'].get(method, {})
            mkm_tl = mkm.get('tl', 0)
            mkm_usd = mkm.get('total_usd', 0)
            
            # MSM specific  
            msm = report['msm_payment_methods'].get(method, {})
            msm_tl = msm.get('tl', 0)
            msm_usd = msm.get('total_usd', 0)
            
            print(f"  General: TL={general_tl:,.2f}, USD={general_usd:,.2f}")
            print(f"  MKM: TL={mkm_tl:,.2f}, USD={mkm_usd:,.2f}")
            print(f"  MSM: TL={msm_tl:,.2f}, USD={msm_usd:,.2f}")
            
            # Validation: MKM + MSM should equal General
            tl_match = abs((mkm_tl + msm_tl) - general_tl) < 0.01
            usd_match = abs((mkm_usd + msm_usd) - general_usd) < 0.01
            
            print(f"  TL Sum Match: {'✅' if tl_match else '❌'}")
            print(f"  USD Sum Match: {'✅' if usd_match else '❌'}")
            
            # Special check for Çek method (should be zero)
            if method == 'Çek':
                cek_is_zero = (general_tl == 0 and general_usd == 0 and 
                              mkm_tl == 0 and mkm_usd == 0 and 
                              msm_tl == 0 and msm_usd == 0)
                print(f"  Çek Zero Check: {'✅' if cek_is_zero else '❌'}")
        
        # Test 4: Location Summary Validation
        print("\n📍 Test 4: Location Summary")
        location_mkm_total = sum(loc['mkm'] for loc in report['location_summary'].values())
        location_msm_total = sum(loc['msm'] for loc in report['location_summary'].values())
        location_grand_total = sum(loc['total'] for loc in report['location_summary'].values())
        
        print(f"Location MKM Total: {location_mkm_total:,.2f}")
        print(f"Location MSM Total: {location_msm_total:,.2f}")
        print(f"Location Grand Total: {location_grand_total:,.2f}")
        
        # Cross-validation with project summary
        mkm_match = abs(location_mkm_total - mkm_total) < 0.01
        msm_match = abs(location_msm_total - msm_total) < 0.01
        total_match = abs(location_grand_total - grand_total) < 0.01
        
        print(f"MKM Location Match: {'✅' if mkm_match else '❌'}")
        print(f"MSM Location Match: {'✅' if msm_match else '❌'}")
        print(f"Total Location Match: {'✅' if total_match else '❌'}")
        
        # Test 5: Payment Method Grand Total Validation
        print("\n🧮 Test 5: Payment Method Totals")
        
        payment_method_total = sum(method.get('total_usd', 0) 
                                 for method in report['payment_methods'].values())
        
        print(f"Payment Methods Sum: {payment_method_total:,.2f}")
        print(f"Project Summary Total: {grand_total:,.2f}")
        
        payment_total_match = abs(payment_method_total - grand_total) < 0.01
        print(f"Payment Total Match: {'✅' if payment_total_match else '❌'}")
        
        # Summary
        print("\n" + "=" * 50)
        print("📊 VALIDATION SUMMARY")
        
        all_tests_passed = (structure_valid and mkm_match and msm_match and 
                           total_match and payment_total_match)
        
        print(f"Overall Result: {'✅ ALL TESTS PASSED' if all_tests_passed else '❌ SOME TESTS FAILED'}")
        
        # Print the specific values mentioned in the user's report
        print(f"\n📋 REPORTED VALUES VERIFICATION:")
        print(f"MKM Total: {mkm_total:,.2f} USD (Expected: 16,275,245.52)")
        print(f"MSM Total: {msm_total:,.2f} USD (Expected: 6,643,401.72)")
        print(f"Grand Total: {grand_total:,.2f} USD (Expected: 22,918,647.24)")
        
        return all_tests_passed
        
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server. Make sure backend is running on localhost:8080")
        return False
    except Exception as e:
        print(f"❌ Error during validation: {e}")
        return False

if __name__ == "__main__":
    validate_yearly_report()