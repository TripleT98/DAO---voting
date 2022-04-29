import Web3 from "web3";
let hre = require("hardhat");
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

let web3 = new Web3(hre.network.provider);

export type TProrosal = {
  recepient: string;
  description: string;
  rejectVotes: string;
  resolveVotes: string;
  duration: string;
  signature: string;
}

export function getProposal(proposal:any): any {
  let {recepient, description, rejectVotes, resolveVotes, duration, signature} = proposal;
  return {
    signature, recepient, description, rejectVotes: String(rejectVotes), resolveVotes: String(resolveVotes), duration: String(duration)
  }
}


export let signatures = {
  setPhrase:function(params:string[]):string {
    return web3.eth.abi.encodeFunctionCall({
      name: "changePhrase",
      type: "function",
      inputs:[
        {
          type: "string",
          name: "_phrase"
        },
        ]
    },[...params]);
  },
  changeNumber:function(params:string[]):string {
    return web3.eth.abi.encodeFunctionCall({
      name: "changeNum",
      type: "function",
      inputs:[
        {
          type: "int256",
          name: "_num"
        },
        {
          type: "uint256",
          name: "_status"
        }
        ]
    },[...params]);
  },
  addAdmin: function(params:string[]){
    return web3.eth.abi.encodeFunctionCall({
      name: "addAdmin",
      type: "function",
      inputs:[
        {
          type: "address",
          name: "_user"
        },
        {
          type: "bool",
          name: "_status"
        }
        ]
    },[...params]);
  },
  setSecret: function(params:string[]) {
    return web3.eth.abi.encodeFunctionCall({
      name: "setSecrettttt",
      type: "function",
      inputs:[
        {
          type: "string",
          name: "_newSecrett"
        },
      ]
    },[...params]);
  }
}


type TMethods = "addAdmin" | "changeNumber" | "setPhrase";

export class ProposalFabric{
  signature:string;
  recepient:string;
  description: string;

  constructor(selector: TMethods, params:string[], recepient:string, description:string){
    this.signature = signatures[selector](params);
    this.createProposal = this.createProposal;
    this.recepient = recepient;
    this.description = description;
  }
  async createProposal(contract: Contract, caller:SignerWithAddress):Promise<any>{
     let id: string = String(await contract.connect(caller).addProposal(this.signature, this.recepient, this.description));
     console.log(111);
     console.log(id);
     return contract.proposals(id);
  }
}
