import { useRequestFormData } from '../request-form-context';
import { ButtonIcon, Lock } from '@lidofinance/lido-ui';
import { useWeb3 } from '@reef-knot/web3-react';

import { Connect } from 'shared/wallet';
import { useWithdrawals } from 'features/withdrawals/contexts/withdrawals-context';

type SubmitButtonProps = {
  disabled?: boolean;
  loading?: boolean;
};

export const SubmitButton = ({ disabled, loading }: SubmitButtonProps) => {
  const { isTokenLocked } = useRequestFormData();
  const { active } = useWeb3();
  const { isPaused } = useWithdrawals();

  if (!active) return <Connect fullwidth />;

  const buttonTitle = isTokenLocked
    ? 'Unlock tokens for withdrawal'
    : 'Request withdrawal';

  return (
    <ButtonIcon
      fullwidth
      type="submit"
      icon={isTokenLocked ? <Lock /> : <></>}
      disabled={disabled || isPaused}
      loading={loading}
      data-testid="requestButton"
    >
      {buttonTitle}
    </ButtonIcon>
  );
};