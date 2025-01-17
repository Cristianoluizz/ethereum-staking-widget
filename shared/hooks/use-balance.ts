/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { QueryKey, useQuery, useQueryClient } from '@tanstack/react-query';
import { BigNumber } from 'ethers';
import { useLidoSDK } from 'providers/lido-sdk';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useBlockNumber,
  useBalance,
  useAccount,
  useReadContract,
  useWatchContractEvent,
} from 'wagmi';

import type { AbstractLidoSDKErc20 } from '@lidofinance/lido-ethereum-sdk/erc20';
import type { GetBalanceData } from 'wagmi/query';
import type { Address, WatchContractEventOnLogsFn } from 'viem';

const nativeToBN = (data: bigint) => BigNumber.from(data.toString());

const balanceToBN = (data: GetBalanceData) => nativeToBN(data.value);

export const useEthereumBalance = () => {
  const queryClient = useQueryClient();
  const { address } = useAccount();
  const { data: blockNumber } = useBlockNumber({ watch: !!address });
  const queryData = useBalance({
    address,
    query: { select: balanceToBN, staleTime: 7000, enabled: !!address },
  });

  useEffect(() => {
    void queryClient.invalidateQueries(
      { queryKey: queryData.queryKey },
      // this tells RQ to not force another refetch if this query is already revalidating
      // dedups rpc requests
      { cancelRefetch: false },
    );
  }, [blockNumber, queryClient, queryData.queryKey]);

  return queryData;
};

type TokenContract = Awaited<
  ReturnType<InstanceType<typeof AbstractLidoSDKErc20>['getContract']>
>;

type TokenSubscriptionState = Record<
  Address,
  {
    subscribers: number;
    queryKey: QueryKey;
  }
>;

type SubscribeArgs = {
  tokenAddress: Address;
  queryKey: QueryKey;
};

type UseBalanceProps = {
  account?: Address;
  shouldSubscribeToUpdates?: boolean;
};

export const Erc20EventsAbi = [
  {
    type: 'event',
    name: 'Transfer',
    inputs: [
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: false, name: 'value', type: 'uint256' },
    ],
  },
] as const;

type OnLogsFn = WatchContractEventOnLogsFn<
  typeof Erc20EventsAbi,
  'Transfer',
  true
>;

export const useTokenTransferSubscription = () => {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const [subscriptions, setSubscriptions] = useState<TokenSubscriptionState>(
    {},
  );

  const tokens = useMemo(
    () => Object.keys(subscriptions) as Address[],
    [subscriptions],
  );

  const onLogs: OnLogsFn = useCallback(
    (logs) => {
      for (const log of logs) {
        const subscription =
          subscriptions[log.address.toLowerCase() as Address];
        if (!subscription) continue;
        // we could optimistically update balance data
        // but it's easier to refetch balance after transfer
        void queryClient.invalidateQueries(
          {
            queryKey: subscription.queryKey,
          },
          { cancelRefetch: false },
        );
      }
    },
    [queryClient, subscriptions],
  );

  const shouldWatch = address && tokens.length > 0;

  useWatchContractEvent({
    abi: Erc20EventsAbi,
    eventName: 'Transfer',
    args: useMemo(
      () => ({
        to: address,
      }),
      [address],
    ),
    address: tokens,
    enabled: shouldWatch,
    onLogs,
  });

  useWatchContractEvent({
    abi: Erc20EventsAbi,
    eventName: 'Transfer',
    args: useMemo(
      () => ({
        from: address,
      }),
      [address],
    ),
    address: tokens,
    enabled: shouldWatch,
    onLogs,
  });

  const subscribe = useCallback(
    ({ tokenAddress: _tokenAddress, queryKey }: SubscribeArgs) => {
      const tokenAddress = _tokenAddress.toLowerCase() as Address;
      setSubscriptions((old) => {
        const existing = old[tokenAddress];
        return {
          ...old,
          [tokenAddress]: {
            queryKey,
            subscribers: existing?.subscribers ?? 0 + 1,
          },
        };
      });

      // returns unsubscribe to be used as useEffect return fn (for unmount)
      return () => {
        setSubscriptions((old) => {
          const existing = old[tokenAddress];
          if (!existing) return old;
          if (existing.subscribers > 1) {
            return {
              ...old,
              [tokenAddress]: {
                ...existing,
                subscribers: existing.subscribers - 1,
              },
            };
          } else {
            delete old[tokenAddress];
            return { ...old };
          }
        });
      };
    },
    [],
  );

  return subscribe;
};

// NB: contract can be undefined but for better wagmi typings is casted as NoNNullable
const useTokenBalance = (
  contract: TokenContract,
  address?: Address,
  shouldSubscribe = true,
) => {
  const { subscribeToTokenUpdates } = useLidoSDK();

  const balanceQuery = useReadContract({
    abi: contract?.abi,
    address: contract?.address,
    functionName: 'balanceOf',
    args: address && [address],
    query: {
      enabled: !!address,
      select: nativeToBN,
      // because we update on events we can have high staleTime
      // this prevents loader when changing pages
      staleTime: 30_000,
    },
  });

  useEffect(() => {
    if (shouldSubscribe && address && contract?.address) {
      return subscribeToTokenUpdates({
        tokenAddress: contract.address,
        queryKey: balanceQuery.queryKey,
      });
    }
    // queryKey causes rerender
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, contract?.address]);

  return balanceQuery;
};

export const useStethBalance = ({
  account,
  shouldSubscribeToUpdates = true,
}: UseBalanceProps = {}) => {
  const { address } = useAccount();
  const mergedAccount = account ?? address;

  const { steth, core } = useLidoSDK();

  const { data: contract, isLoading } = useQuery({
    queryKey: ['steth-contract', core.chainId],
    enabled: !!mergedAccount,

    staleTime: Infinity,
    queryFn: async () => steth.getContract(),
  });

  const balanceData = useTokenBalance(
    contract!,
    mergedAccount,
    shouldSubscribeToUpdates,
  );

  return { ...balanceData, isLoading: isLoading || balanceData.isLoading };
};

export const useWstethBalance = ({
  account,
  shouldSubscribeToUpdates = true,
}: UseBalanceProps = {}) => {
  const { address } = useAccount();
  const mergedAccount = account ?? address;

  const { wsteth, core } = useLidoSDK();

  const { data: contract, isLoading } = useQuery({
    queryKey: ['wsteth-contract', core.chainId],
    enabled: !!mergedAccount,
    staleTime: Infinity,
    queryFn: async () => wsteth.getContract(),
  });

  const balanceData = useTokenBalance(
    contract!,
    mergedAccount,
    shouldSubscribeToUpdates,
  );

  return { ...balanceData, isLoading: isLoading || balanceData.isLoading };
};
