import { BigNumber } from 'ethers';
import { isAddress } from 'ethers/lib/utils';
import type { BaseProvider } from '@ethersproject/providers';

import { getConfig } from 'config';
const { SUBMIT_EXTRA_GAS_TRANSACTION_RATIO, PRECISION } = getConfig();

export const applyGasLimitRatio = (gasLimit: BigNumber): BigNumber =>
  gasLimit.mul(SUBMIT_EXTRA_GAS_TRANSACTION_RATIO * PRECISION).div(PRECISION);

export const getAddress = async (
  input: string,
  providerRpc: BaseProvider,
): Promise<string> => {
  try {
    if (isAddress(input)) return input;
    const address = await providerRpc.resolveName(input);
    if (address) return address;
  } catch {
    // noop
  }
  throw new ReferralAddressError();
};

export class ReferralAddressError extends Error {
  reason: string;
  constructor() {
    const message = 'execution reverted: INVALID_REFERRAL';
    super(message);
    this.reason = message;
  }
}

export class MockLimitReachedError extends Error {
  reason: string;
  constructor(message: string) {
    super(message);
    this.reason = 'execution reverted: STAKE_LIMIT';
  }
}
