import pandas as pd
import json
import requests
import sys

def analyze_excel_file(file_path):
    """Analyze the Excel file to understand its structure and content"""
    print("=== EXCEL FILE ANALYSIS ===")
    print(f"File: {file_path}")
    
    try:
        # Try different engines for different Excel formats
        df = None
        
        # First try with openpyxl (for .xlsx)
        try:
            df = pd.read_excel(file_path, engine='openpyxl')
            print("Successfully read with openpyxl engine")
        except:
            pass
        
        # If that fails, try with xlrd (for .xls)
        if df is None:
            try:
                df = pd.read_excel(file_path, engine='xlrd')
                print("Successfully read with xlrd engine")
            except:
                pass
        
        # If still fails, try without specifying engine
        if df is None:
            df = pd.read_excel(file_path)
            print("Successfully read with default engine")
        
        print(f"Total rows: {len(df)}")
        print(f"Total columns: {len(df.columns)}")
        print("\nColumns found:")
        for i, col in enumerate(df.columns):
            print(f"  {i+1}. '{col}'")
        
        print("\nFirst 5 rows:")
        print(df.head().to_string())
        
        print("\nData types:")
        print(df.dtypes)
        
        print("\nNull values per column:")
        print(df.isnull().sum())
        
        # Check for specific required columns
        required_columns = [
            'Müşteri Adı Soyadı',
            'Tarih',
            'Tahsilat Şekli', 
            'Hesap Adı',
            'Ödenen Döviz',
            'Proje Adı'
        ]
        
        # Find amount column (could have different names)
        amount_cols = [col for col in df.columns if 'ödenen tutar' in col.lower() or 'tutar' in col.lower()]
        print(f"\nAmount columns found: {amount_cols}")
        
        missing_cols = []
        for req_col in required_columns:
            if req_col not in df.columns:
                # Check for similar columns
                similar = [col for col in df.columns if req_col.lower().replace(' ', '') in col.lower().replace(' ', '')]
                if similar:
                    print(f"Missing '{req_col}' but found similar: {similar}")
                else:
                    missing_cols.append(req_col)
        
        if missing_cols:
            print(f"\nMissing required columns: {missing_cols}")
        else:
            print("\nAll required columns found!")
        
        return df
        
    except Exception as e:
        print(f"Error reading Excel file: {e}")
        return None

def test_backend_connection():
    """Test if backend is accessible"""
    print("\n=== BACKEND CONNECTION TEST ===")
    try:
        response = requests.get("http://localhost:8080/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend is running and accessible")
            return True
        else:
            print(f"❌ Backend returned status code: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to backend: {e}")
        return False

def convert_to_raw_payment_format(df):
    """Convert DataFrame to the format expected by the backend"""
    print("\n=== CONVERTING TO BACKEND FORMAT ===")
    
    raw_payments = []
    
    # Find the amount column
    amount_col = None
    for col in df.columns:
        if 'ödenen tutar' in col.lower() or 'tutar' in col.lower():
            amount_col = col
            break
    
    if not amount_col:
        print("❌ Could not find amount column")
        return []
    
    print(f"Using amount column: '{amount_col}'")
    
    for index, row in df.iterrows():
        try:
            # Convert to the format expected by backend
            raw_payment = {
                "musteri_adi_soyadi": str(row.get('Müşteri Adı Soyadı', '')).strip(),
                "tarih": str(row.get('Tarih', '')).strip(),
                "tahsilat_sekli": str(row.get('Tahsilat Şekli', '')).strip(),
                "hesap_adi": str(row.get('Hesap Adı', '')).strip(),
                "odenen_tutar": float(row.get(amount_col, 0)),
                "odenen_doviz": str(row.get('Ödenen Döviz', '')).strip(),
                "proje_adi": str(row.get('Proje Adı', '')).strip()
            }
            
            # Basic validation
            if (raw_payment["musteri_adi_soyadi"] and 
                raw_payment["tarih"] and 
                raw_payment["odenen_tutar"] > 0):
                raw_payments.append(raw_payment)
            else:
                print(f"⚠️  Row {index+1} failed validation: {raw_payment}")
        
        except Exception as e:
            print(f"❌ Error processing row {index+1}: {e}")
    
    print(f"Successfully converted {len(raw_payments)} records")
    return raw_payments

def test_backend_analyze(raw_payments):
    """Send data to backend analyze endpoint"""
    print("\n=== TESTING BACKEND ANALYZE ===")
    
    try:
        payload = {"raw_payments": raw_payments}
        response = requests.post(
            "http://localhost:8080/api/analyze", 
            json=payload, 
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Backend analyze successful")
            print(f"Total raw payments sent: {result.get('total_raw_payments', 0)}")
            print(f"Missing fields: {result.get('missing_fields', [])}")
            print(f"Unique currencies: {result.get('field_analysis', {}).get('unique_currencies', [])}")
            return True
        else:
            print(f"❌ Backend analyze failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error calling backend analyze: {e}")
        return False

def test_backend_upload(raw_payments):
    """Send data to backend upload endpoint"""
    print("\n=== TESTING BACKEND UPLOAD ===")
    
    try:
        payload = {"raw_payments": raw_payments}
        response = requests.post(
            "http://localhost:8080/api/upload", 
            json=payload, 
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Backend upload completed")
            print(f"Success: {result.get('success', False)}")
            print(f"Message: {result.get('message', '')}")
            print(f"Processed: {result.get('processed', 0)}")
            
            errors = result.get('errors', [])
            if errors:
                print(f"Errors encountered ({len(errors)}):")
                for i, error in enumerate(errors[:10]):  # Show first 10 errors
                    print(f"  {i+1}. {error}")
                if len(errors) > 10:
                    print(f"  ... and {len(errors) - 10} more errors")
            
            return result.get('success', False)
        else:
            print(f"❌ Backend upload failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error calling backend upload: {e}")
        return False

def main():
    file_path = r"C:\Users\Net Mimar\Downloads\alooo.xls"
    
    print("🔍 DEBUGGING EXCEL IMPORT")
    print("=" * 50)
    
    # Step 1: Analyze the Excel file
    df = analyze_excel_file(file_path)
    if df is None:
        print("Cannot proceed - Excel file analysis failed")
        return
    
    # Step 2: Test backend connection
    if not test_backend_connection():
        print("Cannot proceed - Backend not accessible")
        return
    
    # Step 3: Convert to backend format
    raw_payments = convert_to_raw_payment_format(df)
    if not raw_payments:
        print("Cannot proceed - No valid payments to process")
        return
    
    print(f"\n📊 SUMMARY: {len(raw_payments)} payments ready for processing")
    
    # Step 4: Test backend analyze (optional debug endpoint)
    test_backend_analyze(raw_payments[:5])  # Test with first 5 records
    
    # Step 5: Test actual upload
    upload_success = test_backend_upload(raw_payments)
    
    if upload_success:
        print("\n✅ DEBUG COMPLETE - Upload successful!")
    else:
        print("\n❌ DEBUG COMPLETE - Upload failed!")

if __name__ == "__main__":
    main()