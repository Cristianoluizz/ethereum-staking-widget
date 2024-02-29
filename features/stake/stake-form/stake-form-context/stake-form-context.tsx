import invariant from 'tiny-invariant';
import {
  FC,
  PropsWithChildren,
  useMemo,
  createContext,
  useContext,
  useEffect,
  useCallback,
} from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { useEthereumBalance, useSTETHBalance } from '@lido-sdk/react';
import { parseEther } from '@ethersproject/units';
import { useRouter } from 'next/router';

import {
  FormControllerContext,
  FormControllerContextValueType,
} from 'shared/hook-form/form-controller';
import { useStakingLimitInfo } from 'shared/hooks/useStakingLimitInfo';
import { useMaxGasPrice } from 'shared/hooks';
import { useIsMultisig } from 'shared/hooks/useIsMultisig';
import { STRATEGY_LAZY } from 'utils/swrStrategies';

import { useStethSubmitGasLimit } from '../hooks';
import {
  stakeFormValidationResolver,
  useStakeFormValidationContext,
} from './validation';
import { useStake } from '../use-stake';
import {
  type StakeFormDataContextValue,
  type StakeFormInput,
  type StakeFormNetworkData,
} from './types';
import { useTokenMaxAmount } from 'shared/hooks/use-token-max-amount';
import { BALANCE_PADDING } from 'config';

//
// Data context
//
const StakeFormDataContext = createContext<StakeFormDataContextValue | null>(
  null,
);
StakeFormDataContext.displayName = 'StakeFormDataContext';

export const useStakeFormData = () => {
  const value = useContext(StakeFormDataContext);
  invariant(
    value,
    'useStakeFormData was used outside the StakeFormDataContext provider',
  );
  return value;
};

const useStakeFormNetworkData = (): StakeFormNetworkData => {
  const {
    data: stethBalance,
    update: updateStethBalance,
    initialLoading: isStethBalanceLoading,
  } = useSTETHBalance(STRATEGY_LAZY);
  const { isMultisig, isLoading: isMultisigLoading } = useIsMultisig();
  const gasLimit = useStethSubmitGasLimit();
  const { maxGasPrice, initialLoading: isMaxGasPriceLoading } =
    useMaxGasPrice();

  const gasCost = useMemo(
    () => (gasLimit && maxGasPrice ? gasLimit.mul(maxGasPrice) : undefined),
    [gasLimit, maxGasPrice],
  );

  const {
    data: etherBalance,
    update: updateEtherBalance,
    initialLoading: isEtherBalanceLoading,
  } = useEthereumBalance(undefined, STRATEGY_LAZY);
  const {
    data: stakingLimitInfo,
    mutate: mutateStakeLimit,
    initialLoading: isStakeableEtherLoading,
  } = useStakingLimitInfo();

  const stakeableEther = useMemo(() => {
    if (
      etherBalance &&
      stakingLimitInfo &&
      stakingLimitInfo.isStakingLimitSet
    ) {
      return etherBalance.lt(stakingLimitInfo.currentStakeLimit)
        ? etherBalance
        : stakingLimitInfo.currentStakeLimit;
    }
    return etherBalance;
  }, [etherBalance, stakingLimitInfo]);

  const maxAmount = useTokenMaxAmount({
    balance: etherBalance,
    limit: stakingLimitInfo?.currentStakeLimit,
    isPadded: !isMultisig,
    gasLimit: gasLimit,
    padding: BALANCE_PADDING,
    isLoading: isMultisigLoading,
  });

  const revalidate = useCallback(async () => {
    await Promise.allSettled([
      updateStethBalance,
      updateEtherBalance,
      () => mutateStakeLimit(stakingLimitInfo),
    ]);
  }, [
    updateStethBalance,
    updateEtherBalance,
    mutateStakeLimit,
    stakingLimitInfo,
  ]);

  const loading = useMemo(
    () => ({
      isStethBalanceLoading,
      isMultisigLoading,
      isMaxGasPriceLoading,
      isEtherBalanceLoading,
      isStakeableEtherLoading,
    }),
    [
      isEtherBalanceLoading,
      isMaxGasPriceLoading,
      isMultisigLoading,
      isStethBalanceLoading,
      isStakeableEtherLoading,
    ],
  );

  return {
    stethBalance,
    etherBalance,
    isMultisig: isMultisigLoading ? undefined : isMultisig,
    stakeableEther,
    stakingLimitInfo,
    gasCost,
    gasLimit,
    maxAmount,
    loading,
    revalidate,
  };
};

//
// Data provider
//
export const StakeFormProvider: FC<PropsWithChildren> = ({ children }) => {
  const router = useRouter();
  const networkData = useStakeFormNetworkData();
  const validationContextPromise = useStakeFormValidationContext(networkData);

  const formObject = useForm<StakeFormInput>({
    defaultValues: {
      amount: null,
      referral: null,
    },
    context: validationContextPromise,
    resolver: stakeFormValidationResolver,
    mode: 'onChange',
  });
  const { setValue } = formObject;

  // consumes amount query param
  // SSG safe
  useEffect(() => {
    if (!router.isReady) return;
    try {
      const { amount, ref, ...rest } = router.query;
      if (typeof ref === 'string') {
        setValue('referral', ref);
      }
      if (typeof amount === 'string') {
        void router.replace({ pathname: router.pathname, query: rest });
        const amountBN = parseEther(amount);
        setValue('amount', amountBN);
      }
    } catch {
      //noop
    }
  }, [router, setValue]);

  const stake = useStake({ onConfirm: networkData.revalidate });

  const formControllerValue: FormControllerContextValueType<StakeFormInput> =
    useMemo(() => ({ onSubmit: stake }), [stake]);

  return (
    <FormProvider {...formObject}>
      <StakeFormDataContext.Provider value={networkData}>
        <FormControllerContext.Provider value={formControllerValue}>
          {children}
        </FormControllerContext.Provider>
      </StakeFormDataContext.Provider>
    </FormProvider>
  );
};
