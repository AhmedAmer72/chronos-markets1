# 🧪 How to Test if Contract Works with Frontend

## Quick Answer: 3 Simple Steps

### Step 1: Start Linera Service (GraphQL API)

```bash
# Get the devnet configuration
TMP_DIR=$(ls -td /tmp/.tmp*/wallet_0.json 2>/dev/null | head -1 | xargs dirname)

# Set environment variables
export LINERA_WALLET="$TMP_DIR/wallet_0.json"
export LINERA_KEYSTORE="$TMP_DIR/keystore_0.json"
export LINERA_STORAGE="rocksdb:$TMP_DIR/client_0.db"

# Start service
linera service --port 8080
```

**You should see:**
```
GraphiQL IDE: http://localhost:8080
```

Leave this terminal running!

---

### Step 2: Start Frontend

In a NEW terminal:

```bash
cd /mnt/e/AKINDO/chronos-markets1
npm run dev
```

**You should see:**
```
Local: http://localhost:3007
```

---

### Step 3: Test Integration

1. **Open browser**: `http://localhost:3007`

2. **Look bottom-right corner** - You'll see an "Integration Test" panel:
   - 🟢 Green dot = Connected to blockchain ✅
   - 🔴 Red = Not connected ❌

3. **Click the test buttons:**
   - "Test: Create Market" - Creates a real on-chain market
   - "Test: Buy Shares" - Buys shares with AMM pricing
   - "Test: Query Volume" - Queries total trading volume

4. **Results appear below the buttons** - Shows success/failure

---

## What Success Looks Like

### ✅ Connected State
```
✅ Connected to Linera devnet
App ID: 83aabd7b2c03...
```

### ✅ Create Market Works
```
✅ SUCCESS! Market created with ID: 0
```

### ✅ Buy Shares Works
```
✅ SUCCESS! Purchased 95 shares
```

(Note: Share amount varies based on AMM pricing)

---

## Troubleshooting

### Problem: Red "Not connected" in test panel

**Cause**: Linera service isn't running

**Fix**: Go back to Step 1, start linera service

---

### Problem: "Cannot reach GraphQL endpoint"

**Check these:**

```bash
# 1. Is service running?
curl http://localhost:8080/graphql

# 2. Is devnet running?
ps aux | grep "linera net up"

# 3. Check port 8080
lsof -i :8080
```

**Fix**: Restart service with correct environment variables

---

### Problem: "Application not found" or GraphQL errors

**Cause**: Application ID mismatch or devnet restarted

**Fix**: Redeploy application

```bash
./deploy-devnet-final.sh
```

Then refresh browser.

---

## Manual Testing (Without Frontend)

### Test 1: Check Service is Running

```bash
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'
```

**Expected**: `{"data":{"__typename":"Query"}}`

---

### Test 2: Query Chains

```bash
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ chains { list { default } } }"}'
```

**Expected**: JSON with chain IDs

---

### Test 3: Create Market via CLI

```bash
cd /mnt/e/AKINDO/chronos-markets1
./test-contract-operations.sh
```

This will:
1. Create a test market
2. Buy shares
3. Show results

---

## Visual Confirmation

### When Everything Works:

1. **Console logs** (F12 in browser):
   ```
   🔗 Connecting to Linera devnet: http://localhost:8080
   📦 Application ID: 83aabd7b2c03657a540594a376dd972c3b1760b4348904a86d908b8102518b69
   ✅ Connected to Linera wallet
   ```

2. **Test panel bottom-right**:
   - Green pulsing dot
   - "Connected to Linera devnet"
   - Test buttons clickable

3. **When you click "Test: Create Market"**:
   - "Creating market..." message
   - Wait 2-5 seconds
   - "✅ SUCCESS! Market created with ID: X"

---

## Testing Your Own UI Components

### In CreateMarketPage.tsx:

```typescript
import chronosContract from '../services/chronosContract';

const handleSubmit = async (formData) => {
  // Your form data
  const result = await chronosContract.createMarket({
    question: formData.question,
    description: formData.description,
    endTime: new Date(formData.endDate).getTime() / 1000,
    initialLiquidity: formData.liquidity.toString()
  });
  
  if (result.success) {
    console.log('Market ID:', result.marketId);
    // Navigate to market page, show success, etc.
  } else {
    console.error('Error:', result.error);
    // Show error message
  }
};
```

### In MarketPage.tsx:

```typescript
const handleBuyShares = async (outcome: 'Yes' | 'No', amount: string) => {
  const result = await chronosContract.buyShares({
    marketId: currentMarket.id,
    outcome,
    amount
  });
  
  if (result.success) {
    console.log('Shares purchased:', result.shares);
    // Update UI, refresh balances
  } else {
    console.error('Error:', result.error);
  }
};
```

---

## Expected Behavior

### AMM Pricing (Constant Product Formula)

When you buy shares:
- Price increases for that outcome
- You get fewer shares as price rises
- Formula: `k = yes_pool * no_pool` (constant)

Example:
- Initial: 500 YES, 500 NO tokens (50¢ each)
- Buy 100 tokens → Get ~95 YES shares
- New price: ~52¢ for YES
- Next buy gets fewer shares (price moved up!)

This is working correctly! ✅

---

## Common Questions

### Q: How do I know transactions are on-chain?

**A**: Check the linera service terminal. You'll see logs like:
```
INFO linera_client: Processing operation: CreateMarket
INFO linera_chain: Block created with certificate
```

### Q: Can I see the blockchain data?

**A**: Yes! Two ways:

1. **GraphiQL IDE**: `http://localhost:8080`
   - Interactive GraphQL playground
   - Run queries manually

2. **CLI**: 
   ```bash
   linera wallet show
   linera query-application <app-id>
   ```

### Q: How do I reset and start over?

```bash
# Stop everything
pkill -f linera

# Redeploy
./deploy-devnet-final.sh

# Restart service (use new env vars from deploy output)
linera service --port 8080

# Restart frontend
npm run dev
```

---

## Success Checklist

- [ ] Devnet running (`linera net up`)
- [ ] Application deployed (Application ID exists)
- [ ] Service running on port 8080
- [ ] Frontend running on port 3007
- [ ] Test panel shows green "Connected"
- [ ] Can create market
- [ ] Can buy shares
- [ ] AMM pricing works (share amount varies)
- [ ] See success messages

**If all checked = Your integration is working!** 🎉

---

## Next Steps After Successful Test

1. **Remove test panel** - Comment out `<IntegrationTest />` in HomePage.tsx
2. **Add loading states** - Show spinners during transactions
3. **Add error handling** - Display user-friendly error messages  
4. **Update UI with real data** - Replace mock data with contract queries
5. **Test resolution flow** - Create → Trade → Resolve → Claim
6. **Deploy to testnet** - Run `./deploy-prediction-market.sh`

---

**TL;DR: Start service → Start frontend → Look for green dot bottom-right → Click test buttons → See success!**
