import {
  erc20, web3, task, envParams, getSign, dao
} from "./task";

type tArgsType = {
  gaslimit: string;
  privatekey: string;
  id: string;
}

export default function finishTask() {

  task("finish")
  .addParam("id", "Proposal Id")
  .addParam("gaslimit", "gaslimit")
  .addParam("privatekey", "Private key")
  .setAction(async(tArgs:tArgsType)=>{
try{
    let {gaslimit, privatekey, id} = tArgs;
    let data = await dao.methods.finish(id).encodeABI();
    let sign = await getSign({gaslimit, privatekey, data});
    let transaction = await web3.eth.sendSignedTransaction(sign.rawTransaction);
    console.log(transaction.transactionHash);
  }catch(e:any){
    console.log(e.message);
  }

  })

}
