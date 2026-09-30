# NyayChain Hyperledger Fabric Gateway Service

This Node.js service connects the existing FastAPI application to Hyperledger Fabric using Fabric Gateway. The main web application remains Python/FastAPI.

## Install

```bash
cd fabric-service
npm install
```

Copy `.env.example` to `.env` and set the certificate, private-key and TLS certificate paths for your Fabric identity.

## Run

```bash
npm start
```

The FastAPI application uses `FABRIC_SERVICE_URL` (default `http://127.0.0.1:8081`) when `FABRIC_ENABLED=true`.

Endpoints: `GET /health`, `POST /record`, `GET /event/:id`, `GET /events/:caseId`, `GET /events`.
