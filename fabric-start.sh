#!/usr/bin/env bash
# Run this from the Hyperledger Fabric samples test-network directory.
# Set NYAYCHAIN_ROOT to the absolute path of this project first.
set -e
: "${NYAYCHAIN_ROOT:?Set NYAYCHAIN_ROOT to the NyayChain project path}"
./network.sh up createChannel -c nyaychannel -ca
./network.sh deployCC -ccn nyaychain -ccp "$NYAYCHAIN_ROOT/chaincode/nyaychain" -ccl javascript
