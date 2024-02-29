import { BigNumber } from 'ethers';
import { useMemo } from 'react';

import { useEthPrice } from '@lido-sdk/react';
import { weiToEth } from 'utils/weiToEth';
import { STRATEGY_LAZY } from 'utils/swrStrategies';

export const useEthUsd = (amount?: BigNumber) => {
  const swr = useEthPrice(STRATEGY_LAZY);
  const usdAmount = useMemo(() => {
    if (swr.data && amount) {
      const txCostInEth = weiToEth(amount);
      return txCostInEth * swr.data;
    }
    return undefined;
  }, [amount, swr.data]);
  return {
    usdAmount,
    price: swr.data,
    get initialLoading() {
      return swr.initialLoading;
    },
    get error() {
      return swr.error;
    },
    get loading() {
      return swr.loading;
    },
    get update() {
      return swr.update;
    },
  };
};
