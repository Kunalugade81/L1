'use strict';
const { Contract } = require('fabric-contract-api');
class NyayChainContract extends Contract {
  async RecordEvent(ctx,eventId,payload){if(!eventId||!payload)throw new Error('eventId and payload are required');const exists=await ctx.stub.getState(eventId);if(exists&&exists.length)throw new Error(`Event ${eventId} already exists`);const parsed=JSON.parse(payload);const record={...parsed,eventId,fabricTxId:ctx.stub.getTxID(),createdAt:new Date().toISOString()};await ctx.stub.putState(eventId,Buffer.from(JSON.stringify(record)));return Buffer.from(JSON.stringify(record));}
  async GetEvent(ctx,eventId){const data=await ctx.stub.getState(eventId);if(!data||!data.length)throw new Error(`Event ${eventId} does not exist`);return data;}
  async GetEventsByCase(ctx,caseId){const iterator=await ctx.stub.getStateByRange('','');const out=[];for await(const item of iterator){try{const v=JSON.parse(item.value.toString());if(v.caseId===caseId)out.push(v);}catch(e){}}return Buffer.from(JSON.stringify(out));}
  async GetAllEvents(ctx){const iterator=await ctx.stub.getStateByRange('','');const out=[];for await(const item of iterator){try{out.push(JSON.parse(item.value.toString()));}catch(e){}}return Buffer.from(JSON.stringify(out));}
}
module.exports.NyayChainContract=NyayChainContract;
