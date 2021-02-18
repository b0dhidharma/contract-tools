// "SPDX-License-Identifier: UNLICENSED"
// Credits to: https://github.com/gnosis/testable-chi-token

pragma solidity ^0.7.6;

import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

abstract contract ERC20WithoutTotalSupply is IERC20 {
    using SafeMath for uint256;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }

    function allowance(address owner, address spender)
        public
        view
        override
        returns (uint256)
    {
        return _allowances[owner][spender];
    }

    function transfer(address recipient, uint256 amount)
        public
        override
        returns (bool)
    {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    function approve(address spender, uint256 amount)
        public
        override
        returns (bool)
    {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public override returns (bool) {
        _transfer(sender, recipient, amount);
        uint256 allowed = _allowances[sender][msg.sender];
        if ((allowed >> 255) == 0) {
            _approve(
                sender,
                msg.sender,
                allowed.sub(amount, "ERC20: transfer amount exceeds allowance")
            );
        }
        return true;
    }

    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal {
        _balances[sender] = _balances[sender].sub(
            amount,
            "ERC20: transfer amount exceeds balance"
        );
        _balances[recipient] = _balances[recipient].add(amount);
        emit Transfer(sender, recipient, amount);
    }

    function _approve(
        address owner,
        address spender,
        uint256 amount
    ) internal {
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function _mint(address account, uint256 amount) internal {
        _balances[account] = _balances[account].add(amount);
        emit Transfer(address(0), account, amount);
    }

    function _burn(address account, uint256 amount) internal {
        _balances[account] = _balances[account].sub(
            amount,
            "ERC20: burn amount exceeds balance"
        );
        emit Transfer(account, address(0), amount);
    }

    function _burnFrom(address account, uint256 amount) internal {
        _burn(account, amount);
        uint256 allowed = _allowances[account][msg.sender];
        if ((allowed >> 255) == 0) {
            _approve(
                account,
                msg.sender,
                allowed.sub(amount, "ERC20: burn amount exceeds allowance")
            );
        }
    }
}

contract ChiToken is IERC20, ERC20WithoutTotalSupply {
    string public constant name = "Chi Token by 1inch";
    string public constant symbol = "CHI";
    uint8 public constant decimals = 0;

    uint256 public totalMinted;
    uint256 public totalBurned;

    bytes32 immutable bytecodeWord1;
    bytes3 immutable bytecodeWord2;
    bytes32 immutable bytecodeHash;

    constructor() {
        // Documentation adapted from https://github.com/projectchicago/gastoken/blob/master/contract/GST2_ETH.sol#L105
        // For more information on the opcodes, cf. https://ethervm.io/
        //
        // EVM assembler of runtime portion of child contract:
        //     ;; Pseudocode: if (msg.sender != <address>) { throw; }
        //     ;;             suicide(msg.sender)
        //     PUSH20 <address>
        //     CALLER
        //     XOR
        //     PC
        //     JUMPI
        //     CALLER
        //     SELFDESTRUCT
        // Or in binary: 73____________20 bytes address____________3318585733ff
        // Since the binary is so short (27 bytes), we can get away
        // with a very simple initcode:
        //     PUSH27 73____________20 bytes address____________3318585733ff
        //     RETURNDATASIZE ;; Push offset 0 for MSTORE call on the stack
        //     MSTORE ;; at this point, memory locations mem[5] through
        //            ;; mem[31] contain the runtime portion of the child
        //            ;; contract. all that's left to do is to RETURN this
        //            ;; chunk of memory.
        //     PUSH1 27 ;; length
        //     PUSH1 5 ;; offset
        //     RETURN
        // Or in binary: 7a73____________20 bytes address____________3318585733ff3d52601b6005f3
        // Almost done! All we have to do is put this short (35 bytes) blob into
        // memory and call CREATE with the appropriate offsets.
        bytes32 _bytecodeWord1 =
            bytes32(
                0x7a7300000000000000000000000000000000000000003318585733ff3d52601b
            ) | (bytes32(uint256(address(this))) << 80);
        bytes3 _bytecodeWord2 = 0x6005f3;
        bytecodeHash = keccak256(
            abi.encodePacked(_bytecodeWord1, _bytecodeWord2)
        );
        bytecodeWord1 = _bytecodeWord1;
        bytecodeWord2 = _bytecodeWord2;
    }

    function totalSupply() public view override returns (uint256) {
        return totalMinted - totalBurned;
    }

    function mint(uint256 value) public {
        uint256 offset = totalMinted;
        bytes32 _bytecodeWord1 = bytecodeWord1;
        bytes3 _bytecodeWord2 = bytecodeWord2;
        assembly {
            mstore(0, _bytecodeWord1)
            mstore(32, _bytecodeWord2)
            for {
                let i := div(value, 32)
            } i {
                i := sub(i, 1)
            } {
                pop(create2(0, 0, 35, add(offset, 0)))
                pop(create2(0, 0, 35, add(offset, 1)))
                pop(create2(0, 0, 35, add(offset, 2)))
                pop(create2(0, 0, 35, add(offset, 3)))
                pop(create2(0, 0, 35, add(offset, 4)))
                pop(create2(0, 0, 35, add(offset, 5)))
                pop(create2(0, 0, 35, add(offset, 6)))
                pop(create2(0, 0, 35, add(offset, 7)))
                pop(create2(0, 0, 35, add(offset, 8)))
                pop(create2(0, 0, 35, add(offset, 9)))
                pop(create2(0, 0, 35, add(offset, 10)))
                pop(create2(0, 0, 35, add(offset, 11)))
                pop(create2(0, 0, 35, add(offset, 12)))
                pop(create2(0, 0, 35, add(offset, 13)))
                pop(create2(0, 0, 35, add(offset, 14)))
                pop(create2(0, 0, 35, add(offset, 15)))
                pop(create2(0, 0, 35, add(offset, 16)))
                pop(create2(0, 0, 35, add(offset, 17)))
                pop(create2(0, 0, 35, add(offset, 18)))
                pop(create2(0, 0, 35, add(offset, 19)))
                pop(create2(0, 0, 35, add(offset, 20)))
                pop(create2(0, 0, 35, add(offset, 21)))
                pop(create2(0, 0, 35, add(offset, 22)))
                pop(create2(0, 0, 35, add(offset, 23)))
                pop(create2(0, 0, 35, add(offset, 24)))
                pop(create2(0, 0, 35, add(offset, 25)))
                pop(create2(0, 0, 35, add(offset, 26)))
                pop(create2(0, 0, 35, add(offset, 27)))
                pop(create2(0, 0, 35, add(offset, 28)))
                pop(create2(0, 0, 35, add(offset, 29)))
                pop(create2(0, 0, 35, add(offset, 30)))
                pop(create2(0, 0, 35, add(offset, 31)))
                offset := add(offset, 32)
            }
            for {
                let i := and(value, 0x1F)
            } i {
                i := sub(i, 1)
            } {
                pop(create2(0, 0, 35, offset))
                offset := add(offset, 1)
            }
        }
        _mint(msg.sender, value);
        totalMinted = offset;
    }

    function _destroyChildren(uint256 value) internal {
        uint256 data;
        uint256 i;
        uint256 end;
        bytes32 _bytecodeHash = bytecodeHash;
        assembly {
            i := sload(totalBurned.slot)
            end := add(i, value)
            sstore(totalBurned.slot, end)

            data := mload(0x40)
            mstore(
                data,
                add(
                    0xff00000000000000000000000000000000000000000000000000000000000000,
                    shl(0x58, address())
                )
            )
            mstore(add(data, 53), _bytecodeHash)
            let ptr := add(data, 21)
            for {

            } lt(i, end) {
                i := add(i, 1)
            } {
                mstore(ptr, i)
                pop(call(gas(), keccak256(data, 85), 0, 0, 0, 0, 0))
            }
        }
    }

    function free(uint256 value) public returns (uint256) {
        if (value > 0) {
            _burn(msg.sender, value);
            _destroyChildren(value);
        }
        return value;
    }

    function freeUpTo(uint256 value) public returns (uint256) {
        return free(Math.min(value, balanceOf(msg.sender)));
    }

    function freeFrom(address from, uint256 value) public returns (uint256) {
        if (value > 0) {
            _burnFrom(from, value);
            _destroyChildren(value);
        }
        return value;
    }

    function freeFromUpTo(address from, uint256 value)
        public
        returns (uint256)
    {
        return
            freeFrom(
                from,
                Math.min(
                    Math.min(value, balanceOf(from)),
                    allowance(from, msg.sender)
                )
            );
    }
}