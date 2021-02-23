import 'dotenv/config';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-etherscan';
import { removeConsoleLog } from 'hardhat-preprocessor';
import 'hardhat-gas-reporter';
import 'solidity-coverage';
import { HardhatUserConfig } from 'hardhat/config';

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  solidity: {
    compilers: [
      {
        version: '0.8.1',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ]
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
    currency: process.env.COINMARKETCAP_DEFAULT_CURRENCY,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  preprocess: {
    eachLine: removeConsoleLog((hre) => hre.network.name !== 'hardhat'),
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

if (!process.env.TEST) {
  config.networks = {
    hardhat: {
      forking: {
        enabled: process.env.FORK ? true : false,
        url: process.env.MAINNET_HTTPS_URL as string,
      },
    },
    localMainnet: {
      url: process.env.LOCAL_MAINNET_HTTPS_URL,
      accounts: [process.env.LOCAL_MAINNET_PRIVATE_KEY as string],
    },
    mainnet: {
      url: process.env.MAINNET_HTTPS_URL,
      accounts: [process.env.MAINNET_PRIVATE_KEY as string],
      gasPrice: 'auto',
    },
  };
}

export default config;
