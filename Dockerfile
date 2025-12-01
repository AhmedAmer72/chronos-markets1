FROM rust:1.86-slim

SHELL ["bash", "-c"]

# Install system dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    protobuf-compiler \
    clang \
    make \
    curl \
    git

# Install Linera tools
RUN cargo install --locked linera-service@0.15.5 linera-storage-service@0.15.5

# Install Node.js via nvm
RUN curl https://raw.githubusercontent.com/creationix/nvm/v0.40.3/install.sh | bash \
    && . ~/.nvm/nvm.sh \
    && nvm install lts/krypton \
    && npm install -g pnpm

# Install wasm32 target for Rust
RUN rustup target add wasm32-unknown-unknown

WORKDIR /build

# Healthcheck - wait for frontend to be ready
HEALTHCHECK --interval=5s --timeout=3s --start-period=60s --retries=20 \
    CMD curl -s http://localhost:5173 || exit 1

ENTRYPOINT ["bash", "/build/run.bash"]
