# NyayChain Fabric Chaincode

Records immutable case/document audit events. Original files remain outside Fabric; the blockchain stores metadata and cryptographic hashes.

## Deploy

From `fabric-samples/test-network` after starting the network and creating `nyaychannel`:

```bash
./network.sh deployCC -ccn nyaychain -ccp /ABSOLUTE/PATH/TO/NyayChain/chaincode/nyaychain -ccl javascript
```

The exact path depends on your machine.
