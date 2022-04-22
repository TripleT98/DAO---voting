//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DAOable{

  address public DAO;

  constructor(address _DAO){
    DAO = _DAO;
  }

  modifier OnlyDAO(){
    require(msg.sender == DAO, "Error: Only DAO contract has access to this method!");
    _;
  }

modifier Closed(){
  require(false,"Error: Closed!");
  _;
}
}

contract Experimental is DAOable{

  string public phrase = "Hello";
  int public num = 1;
  mapping (address => bool) public admins;
  string secret;

  constructor(address _DAO) DAOable(_DAO){

  }

  function changePhrase(string calldata _phrase) public OnlyDAO {
    phrase = _phrase;
  }

  function changeNum(int _num, uint _actionId) public OnlyDAO{
    require(_actionId >= 0 && _actionId <= 3, "Error: Invalid actionId!");
    if(_actionId == 0){
      num = num + _num;
    }else if(_actionId == 1){
      num = num - _num;
    }else if(_actionId == 2){
      num = num * _num;
    }else if(_actionId == 3){
      num = num / _num;
    }
  }

  function addAdmin(address _user, bool _status) public OnlyDAO{
    if(_status){
      admins[_user] = true;
    }else{
      admins[_user] = false;
    }
  }

  function setSecret(string calldata _newSecret) public Closed{
    secret = _newSecret;
  }

}
