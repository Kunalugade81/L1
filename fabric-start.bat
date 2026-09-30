@echo off
REM Run this file from the fabric-samples\test-network folder.
REM Edit NYAYCHAIN_ROOT to your project directory.
set NYAYCHAIN_ROOT=C:\path\to\NyayChain
call network.sh up createChannel -c nyaychannel -ca
call network.sh deployCC -ccn nyaychain -ccp "%NYAYCHAIN_ROOT%\chaincode\nyaychain" -ccl javascript
