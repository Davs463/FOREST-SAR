import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useI18n } from '../i18n';
import { Button } from './Button';
import { EmptyState } from './EmptyState';

interface Props {
  children: ReactNode;
  /** Optional heading shown instead of the generic one. */
  title?: string;
  /** Changing this value (e.g. the route path) clears a previous error. */
  resetKey?: string;
}
interface State {
  error: Error | null;
  resetKey?: string;
}

function Fallback({ title, onRetry }: { title?: string; onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <EmptyState
      tone="error"
      title={title ?? t('errors.title')}
      message={t('errors.body')}
      action={<Button variant="secondary" onClick={onRetry}>{t('common.retry')}</Button>}
    />
  );
}

/** Isolates a route or panel: a failure shows a local message and keeps the shell navigable. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (props.resetKey !== state.resetKey) return { error: null, resetKey: props.resetKey };
    return null;
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Section failed:', error, info.componentStack);
  }

  render() {
    if (this.state.error) return <Fallback title={this.props.title} onRetry={() => this.setState({ error: null })} />;
    return this.props.children;
  }
}
