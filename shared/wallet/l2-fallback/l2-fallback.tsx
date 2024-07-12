import { useMemo } from 'react';
import { useAccount } from 'wagmi';
import { Link } from '@lidofinance/lido-ui';

import { ReactComponent as ArbitrumLogo } from 'assets/icons/l2/arbitrum.svg';
import { ReactComponent as BaseLogo } from 'assets/icons/l2/base.svg';
import { ReactComponent as LineaLogo } from 'assets/icons/l2/linea.svg';
import { ReactComponent as MantleLogo } from 'assets/icons/l2/mantle.svg';
import { ReactComponent as OptimismLogo } from 'assets/icons/l2/optimism.svg';
import { ReactComponent as PolygonLogo } from 'assets/icons/l2/polygon.svg';
import { ReactComponent as ZkSyncLogo } from 'assets/icons/l2/zk-sync.svg';

import { useUserConfig } from 'config/user-config';
import { CHAINS, L2_CHAINS } from 'consts/chains';
import { MATOMO_CLICK_EVENTS_TYPES } from 'consts/matomo-click-events';
import { WalletCardComponent } from 'shared/wallet/card/types';

import { L2FallbackWalletStyle, TextStyle, ButtonStyle } from './styles';

const l2Logos = {
  [L2_CHAINS.Arbitrum]: ArbitrumLogo,
  [L2_CHAINS.Base]: BaseLogo,
  [L2_CHAINS.Linea]: LineaLogo,
  [L2_CHAINS.Mantle]: MantleLogo,
  [L2_CHAINS.Optimism]: OptimismLogo,
  [L2_CHAINS.Polygon]: PolygonLogo,
  [L2_CHAINS.zkSync]: ZkSyncLogo,
};

const getL2Logo = (chainId: L2_CHAINS) => {
  const SVGLogo = l2Logos[chainId];
  return SVGLogo ? <SVGLogo style={{ marginBottom: '13px' }} /> : null;
};

export const L2Fallback: WalletCardComponent = (props) => {
  const { chainId } = useAccount();
  const { defaultChain } = useUserConfig();

  const defaultChainName = useMemo(() => {
    return CHAINS[defaultChain];
  }, [defaultChain]);

  const l2ChainName = useMemo(() => {
    // Trick. Anyway, this condition is working only SPA starting.
    if (!chainId) return '';

    return L2_CHAINS[chainId];
  }, [chainId]);

  return (
    <L2FallbackWalletStyle {...props}>
      {getL2Logo(chainId as unknown as L2_CHAINS)}
      <TextStyle>
        Learn about Lido on L2 opportunities on {l2ChainName} network or switch
        to Ethereum {defaultChainName} to stake
      </TextStyle>
      <Link
        href={'https://lido.fi/lido-on-l2'}
        data-matomo={MATOMO_CLICK_EVENTS_TYPES.lidoOnL2Opportunities}
      >
        <ButtonStyle size={'xs'}>Lido on L2 opportunities</ButtonStyle>
      </Link>
    </L2FallbackWalletStyle>
  );
};
