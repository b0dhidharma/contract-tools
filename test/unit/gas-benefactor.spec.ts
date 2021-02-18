import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import { expect } from 'chai';
import { TransactionResponse } from '@ethersproject/abstract-provider';
import { Contract, ContractFactory, utils } from 'ethers';
import { ethers } from 'hardhat';
import { behaviours, constants } from '../utils';

describe('GasBenefactor', () => {
  let owner: SignerWithAddress;

  let chiTokenContract: ContractFactory;
  let chiToken: Contract;

  let gasBenefactorContract: ContractFactory;
  let gasBenefactor: Contract;

  before('Setup accounts and contracts', async () => {
    [owner] = await ethers.getSigners();
    chiTokenContract = await ethers.getContractFactory(
      'contracts/test/ChiToken.sol:ChiToken'
    );
    gasBenefactorContract = await ethers.getContractFactory(
      'contracts/mock/GasBenefactor.sol:GasBenefactorMock'
    );
  });

  beforeEach('Deploy necessary contracts', async () => {
    chiToken = await chiTokenContract.deploy();
    gasBenefactor = await gasBenefactorContract.deploy(chiToken.address);
  });

  describe('constructor', () => {
    context('when chi token address is zero', () => {
      it('reverts with message', async () => {
        await behaviours.deployShouldRevertWithZeroAddress({
          contract: gasBenefactorContract,
          args: [constants.ZERO_ADDRESS],
        });
      });
    });
    context('when all parameters are correct', () => {
      it('sets them and emits events', async () => {
        await behaviours.deployShouldSetVariablesAndEmitEvents({
          contract: gasBenefactorContract,
          args: [chiToken.address],
          settersGettersVariablesAndEvents: [
            {
              getterFunc: 'chiToken',
              variable: chiToken.address,
              eventEmitted: 'ChiTokenSet',
            },
          ],
        });
      });
    });
  });

  describe('setChiToken', () => {
    context('when chi token address is zero', () => {
      it('reverts with message', async () => {
        await behaviours.txShouldRevertWithZeroAddress({
          contract: gasBenefactor,
          func: 'setChiToken',
          args: [constants.ZERO_ADDRESS],
        });
      });
    });
    context('when chi token is not zero', () => {
      it('sets chi token and emits event', async () => {
        await behaviours.txShouldSetVariableAndEmitEvent({
          contract: gasBenefactor,
          getterFunc: 'chiToken',
          setterFunc: 'setChiToken',
          variable: constants.NOT_ZERO_ADDRESS,
          eventEmitted: 'ChiTokenSet',
        });
      });
    });
  });
  describe('subsidize', () => {
    const chiMinted = ethers.BigNumber.from('140');
    beforeEach(async () => {
      await chiToken.mint(chiMinted);
    });
    context('when amount is zero', () => {
      it('reverts with message', async () => {
        await behaviours.txShouldRevertWithMessage({
          contract: gasBenefactor,
          func: 'subsidize',
          args: [0],
          message: 'GasBenefactor::_subsidize::zero-amount',
        });
      });
    });
    context('when amount is bigger than zero', () => {
      context('and it was not approved', () => {
        it('reverts with message', async () => {
          await behaviours.txShouldRevertWithMessage({
            contract: gasBenefactor,
            func: 'subsidize',
            args: [chiMinted],
            message: 'ERC20: transfer amount exceeds allowance',
          });
        });
      });
      context('and the total was not approved', () => {
        beforeEach(async () => {
          await chiToken.approve(gasBenefactor.address, chiMinted.sub(1));
        });
        it('reverts with message', async () => {
          await behaviours.txShouldRevertWithMessage({
            contract: gasBenefactor,
            func: 'subsidize',
            args: [chiMinted],
            message: 'ERC20: transfer amount exceeds allowance',
          });
        });
      });
    });
    context('when amount is bigger than zero', () => {
      beforeEach(async () => {
        await chiToken.approve(gasBenefactor.address, chiMinted);
      });
      context('and it was completely approved', () => {
        it('takes chi from gasBenefactor, increases allowance and emits event', async () => {
          expect(await chiToken.balanceOf(gasBenefactor.address)).to.equal(0);
          await expect(gasBenefactor.subsidize(chiMinted.div(2)))
            .to.emit(gasBenefactor, 'Subsidized')
            .withArgs(chiMinted.div(2), owner.address);
          expect(await chiToken.balanceOf(gasBenefactor.address)).to.equal(
            chiMinted.div(2)
          );
          await expect(gasBenefactor.subsidize(chiMinted.div(2)))
            .to.emit(gasBenefactor, 'Subsidized')
            .withArgs(chiMinted.div(2), owner.address);
          expect(await chiToken.balanceOf(gasBenefactor.address)).to.equal(
            chiMinted
          );
        });
      });
    });
  });
  // ChiToken still doesnt work for local environments
  describe('subsidizeTx', () => {
    context('when there is no chi subsidized in contract', () => {
      it('doesnt make transaction cheaper', async () => {
        const firstTx: TransactionResponse = await gasBenefactor.trySubsidizeTx();
        const firstTxCumulativeGasUsed = (await firstTx.wait(1))
          .cumulativeGasUsed;
        const secondTx = await gasBenefactor.trySubsidizeTx();
        const secondTxCumulativeGasUsed = (await secondTx.wait(1))
          .cumulativeGasUsed;
        expect(secondTxCumulativeGasUsed).to.be.gte(firstTxCumulativeGasUsed);
      });
    });
    context('when there is chi subsidized in contract', () => {
      const chiMinted = ethers.BigNumber.from('140');
      beforeEach(async () => {
        await chiToken.mint(chiMinted);
        await chiToken.approve(gasBenefactor.address, chiMinted);
      });
      it('makes transaction cheaper', async () => {
        const firstTx: TransactionResponse = await gasBenefactor.trySubsidizeTx();
        const firstTxCumulativeGasUsed = (await firstTx.wait(1))
          .cumulativeGasUsed;
        await gasBenefactor.subsidize(chiMinted);
        const secondTx = await gasBenefactor.trySubsidizeTx();
        const secondTxCumulativeGasUsed = (await secondTx.wait(1))
          .cumulativeGasUsed;
        expect(secondTxCumulativeGasUsed).to.be.lt(firstTxCumulativeGasUsed);
      });
    });
  });

  // ChiToken still doesnt work for local environments
  describe('discountTx', () => {
    const chiMinted = ethers.BigNumber.from('140');
    beforeEach(async () => {
      await chiToken.mint(chiMinted);
    });
    context('when user didnt approve chi', () => {
      it('doesnt make transaction cheaper', async () => {
        const firstTx: TransactionResponse = await gasBenefactor.tryDiscountTx();
        const firstTxCumulativeGasUsed = (await firstTx.wait(1))
          .cumulativeGasUsed;
        const initialChiBalanceOfUser = await chiToken.balanceOf(owner.address);
        const secondTx = await gasBenefactor.tryDiscountTx();
        const secondTxCumulativeGasUsed = (await secondTx.wait(1))
          .cumulativeGasUsed;
        expect(secondTxCumulativeGasUsed).to.be.gte(firstTxCumulativeGasUsed);
        expect(await chiToken.balanceOf(owner.address)).to.be.eq(
          initialChiBalanceOfUser
        );
      });
    });
    context('when user did approve chi', () => {
      it('makes transaction cheaper', async () => {
        const firstTx: TransactionResponse = await gasBenefactor.tryDiscountTx();
        const firstTxCumulativeGasUsed = (await firstTx.wait(1))
          .cumulativeGasUsed;
        const initialChiBalanceOfUser = await chiToken.balanceOf(owner.address);
        await chiToken.approve(gasBenefactor.address, chiMinted);
        const secondTx = await gasBenefactor.tryDiscountTx();
        const secondTxCumulativeGasUsed = (await secondTx.wait(1))
          .cumulativeGasUsed;
        expect(secondTxCumulativeGasUsed).to.be.lt(firstTxCumulativeGasUsed);
        expect(await chiToken.balanceOf(owner.address)).to.be.lt(
          initialChiBalanceOfUser
        );
      });
    });
  });
});
