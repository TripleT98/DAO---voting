import Web3 from "web3";
import * as dotenv from "dotenv";
import {task} from "hardhat/config";
import {provider as Provider} from "web3-core/types/index.d"
dotenv.config();
let {abi: dao_abi} = require("./../artifacts/contracts/DAO.sol/DAO.json");
let {abi: erc20_abi} = require("./../artifacts/contracts/ERC20.sol/MyERC20.json");

let envParams = process.env

let provider: Provider = new Web3.providers.HttpProvider(`${envParams.META_MASK_PROVIDER_URL}`)
let web3: Web3 = new Web3(provider);
let dao = new web3.eth.Contract(dao_abi, `${envParams.DAO}`);

let erc20 = new web3.eth.Contract(erc20_abi, `${envParams.ERC20}`);

interface SignType {
  gaslimit: string;
  privatekey: string;
  data: string;
}

async function getSign(obj:SignType, isForStaking?:boolean):Promise<any> {
  //Создаю объект необходимый для подписи транзакций
    return await web3.eth.accounts.signTransaction({
      to:envParams.DAO,//Адрес контракта, к которому нужно обратиться
      //value: web3js.utils.toWei(obj.value || "0", "wei") || null,//Велечина эфира, которую вы хотите отправить на контракт
      gas: Number(obj.gaslimit),//Лимит газа, максимально допустимый газ, который вы допускаете использовать при выполнении транзакции.Чем больше лимит газа, тем более сложные операции можно провести при выполнении транзакции
      data: obj.data//Бинарный код транзакции, которую вы хотите выполнить
    }, obj.privatekey)
}


export {
  erc20, web3, task, envParams, getSign, dao
}
