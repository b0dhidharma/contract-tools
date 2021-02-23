// SPDX-License-Identifier: AGPL-3.0

pragma solidity ^0.8.0;

import '@openzeppelin/contracts/access/AccessControl.sol';

interface IGovernable {
  event PendingGovernorSet(address pendingGovernor);
  event GovernorAccepted();

  function setPendingGovernor(address _pendingGovernor) external;
  function acceptGovernor() external;

  function governor() external view returns (address _governor);
  function pendingGovernor() external view returns (address _pendingGovernor);

  function isGovernor(address _account) external view returns (bool _isGovernor);
}

abstract
contract Governable is IGovernable {
  address public override governor;
  address public override pendingGovernor;

  constructor(address _governor) public {
    require(_governor != address(0), 'governable::governor-should-not-be-zero-address');
    governor = _governor;
  }

  function _setPendingGovernor(address _pendingGovernor) internal {
    require(_pendingGovernor != address(0), 'governable::pending-governor-should-not-be-zero-addres');
    pendingGovernor = _pendingGovernor;
    emit PendingGovernorSet(_pendingGovernor);
  }

  function _acceptGovernor() internal {
    governor = pendingGovernor;
    pendingGovernor = address(0);
    emit GovernorAccepted();
  }

  function isGovernor(address _account) public view override returns (bool _isGovernor) {
    return _account == governor;
  }

  modifier onlyGovernor {
    require(isGovernor(msg.sender), 'governable::only-governor');
    _;
  }

  modifier onlyPendingGovernor {
    require(msg.sender == pendingGovernor, 'governable::only-pending-governor');
    _;
  }
}