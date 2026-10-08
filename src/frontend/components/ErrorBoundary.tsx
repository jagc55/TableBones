import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReturnToLobby = () => {
    try {
      sessionStorage.clear();
      window.location.href = window.location.pathname;
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-screen">
          <div className="cel-card error-boundary-card">
            <div className="error-icon-box">
              <AlertTriangle size={56} color="#d33833" />
            </div>
            <h1 className="woodcut-title error-boundary-title">GOSH! A FOUL BUST!</h1>
            <p className="error-boundary-msg">
              Something unexpected tripped up the show. Don&apos;t fret, folks — your seat is still warm!
            </p>

            {this.state.error && (
              <details className="error-boundary-details">
                <summary className="error-details-summary">Show stage secrets (Error Details)</summary>
                <pre className="error-details-code">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="error-boundary-actions">
              <button
                type="button"
                className="btn-cel btn-brawl-primary"
                onClick={this.handleReload}
              >
                <RotateCcw size={18} />
                <span>RETRY &amp; RELOAD</span>
              </button>
              <button
                type="button"
                className="btn-cel btn-brawl-neutral"
                onClick={this.handleReturnToLobby}
              >
                <span>RETURN TO LOBBY</span>
              </button>
            </div>
          </div>

          <style>{`
            .error-boundary-screen {
              position: fixed;
              inset: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
              background: rgba(28, 21, 17, 0.85);
              backdrop-filter: blur(4px);
              z-index: 999999;
            }
            .error-boundary-card {
              max-width: 520px;
              width: 100%;
              padding: 32px 24px;
              text-align: center;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 16px;
              background-color: var(--color-glove-ivory, #fdfbf5);
              border: 3px solid var(--color-ink-stroke, #1c1511);
              box-shadow: 6px 6px 0px var(--color-shadow-solid, #1c1511);
              border-radius: 12px;
            }
            .error-icon-box {
              display: flex;
              align-items: center;
              justify-content: center;
              animation: bounce 0.8s ease infinite alternate;
            }
            @keyframes bounce {
              from { transform: translateY(0); }
              to { transform: translateY(-6px); }
            }
            .error-boundary-title {
              font-size: 28px;
              color: var(--color-cuphead-red, #d33833);
              margin: 0;
            }
            .error-boundary-msg {
              font-family: var(--font-body, system-ui);
              font-size: 15px;
              color: var(--color-ink-black, #1c1511);
              line-height: 1.4;
              margin: 0;
            }
            .error-boundary-details {
              width: 100%;
              text-align: left;
              background: #f0e6d2;
              border: 1.5px solid var(--color-ink-stroke, #1c1511);
              border-radius: 6px;
              padding: 8px 12px;
              font-size: 12px;
            }
            .error-details-summary {
              cursor: pointer;
              font-weight: bold;
              font-family: var(--font-heading, sans-serif);
              color: #5c3a21;
            }
            .error-details-code {
              margin-top: 8px;
              padding: 8px;
              background: #2b1e17;
              color: #fdfbf5;
              border-radius: 4px;
              white-space: pre-wrap;
              word-break: break-all;
              max-height: 180px;
              overflow-y: auto;
              font-size: 11px;
            }
            .error-boundary-actions {
              display: flex;
              gap: 12px;
              width: 100%;
              justify-content: center;
              margin-top: 8px;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}
