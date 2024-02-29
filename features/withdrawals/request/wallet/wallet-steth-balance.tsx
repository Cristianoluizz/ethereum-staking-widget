import { CardBalance } from 'shared/wallet';
import { FormatToken } from 'shared/formatters';
import { useRequestFormData } from '../request-form-context';

export const WalletStethBalance = () => {
  const { balanceSteth, loading } = useRequestFormData();

  const stethBalanceValue = (
    <FormatToken
      showAmountTip
      amount={balanceSteth}
      symbol="stETH"
      data-testid="stEthBalance"
    />
  );

  return (
    <CardBalance
      small
      title="stETH Balance"
      loading={loading.isStethBalanceLoading}
      value={stethBalanceValue}
    />
  );
};
