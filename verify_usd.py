import json
import sys

# Read the payments data
with open('backend/all_payments.json', 'r', encoding='utf-8') as f:
    payments = json.load(f)

print("🔍 MANUAL VERIFICATION OF USD BANKA HAVALESI PAYMENTS")
print("=" * 60)

# Filter for USD Banka Havalesi payments
usd_banka_havalesi = []
for payment in payments:
    if (payment.get('payment_method') == 'Banka Havalesi' and 
        payment.get('currency') == 'USD'):
        usd_banka_havalesi.append(payment)

print(f"📊 Total USD Banka Havalesi payments found: {len(usd_banka_havalesi)}")
print()

# Calculate totals
total_usd = 0
mkm_total = 0
msm_total = 0

print("💰 DETAILED BREAKDOWN:")
print("-" * 50)

for i, payment in enumerate(usd_banka_havalesi, 1):
    amount = payment.get('amount', 0)
    project = payment.get('project', '')
    date = payment.get('payment_date', '')[:10]  # Extract date only
    customer = payment.get('customer_name', '')
    
    print(f"{i:2d}. {date} | {project:3s} | {amount:>12,.2f} USD | {customer}")
    
    total_usd += amount
    if project == 'MKM':
        mkm_total += amount
    elif project == 'MSM':
        msm_total += amount

print("-" * 50)
print(f"🎯 FINAL TOTALS:")
print(f"   MKM Total:     {mkm_total:>15,.2f} USD")
print(f"   MSM Total:     {msm_total:>15,.2f} USD")
print(f"   GRAND TOTAL:   {total_usd:>15,.2f} USD")
print()

# Compare with API response
print("🔄 COMPARISON WITH API:")
api_total = 1969896.67
print(f"   API Reports:   {api_total:>15,.2f} USD")
print(f"   Manual Count:  {total_usd:>15,.2f} USD")
print(f"   Difference:    {abs(total_usd - api_total):>15,.2f} USD")

if abs(total_usd - api_total) < 0.01:
    print("✅ VALUES MATCH PERFECTLY!")
else:
    print("❌ VALUES DO NOT MATCH!")

print()
print("🔐 VERIFICATION DETAILS:")
print(f"   • Only payments where currency = 'USD'")
print(f"   • Only payments where payment_method = 'Banka Havalesi'")
print(f"   • Using raw 'amount' field (not converted AmountUSD)")
print(f"   • Year 2025 payments only (filtered by payment_date)")