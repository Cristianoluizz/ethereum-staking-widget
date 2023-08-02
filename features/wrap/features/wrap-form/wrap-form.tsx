import React, { FC, memo, useCallback, useMemo, useState, useRef } from 'react';
import {
  Block,
  DataTable,
  DataTableRow,
  Eth,
  Steth,
} from '@lidofinance/lido-ui';
import { getTokenAddress, TOKENS } from '@lido-sdk/constants';
import { useWeb3 } from 'reef-knot/web3-react';
import { useSDK, useWSTETHBalance } from '@lido-sdk/react';
import { parseEther } from '@ethersproject/units';
import { TxStageModal, TX_OPERATION, TX_STAGE } from 'shared/components';
import { useTxCostInUsd, useWstethBySteth } from 'shared/hooks';
import { useIsMultisig } from 'shared/hooks/useIsMultisig';
import {
  formatBalance,
  getErrorMessage,
  runWithTransactionLogger,
} from 'utils';

import { FormatToken } from 'shared/formatters';
import { useApproveGasLimit, useWrapGasLimit } from './hooks';
import { useApprove } from 'shared/hooks/useApprove';
import { Form } from './form';

const ETH = 'ETH';

const iconsMap = {
  [ETH]: <Eth />,
  [TOKENS.STETH]: <Steth />,
};

export const WrapForm: FC = memo(() => {
  const { account } = useWeb3();
  const { chainId } = useSDK();

  const wstethBalance = useWSTETHBalance();

  const formRef = useRef<HTMLFormElement>(null);

  const [selectedToken, setSelectedToken] = useState<keyof typeof iconsMap>(
    TOKENS.STETH,
  );

  const [inputValue, setInputValue] = useState('');
  // Needs for fix flashing balance in tx success modal
  const [wrappingAmountValue, setWrappingAmountValue] = useState('');
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txStage, setTxStage] = useState(TX_STAGE.SUCCESS);
  const [txOperation, setTxOperation] = useState(TX_OPERATION.STAKING);
  const [txHash, setTxHash] = useState<string>();
  const [txModalFailedText, setTxModalFailedText] = useState('');

  const inputValueAsBigNumber = useMemo(() => {
    try {
      return parseEther(inputValue ? inputValue : '0');
    } catch {
      return parseEther('0');
    }
  }, [inputValue]);

  const stethTokenAddress = useMemo(
    () => getTokenAddress(chainId, TOKENS.STETH),
    [chainId],
  );

  const wstethTokenAddress = useMemo(
    () => getTokenAddress(chainId, TOKENS.WSTETH),
    [chainId],
  );

  const oneSteth = useMemo(() => parseEther('1'), []);

  const approveGasLimit = useApproveGasLimit();
  const approveTxCostInUsd = useTxCostInUsd(approveGasLimit);

  const wrapGasLimit = useWrapGasLimit(selectedToken === ETH);
  const wrapTxCostInUsd = useTxCostInUsd(wrapGasLimit);

  const oneWstethConverted = useWstethBySteth(oneSteth);

  const openTxModal = useCallback(() => {
    setTxModalOpen(true);
  }, []);

  const closeTxModal = useCallback(() => {
    setTxModalOpen(false);
  }, []);

  const [isMultisig] = useIsMultisig();

  const approveWrapper = useCallback<
    NonNullable<Parameters<typeof useApprove>[4]>
  >(
    async (callback) => {
      try {
        setTxStage(TX_STAGE.SIGN);
        openTxModal();

        const transaction = await runWithTransactionLogger(
          'Approve signing',
          callback,
        );

        if (isMultisig) {
          setTxStage(TX_STAGE.IDLE);
          closeTxModal();
          return;
        }

        if (typeof transaction !== 'string') {
          setTxHash(transaction.hash);
          setTxStage(TX_STAGE.BLOCK);
          openTxModal();

          await runWithTransactionLogger(
            'Approve block confirmation',
            async () => transaction.wait(),
          );
        }

        setTxStage(TX_STAGE.SUCCESS);
        openTxModal();

        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      } catch (error: any) {
        setTxModalFailedText(getErrorMessage(error));
        setTxStage(TX_STAGE.FAIL);
        openTxModal();
      }
    },
    [openTxModal, closeTxModal, isMultisig],
  );

  const {
    approve,
    needsApprove,
    allowance,
    loading: loadingUseApprove,
  } = useApprove(
    inputValueAsBigNumber,
    stethTokenAddress,
    wstethTokenAddress,
    account ? account : undefined,
    approveWrapper,
  );

  const willWrapSteth = useMemo(() => {
    if (selectedToken === TOKENS.STETH && needsApprove) {
      return parseEther('0');
    }

    return inputValueAsBigNumber;
  }, [needsApprove, selectedToken, inputValueAsBigNumber]);
  const willReceiveWsteth = useWstethBySteth(willWrapSteth);

  const isSteth = selectedToken === TOKENS.STETH;

  return (
    <Block>
      <Form
        formRef={formRef}
        selectedToken={selectedToken}
        setSelectedToken={setSelectedToken}
        setWrappingAmountValue={setWrappingAmountValue}
        setTxOperation={setTxOperation}
        setInputValue={setInputValue}
        openTxModal={openTxModal}
        closeTxModal={closeTxModal}
        setTxStage={setTxStage}
        setTxHash={setTxHash}
        setTxModalFailedText={setTxModalFailedText}
        needsApprove={needsApprove}
        approve={approve}
        inputValue={inputValue}
        wrapGasLimit={wrapGasLimit}
      />

      <DataTable>
        <DataTableRow
          title="Max unlock fee"
          data-testid="maxUnlockFee"
          loading={!approveTxCostInUsd}
        >
          ${approveTxCostInUsd?.toFixed(2)}
        </DataTableRow>
        <DataTableRow
          title="Max gas fee"
          data-testid="maxGasFee"
          loading={!wrapTxCostInUsd}
        >
          ${wrapTxCostInUsd?.toFixed(2)}
        </DataTableRow>
        <DataTableRow
          title="Exchange rate"
          data-testid="exchangeRate"
          loading={!oneWstethConverted}
        >
          1 {isSteth ? 'stETH' : 'ETH'} ={' '}
          <FormatToken amount={oneWstethConverted} symbol="wstETH" />
        </DataTableRow>
        <DataTableRow
          data-testid="allowance"
          title="Allowance"
          loading={loadingUseApprove}
        >
          {isSteth ? <FormatToken amount={allowance} symbol="stETH" /> : <>-</>}
        </DataTableRow>
        <DataTableRow title="You will receive">
          <FormatToken
            amount={willReceiveWsteth}
            data-testid="youWillReceive"
            symbol="wstETH"
          />
        </DataTableRow>
      </DataTable>

      <TxStageModal
        open={txModalOpen}
        onClose={closeTxModal}
        txStage={txStage}
        txOperation={txOperation}
        txHash={txHash}
        amount={wrappingAmountValue}
        amountToken={selectedToken === ETH ? 'ETH' : 'stETH'}
        willReceiveAmount={formatBalance(willReceiveWsteth)}
        willReceiveAmountToken="wstETH"
        balance={wstethBalance.data}
        balanceToken={'wstETH'}
        allowanceAmount={allowance}
        failedText={txModalFailedText}
        onRetry={() => formRef.current?.requestSubmit()}
      />
    </Block>
  );
});