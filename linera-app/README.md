# Chronos Markets - Linera Application Setup

This directory will contain the Linera smart contracts for the Chronos Markets prediction market platform.

## Structure

```
linera-app/
├── Cargo.toml              # Workspace configuration
├── contract/               # Smart contract (blockchain logic)
│   ├── Cargo.toml
│   └── src/
│       └── lib.rs
├── service/                # Service (query/GraphQL interface)
│   ├── Cargo.toml
│   └── src/
│       └── lib.rs
└── README.md              # This file
```

## Applications to Build

### 1. Market Application
- Create prediction markets
- Place buy/sell orders
- Resolve markets based on oracle data
- Manage liquidity pools

### 2. Token Application  
- Transfer tokens between chains
- Manage balances
- Handle market settlements

### 3. Oracle Application
- Fetch external data
- Resolve market outcomes
- Provide data feeds

## Quick Start

```bash
# Initialize the Linera application workspace
cd linera-app
cargo init --lib contract
cargo init --lib service

# Build the applications
cargo build --release --target wasm32-unknown-unknown

# Deploy to testnet
linera publish-and-create \
  target/wasm32-unknown-unknown/release/chronos_market_{contract,service}.wasm \
  --json-argument '{}'
```

## Development Workflow

1. **Design the contract** - Define state, operations, and messages
2. **Implement contract logic** - Handle cross-chain interactions
3. **Create service API** - Expose GraphQL queries for frontend
4. **Test locally** - Use `linera net up` for local testing
5. **Deploy to testnet** - Use `linera publish-and-create`
6. **Integrate with frontend** - Query via GraphQL from React app

## Resources

- [Linera SDK Documentation](https://linera.dev/developers/)
- [Example Applications](https://github.com/linera-io/linera-protocol/tree/main/examples)
- [Developer Workshops](https://www.youtube.com/watch?v=0pym5NkVLWs&list=PLdGxlJxLrfgIk7KsD88FnhILcnnzjyoYK)

## Next Steps

1. Review example applications (counter, fungible, amm)
2. Design your market contract state structure
3. Implement core market operations
4. Test with local network
5. Deploy and integrate with frontend
