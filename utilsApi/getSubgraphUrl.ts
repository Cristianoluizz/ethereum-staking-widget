import { CHAINS } from 'utils/chains';
import { SubgraphChains } from 'types';

import { getConfig } from 'config';
const { subgraphMainnet, subgraphGoerli, subgraphHolesky } = getConfig();

export const SUBGRAPH_URL = {
  [CHAINS.Mainnet]: subgraphMainnet,
  [CHAINS.Goerli]: subgraphGoerli,
  [CHAINS.Holesky]: subgraphHolesky,
} as const;

export const getSubgraphUrl = (chainId: SubgraphChains): string | undefined => {
  return SUBGRAPH_URL[chainId];
};
