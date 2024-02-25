import { UserConfigDefaultType } from 'config/client-config/types';
import { CHAINS } from 'utils/chains';

import { getConfig } from 'config';
const {
  defaultChain,
  supportedChains,
  prefillUnsafeElRpcUrls1,
  prefillUnsafeElRpcUrls5,
  prefillUnsafeElRpcUrls17000,
  walletconnectProjectId,
} = getConfig();

export const getUserConfigDefault = (): UserConfigDefaultType => {
  return {
    defaultChain: Number(defaultChain),
    supportedChainIds: supportedChains,
    prefillUnsafeElRpcUrls: {
      [CHAINS.Mainnet]: prefillUnsafeElRpcUrls1,
      [CHAINS.Goerli]: prefillUnsafeElRpcUrls5,
      [CHAINS.Holesky]: prefillUnsafeElRpcUrls17000,
    },
    walletconnectProjectId: walletconnectProjectId,
  };
};
