import {
  erc20, web3, task, envParams, getSign, dao
} from "./task";

type tArgsType = {
  gaslimit: string;
  privatekey: string;
  id: string;
  choise: string;
}

export default function voteTask() {

  task("vote")
  .addParam("id", "Proposal Id")
  .addParam("gaslimit", "gaslimit")
  .addParam("privatekey", "Private key")
  .addParam("choise", "For or against")
  .setAction(async(tArgs:tArgsType)=>{
try{
    let {gaslimit, privatekey, id, choise} = tArgs;
    let data = await dao.methods.vote(id, choise).encodeABI();
    let sign = await getSign({gaslimit, privatekey, data});
    let transaction = await web3.eth.sendSignedTransaction(sign.rawTransaction);
    console.log(transaction.transactionHash);
  }catch(e:any){
    console.log(e.message);
  }

  })

}
