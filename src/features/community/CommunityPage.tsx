import { ErrorBoundary } from '../../components';
import { useI18n } from '../../i18n';
import { CommunityHub } from './CommunityHub';

/** Community route: persistent demo banner + isolated hub (a failure here never affects the shell). */
export function CommunityPage() {
  const { t } = useI18n();
  return (
    <>
      <p className="banner" role="note"><strong>{t('community.demoBanner')}</strong><span>{t('community.demoBannerHint')}</span></p>
      <ErrorBoundary title={t('community.errorTitle')}>
        <CommunityHub />
      </ErrorBoundary>
    </>
  );
}

export default CommunityPage;
