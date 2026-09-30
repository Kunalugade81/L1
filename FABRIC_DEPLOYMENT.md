# NyayChain + Hyperledger Fabric Deployment Guide

## 1. What changed

The original NyayChain application used a SQLite-backed SHA-256 chained ledger. This version keeps that local ledger as a fallback and adds an **optional real Hyperledger Fabric integration**.

When `FABRIC_ENABLED=true`, important events are sent from FastAPI to the Node.js Fabric Gateway service. The gateway submits them to the `nyaychain` Fabric chaincode.

## 2. Recommended stack

- Frontend: HTML5, CSS3, JavaScript
- Main backend: Python + FastAPI
- Application database: SQLite
- Fabric client service: Node.js + Hyperledger Fabric Gateway
- Blockchain network: Hyperledger Fabric permissioned network
- Smart contract: JavaScript chaincode
- Evidence integrity: SHA-256

## 3. Install prerequisites

Install Docker Desktop, Git, Node.js 18+, npm, and Python 3.10+.

Install the Hyperledger Fabric samples, binaries and Docker images using the official Fabric documentation. The simplest development target is the Fabric `test-network`.

## 4. Start Fabric test network

From the Fabric samples `test-network` directory:

```bash
./network.sh down
./network.sh up createChannel -c nyaychannel -ca
```

Then deploy NyayChain chaincode:

```bash
./network.sh deployCC -ccn nyaychain -ccp /ABSOLUTE/PATH/TO/NyayChain/chaincode/nyaychain -ccl javascript
```

Windows: use Git Bash or WSL for the Fabric shell scripts.

## 5. Configure the Gateway service

Copy `fabric-service/.env.example` to `fabric-service/.env` and replace the certificate/key/TLS paths with the paths from your `fabric-samples/test-network/organizations` directory.

Then:

```bash
cd fabric-service
npm install
npm start
```

The service listens on port 8081 by default.

## 6. Enable Fabric in FastAPI

Set:

```text
FABRIC_ENABLED=true
FABRIC_SERVICE_URL=http://127.0.0.1:8081
```

Then start NyayChain normally:

```bash
python -m uvicorn main:app --reload
```

## 7. Verify

After logging in, call:

```text
GET /api/fabric/status
```

A successful connection returns `enabled: true` and `connected: true`.

Upload a document. FastAPI calculates its SHA-256 hash, stores the file locally, and sends a `DOCUMENT_UPLOADED` event containing the hash to Fabric.

## 8. Data placement

Do not store large PDF/image files directly on the blockchain. Keep the original evidence in controlled file storage and record its SHA-256 hash, case ID, document ID, actor, timestamp and transaction information on Fabric.

## 9. Production note

The included test-network configuration is for development/college demonstration. A production deployment requires real organizations, MSP identities, TLS, certificate management, endorsement policies, private data collections where appropriate, secure external storage, backups, monitoring and key management.
