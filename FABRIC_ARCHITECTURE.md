# NyayChain Hyperledger Fabric Architecture

```text
Browser (HTML/CSS/JavaScript)
          |
          v
Python FastAPI application
     |              |
     |              +---- SQLite (users, cases, documents, audit)
     |
     +---- SHA-256 evidence hash
     |
     +---- Node.js Fabric Gateway service
                    |
                    v
          Hyperledger Fabric Gateway
                    |
          +---------+---------+
          |                   |
       Org1 Peer           Org2 Peer
       Police/Court        Court/Forensic
          |                   |
          +---------+---------+
                    |
              nyaychannel
                    |
          NyayChain chaincode
                    |
        Immutable audit events
```

## Why the split is used

The original project is Python/FastAPI. The Fabric client is separated into a small Node.js service because Hyperledger Fabric's Node Gateway client is a supported application API. This avoids replacing the existing FastAPI backend.

## Blockchain data

Store hashes and audit metadata on Fabric. Keep original documents outside the ledger. This keeps large files out of the blockchain while allowing later integrity verification.
