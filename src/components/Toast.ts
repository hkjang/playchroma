// Toast notification component

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastConfig {
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

const ICONS: Record<ToastType, string> = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
};

class ToastManager {
    private container: HTMLElement | null = null;

    private getContainer(): HTMLElement {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
        return this.container;
    }

    show(config: ToastConfig): void {
        const { type, title, message, duration = 4000 } = config;
        const container = this.getContainer();

        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.innerHTML = `
      <span class="toast__icon">${ICONS[type]}</span>
      <div class="toast__content">
        <div class="toast__title">${title}</div>
        ${message ? `<div class="toast__message">${message}</div>` : ''}
      </div>
      <button class="toast__close" aria-label="Close">✕</button>
    `;

        // Close button handler
        const closeBtn = toast.querySelector('.toast__close');
        closeBtn?.addEventListener('click', () => this.remove(toast));

        container.appendChild(toast);

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => this.remove(toast), duration);
        }
    }

    private remove(toast: HTMLElement): void {
        toast.style.animation = 'slideOut 0.3s ease-out forwards';
        toast.style.setProperty('--slide-direction', 'translateX(100%)');

        setTimeout(() => {
            toast.remove();
        }, 300);
    }

    success(title: string, message?: string): void {
        this.show({ type: 'success', title, message });
    }

    error(title: string, message?: string): void {
        this.show({ type: 'error', title, message, duration: 6000 });
    }

    warning(title: string, message?: string): void {
        this.show({ type: 'warning', title, message });
    }

    info(title: string, message?: string): void {
        this.show({ type: 'info', title, message });
    }
}

// Add slideOut animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slideOut {
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

export const toast = new ToastManager();
