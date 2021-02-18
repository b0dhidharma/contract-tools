// SPDX-License-Identifier: AGPL-3.0

pragma solidity >=0.6.2;

import '../GasBenefactor.sol';

contract GasBenefactorMock is GasBenefactor {
  constructor(IChiToken _chiToken) public GasBenefactor(_chiToken) {}

  function trySubsidizeTx() public subsidizeUserTx {
    _wasteGas();
  }

  function tryDiscountTx() public discountUserTx {
    _wasteGas();
  }

  function _wasteGas() internal pure {
    uint256 zero = 0;
    uint256 notZero = 1;
    for (uint256 i = 0; i < 10000; i++) {
      zero += i;
      notZero = i;
      zero = notZero;
    }
  }

  function setChiToken(IChiToken _chiToken) public override {
    _setChiToken(_chiToken);
  }

  function subsidize(uint256 _amount) public override {
    _subsidize(_amount);
  }
}
