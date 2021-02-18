import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import { expect } from 'chai';
import { TransactionResponse } from '@ethersproject/abstract-provider';
import { Contract, ContractFactory, utils } from 'ethers';
import { ethers, network } from 'hardhat';
import { evm } from '../utils';

describe('GasBenefactor', () => {
  let owner: SignerWithAddress;
  let chiToken: Contract;

  let gasBenefactorContract: ContractFactory;
  let gasBenefactor: Contract;

  before('Setup accounts and contracts', async () => {
    [owner] = await ethers.getSigners();
    gasBenefactorContract = await ethers.getContractFactory(
      'contracts/mock/GasBenefactor.sol:GasBenefactorMock'
    );
  });

  beforeEach('Deploy necessary contracts', async () => {
    await network.provider.request({
      method: 'hardhat_reset',
      params: [
        {
          forking: {
            jsonRpcUrl: process.env.MAINNET_HTTPS_URL,
            blockNumber: 11881948,
          },
        },
      ],
    });
    chiToken = await ethers.getContractAt(
      'contracts/interfaces/IChiToken.sol:IChiToken',
      '0x0000000000004946c0e9F43F4Dee607b0eF1fA1c'
    );
    gasBenefactor = await gasBenefactorContract.deploy(chiToken.address);
  });

  describe('subsidizeTx', () => {
    context('when there is no chi subsidized in contract', () => {
      it('doesnt make transaction cheaper', async () => {
        const firstTx: TransactionResponse = await gasBenefactor.trySubsidizeTx();
        const firstTxCumulativeGasUsed = (await firstTx.wait(1))
          .cumulativeGasUsed;
        await evm.advanceBlock();
        const initialChiBalanceOfGasBenefactor = await chiToken.balanceOf(
          gasBenefactor.address
        );
        const secondTx = await gasBenefactor.trySubsidizeTx();
        const secondTxCumulativeGasUsed = (await secondTx.wait(1))
          .cumulativeGasUsed;
        await evm.advanceBlock();
        expect(secondTxCumulativeGasUsed).to.be.gte(firstTxCumulativeGasUsed);
        expect(await chiToken.balanceOf(gasBenefactor.address)).to.be.eq(
          initialChiBalanceOfGasBenefactor
        );
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
        await evm.advanceBlock();
        await gasBenefactor.subsidize(chiMinted);
        const initialChiBalanceOfGasBenefactor = await chiToken.balanceOf(
          gasBenefactor.address
        );
        const secondTx = await gasBenefactor.trySubsidizeTx();
        const secondTxCumulativeGasUsed = (await secondTx.wait(1))
          .cumulativeGasUsed;
        await evm.advanceBlock();
        expect(secondTxCumulativeGasUsed).to.be.lt(firstTxCumulativeGasUsed);
        expect(await chiToken.balanceOf(gasBenefactor.address)).to.be.lt(
          initialChiBalanceOfGasBenefactor
        );
      });
    });
  });

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
        await evm.advanceBlock();
        const initialChiBalanceOfUser = await chiToken.balanceOf(owner.address);
        const secondTx = await gasBenefactor.tryDiscountTx();
        const secondTxCumulativeGasUsed = (await secondTx.wait(1))
          .cumulativeGasUsed;
        await evm.advanceBlock();
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
        await evm.advanceBlock();
        expect(secondTxCumulativeGasUsed).to.be.lt(firstTxCumulativeGasUsed);
        expect(await chiToken.balanceOf(owner.address)).to.be.lt(
          initialChiBalanceOfUser
        );
      });
    });
  });
});
