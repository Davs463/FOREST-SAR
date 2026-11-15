import { useState } from 'react';
import { BookOpen, Download, ExternalLink, Eye } from 'lucide-react';
import { Modal } from '../../components';
import { APP_CONFIG } from '../../config/app.config';
import { useI18n } from '../../i18n';

// Resolved like the data manifest: relative to the site base, so it works at the root or in a subfolder.
const manualHref = `${import.meta.env.BASE_URL}${APP_CONFIG.userManualPdf}`;
const manualFile = APP_CONFIG.userManualPdf.split('/').pop() ?? 'manual.pdf';

/** Browsers without an inline PDF viewer (e.g. Android Chrome) get open/download actions instead of an empty frame. */
function canShowPdfInline(): boolean {
  if (typeof navigator === 'undefined') return true;
  const flag = (navigator as Navigator & { pdfViewerEnabled?: boolean }).pdfViewerEnabled;
  return flag !== false;
}

/** User manual card + modal PDF viewer with an explicit download action. */
export function ManualViewer() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const inline = canShowPdfInline();

  const download = (
    <a className="btn btn--ghost" href={manualHref} download={manualFile} data-testid="manual-download">
      {t('methodology.manualDownload')} <Download size={14} aria-hidden="true" />
    </a>
  );

  return (
    <section className="meth-section meth-manual" data-testid="method-manual" aria-labelledby="meth-manual-title" data-reveal>
      <span className="meth-manual__icon"><BookOpen size={26} aria-hidden="true" /></span>
      <div className="meth-manual__copy">
        <h2 id="meth-manual-title">{t('methodology.manualTitle')}</h2>
        <p>{t('methodology.manualText')}</p>
        <span className="mono meth-manual__meta">{t('methodology.manualMeta')}</span>
      </div>
      <div className="meth-manual__actions">
        <button type="button" className="btn btn--primary" onClick={() => setOpen(true)} data-testid="manual-open">
          {t('methodology.manualView')} <Eye size={14} aria-hidden="true" />
        </button>
        {download}
      </div>

      <Modal open={open} size="wide" title={t('methodology.manualTitle')} closeLabel={t('common.close')} onClose={() => setOpen(false)}>
        <div className="meth-manual__toolbar">
          {download}
          <a className="btn btn--ghost" href={manualHref} target="_blank" rel="noopener" data-testid="manual-newtab">
            {t('methodology.manualNewTab')} <ExternalLink size={14} aria-hidden="true" />
          </a>
        </div>
        {inline ? (
          <iframe className="meth-manual__frame" src={`${manualHref}#view=FitH`} title={t('methodology.manualTitle')} data-testid="manual-frame" />
        ) : (
          <p className="meth-manual__fallback" data-testid="manual-fallback">{t('methodology.manualNoInline')}</p>
        )}
      </Modal>
    </section>
  );
}
