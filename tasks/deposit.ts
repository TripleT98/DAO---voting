import {
  erc20, web3, task, envParams, getSign, dao
} from "./task";

type tArgsType = {
  gaslimit: string;
  privatekey: string;
  amount: string;
}

export default function depositTask() {

  task("deposit")
  .addParam("amount", "Token amount")
  .addParam("gaslimit", "gaslimit")
  .addParam("privatekey", "Private key")
  .setAction(async(tArgs:tArgsType)=>{
try{
    let {gaslimit, privatekey, amount} = tArgs;
    let data = await dao.methods.deposit(amount).encodeABI();
    let sign = await getSign({gaslimit, privatekey, data});
    let transaction = await web3.eth.sendSignedTransaction(sign.rawTransaction);
    console.log(transaction.transactionHash);
  }
  catch(e:any){
    console.log(e.message);
  }
})
}
