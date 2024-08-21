import { FC } from 'react';
import { Box } from '@lidofinance/lido-ui';

import NumberFormat from 'features/rewards/components/NumberFormat';
import { useRewardsHistory } from 'features/rewards/hooks';
import { useStethEthRate } from 'features/rewards/hooks/use-steth-eth-rate';
import { useDappStatus } from 'shared/hooks/use-dapp-status';

import { Item } from './components/item';

export const StEthPriceBlock: FC = () => {
  const { isWalletConnected, isSupportedChain } = useDappStatus();
  const {
    currencyObject: currency,
    data,
    initialLoading: loading,
  } = useRewardsHistory();
  const stEthEth = useStethEthRate();

  return (
    <Item
      loading={loading}
      dataTestId="stEthPriceBlock"
      title="stETH price"
      value={
        (isWalletConnected && !isSupportedChain) ||
        !data?.stETHCurrencyPrice[currency.id] ? (
          '—'
        ) : (
          <>
            <Box display="inline-block" pr="3px">
              {currency.symbol}
            </Box>
            <NumberFormat number={data?.stETHCurrencyPrice[currency.id]} ETH />
          </>
        )
      }
      valueDataTestId="stEthPrice"
      underValue={
        <>
          {(isWalletConnected && !isSupportedChain) ||
          !data?.stETHCurrencyPrice[currency.id] ? (
            '—'
          ) : (
            <>
              <NumberFormat number={stEthEth?.toString()} StEthEth />
              <Box display="inline-block" pl={'3px'}>
                ETH
              </Box>
            </>
          )}
        </>
      }
      underValueDataTestId="ethRate"
    />
  );
};
