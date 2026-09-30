import express from 'express';
import fs from 'fs';
import crypto from 'crypto';
import grpc from '@grpc/grpc-js';
import { connect, signers } from '@hyperledger/fabric-gateway';
const app=express(); app.use(express.json({limit:'2mb'})); const PORT=process.env.PORT||8081; let gateway,network,contract;
function sha256(s){return crypto.createHash('sha256').update(s).digest('hex');}
function load(){const cert=fs.readFileSync(process.env.FABRIC_CERT);const keyPem=fs.readFileSync(process.env.FABRIC_KEY); const privateKey=crypto.createPrivateKey(keyPem);const tls=fs.readFileSync(process.env.FABRIC_TLS_CERT);const client=new grpc.Client(process.env.FABRIC_PEER_ENDPOINT,grpc.credentials.createSsl(tls),{'grpc.ssl_target_name_override':process.env.FABRIC_PEER_HOST_ALIAS,'grpc.default_authority':process.env.FABRIC_PEER_HOST_ALIAS});gateway=connect({client,identity:{mspId:process.env.FABRIC_MSP_ID,credentials:cert},signer:signers.newPrivateKeySigner(privateKey),evaluateOptions:()=>({deadline:Date.now()+5000}),endorseOptions:()=>({deadline:Date.now()+15000}),submitOptions:()=>({deadline:Date.now()+15000}),commitStatusOptions:()=>({deadline:Date.now()+60000})});network=gateway.getNetwork(process.env.FABRIC_CHANNEL||'nyaychannel');contract=network.getContract(process.env.FABRIC_CHAINCODE||'nyaychain');}
app.get('/health',(req,res)=>res.json({ok:true,fabric:!!contract}));
app.post('/record',async(req,res)=>{try{if(!contract)load();const {eventId,caseId='',docId='',eventType,actor='',data={}}=req.body;if(!eventId||!eventType)return res.status(400).json({error:'eventId and eventType required'});const payload=JSON.stringify({eventId,caseId,docId,eventType,actor,data,recordHash:sha256(JSON.stringify(req.body)),timestamp:new Date().toISOString()});const result=await contract.submitTransaction('RecordEvent',eventId,payload);res.json({ok:true,transactionId:eventId,record:JSON.parse(Buffer.from(result).toString())});}catch(e){res.status(503).json({ok:false,error:e.message});}});
app.get('/event/:id',async(req,res)=>{try{if(!contract)load();const r=await contract.evaluateTransaction('GetEvent',req.params.id);res.json(JSON.parse(Buffer.from(r).toString()));}catch(e){res.status(404).json({error:e.message});}});
app.get('/events/:caseId',async(req,res)=>{try{if(!contract)load();const r=await contract.evaluateTransaction('GetEventsByCase',req.params.caseId);res.json(JSON.parse(Buffer.from(r).toString()));}catch(e){res.status(503).json({error:e.message});}});
app.get('/events',async(req,res)=>{try{if(!contract)load();const r=await contract.evaluateTransaction('GetAllEvents');res.json(JSON.parse(Buffer.from(r).toString()));}catch(e){res.status(503).json({error:e.message});}});
app.listen(PORT,()=>console.log(`NyayChain Fabric service listening on http://127.0.0.1:${PORT}`));
