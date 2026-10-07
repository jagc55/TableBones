import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface GameStageFrameProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export const GameStageFrame: React.FC<GameStageFrameProps> = ({
  children,
  className = 'game-stage-iframe',
  title = 'TableBones Game Stage',
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const mountContainerRef = useRef<HTMLDivElement | null>(null);
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  const updateIframeHeight = useCallback(() => {
    const iframe = iframeRef.current;
    const container = mountContainerRef.current;
    if (!iframe || !container) return;

    // Use highest of offsetHeight, scrollHeight, or getBoundingClientRect
    const rect = container.getBoundingClientRect();
    const targetHeight = Math.ceil(
      Math.max(rect.height, container.scrollHeight, container.offsetHeight, 720)
    );

    if (targetHeight > 0 && iframe.style.height !== `${targetHeight}px`) {
      iframe.style.height = `${targetHeight}px`;
    }
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const setupIframe = () => {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;

      if (!doc.body) {
        doc.open();
        doc.write('<!DOCTYPE html><html><head></head><body></body></html>');
        doc.close();
      }

      // Sync document theme classes and attributes
      doc.documentElement.className = document.documentElement.className;
      const theme = document.documentElement.getAttribute('data-theme');
      if (theme) {
        doc.documentElement.setAttribute('data-theme', theme);
      } else {
        doc.documentElement.removeAttribute('data-theme');
      }
      doc.body.className = document.body.className;

      // Copy stylesheet links, font preconnects, and style tags from parent document
      const iframeHead = doc.head;
      iframeHead.querySelectorAll('[data-cloned="true"]').forEach((el) => el.remove());

      document
        .querySelectorAll('link[rel="stylesheet"], link[rel="preconnect"], style')
        .forEach((node) => {
          // Do not copy styles that are already inside this iframe
          if (iframe.contains(node)) return;
          const clone = node.cloneNode(true) as HTMLElement;
          clone.setAttribute('data-cloned', 'true');
          iframeHead.appendChild(clone);
        });

      // Inject base frame CSS
      const frameStyles = doc.createElement('style');
      frameStyles.setAttribute('data-cloned', 'true');
      frameStyles.textContent = `
        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          height: auto;
          min-height: 0;
          background: transparent;
          color: var(--color-text-main);
          font-family: var(--font-body), var(--font-comic-fredoka), system-ui, sans-serif;
          overflow: hidden;
        }
        * {
          box-sizing: border-box;
        }
        .arena-center-stage {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
          min-width: 0;
        }
      `;
      iframeHead.appendChild(frameStyles);

      // Create dedicated inner root container to match parent .arena-center-stage
      let rootEl = doc.getElementById('game-frame-root') as HTMLDivElement | null;
      if (!rootEl) {
        rootEl = doc.createElement('div');
        rootEl.id = 'game-frame-root';
        rootEl.className = 'arena-center-stage';
        rootEl.style.width = '100%';
        rootEl.style.minWidth = '0';
        doc.body.appendChild(rootEl);
      }

      mountContainerRef.current = rootEl;
      setMountNode(rootEl);
      updateIframeHeight();
    };

    if (iframe.contentDocument?.readyState === 'complete') {
      setupIframe();
    } else {
      iframe.addEventListener('load', setupIframe);
      setupIframe();
    }

    // Sync theme dynamically when day/night toggle or theme changes
    const themeObserver = new MutationObserver(() => {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.documentElement.className = document.documentElement.className;
        const theme = document.documentElement.getAttribute('data-theme');
        if (theme) {
          doc.documentElement.setAttribute('data-theme', theme);
        } else {
          doc.documentElement.removeAttribute('data-theme');
        }
        doc.body.className = document.body.className;
      }
    });

    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });

    // Observe document head for newly injected Vite / Tailwind styles
    const headObserver = new MutationObserver(() => {
      setupIframe();
    });
    headObserver.observe(document.head, { childList: true });

    return () => {
      iframe.removeEventListener('load', setupIframe);
      themeObserver.disconnect();
      headObserver.disconnect();
    };
  }, [updateIframeHeight]);

  // Height observer on the mounted container
  useEffect(() => {
    const container = mountContainerRef.current;
    if (!container) return;

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updateIframeHeight();
      });
      resizeObserver.observe(container);
    }

    // Mutation observer for cards, active trick updates and DOM changes
    const mutationObserver = new MutationObserver(() => {
      updateIframeHeight();
    });
    mutationObserver.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    // Initial check
    updateIframeHeight();
    const timer = setTimeout(updateIframeHeight, 100);

    return () => {
      clearTimeout(timer);
      if (resizeObserver) resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [mountNode, updateIframeHeight]);

  return (
    <iframe
      ref={iframeRef}
      title={title}
      className={className}
      scrolling="no"
      style={{
        width: '100%',
        minHeight: '720px',
        border: 'none',
        display: 'block',
        background: 'transparent',
        overflow: 'hidden',
      }}
    >
      {mountNode && createPortal(children, mountNode)}
    </iframe>
  );
};
