// SPDX-License-Identifier: AGPL-3.0

pragma solidity 0.7.6;

import '../test/ChiToken.sol';

contract ChiTokenMock is ChiToken {
  function freeMint(uint256 _amount) public {
    _mint(msg.sender, _amount);
    totalMinted = _amount;
  }
}
