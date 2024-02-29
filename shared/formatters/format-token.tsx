import { useFormattedBalance } from 'utils';
import { BigNumber } from '@ethersproject/bignumber';
import { Component } from 'types';
import { Tooltip } from '@lidofinance/lido-ui';
import { DATA_UNAVAILABLE } from 'config';

export type FormatTokenProps = {
  symbol: string;
  amount?: BigNumber;
  approx?: boolean;
  maxDecimalDigits?: number;
  maxTotalLength?: number;
  showAmountTip?: boolean;
  trimEllipsis?: boolean;
  fallback?: string;
};
export type FormatTokenComponent = Component<'span', FormatTokenProps>;

export const FormatToken: FormatTokenComponent = ({
  amount,
  symbol,
  approx,
  maxDecimalDigits = 4,
  maxTotalLength = 15,
  showAmountTip = false,
  trimEllipsis,
  fallback = DATA_UNAVAILABLE,
  ...rest
}) => {
  const { actual, isTrimmed, trimmed } = useFormattedBalance(
    amount,
    maxDecimalDigits,
    maxTotalLength,
    trimEllipsis,
  );

  if (!amount) return <span {...rest}>{fallback}</span>;

  const showTooltip = showAmountTip && isTrimmed;

  // we show prefix for non zero amount and if we need to show Tooltip Amount
  // overridden by explicitly set approx
  const prefix = amount && !amount.isZero() && approx ? '≈ ' : '';

  const body = (
    <span {...rest}>
      {prefix}
      {trimmed}&nbsp;{symbol}
    </span>
  );

  if (showTooltip) {
    return (
      <Tooltip
        placement="topRight"
        title={
          <span>
            {actual}&nbsp;{symbol}
          </span>
        }
      >
        {body}
      </Tooltip>
    );
  }

  return body;
};
