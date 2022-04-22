import {
  erc20, web3, task, envParams, getSign, dao
} from "./task";

type tArgsType = {
  gaslimit: string;
  privatekey: string;
  recepient: string;
  signature: string;
  description: string;
}

export default function addProposalTask() {

  task("add-proposal")
  .addParam("signature", "Function signature")
  .addParam("recepient", "Recepient")
  .addParam("description", "Description")
  .addParam("gaslimit", "gaslimit")
  .addParam("privatekey", "Private key")
  .setAction(async(tArgs:tArgsType)=>{
try{
    let {gaslimit, privatekey, recepient, signature, description} = tArgs;
    let data = await dao.methods.addProposal(signature, recepient, description).encodeABI();
    let sign = await getSign({gaslimit, privatekey, data});
    let transaction = await web3.eth.sendSignedTransaction(sign.rawTransaction);
    console.log(transaction.transactionHash);
  }
catch(e:any){
  console.log(e.message);
}

})
}
