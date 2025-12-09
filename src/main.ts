import './styles/main.css';
import { chromaService } from './services/chromaService';
import {
  CLIENT_METHODS,
  COLLECTION_MANAGEMENT_METHODS,
  COLLECTION_OPERATIONS_METHODS,
  ApiMethod
} from './api/methods';
import { store } from './store/appStore';
import { toast } from './components/Toast';

// Initialize the application
function init(): void {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <header class="header">
      <div class="header__logo">
        <div class="header__logo-icon">🔮</div>
        <span class="header__logo-text">ChromaDB Playground</span>
      </div>
      <div class="header__status">
        <div class="connection-status" id="connection-status">
          <span class="connection-status__dot" id="connection-dot"></span>
          <span id="connection-text">연결 안됨</span>
        </div>
      </div>
    </header>

    <div class="main-layout">
      <aside class="sidebar" id="sidebar"></aside>
      <main class="main-content" id="main-content"></main>
    </div>
  `;

  renderSidebar();
  renderMainContent();

  store.subscribe((state) => {
    updateConnectionStatus(state.isConnected);
    updateActiveMenuItem(state.currentMethod?.id);
    if (state.currentCollectionName) {
      updateSelectedCollection(state.currentCollectionName);
    }
  });
}

function getMethodIcon(methodId: string): string {
  const icons: Record<string, string> = {
    heartbeat: '❤️', version: '📋', reset: '🔄',
    listCollections: '📚', countCollections: '🔢',
    createCollection: '➕', getCollection: '📖', getOrCreateCollection: '📥', deleteCollection: '🗑️',
    add: '➕', upsert: '📝', get: '🔍', query: '🔎', update: '✏️', delete: '🗑️', peek: '👁️', count: '🔢', modify: '⚙️'
  };
  return icons[methodId] || '📌';
}

function renderSidebar(): void {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  sidebar.innerHTML = `
    <div class="sidebar__section">
      <div class="sidebar__title">연결</div>
      <nav class="sidebar__nav">
        <button class="sidebar__item" id="btn-connect">
          <span class="sidebar__item-icon">🔌</span>
          <span>연결 설정</span>
        </button>
      </nav>
    </div>

    <div class="sidebar__section">
      <div class="sidebar__title">Client API</div>
      <nav class="sidebar__nav">
        ${CLIENT_METHODS.map(m => `
          <button class="sidebar__item" data-method="${m.id}">
            <span class="sidebar__item-icon">${getMethodIcon(m.id)}</span>
            <span>${m.name}</span>
          </button>
        `).join('')}
      </nav>
    </div>

    <div class="sidebar__section">
      <div class="sidebar__title">Collection 관리</div>
      <nav class="sidebar__nav">
        ${COLLECTION_MANAGEMENT_METHODS.map(m => `
          <button class="sidebar__item" data-method="${m.id}">
            <span class="sidebar__item-icon">${getMethodIcon(m.id)}</span>
            <span>${m.name}</span>
          </button>
        `).join('')}
      </nav>
    </div>

    <div class="sidebar__section">
      <div class="sidebar__title">Collection 작업</div>
      <div class="collection-selector mb-md">
        <select class="form-input form-input--mono" id="select-collection" disabled>
          <option value="">컬렉션 선택</option>
        </select>
      </div>
      <nav class="sidebar__nav">
        ${COLLECTION_OPERATIONS_METHODS.map(m => `
          <button class="sidebar__item" data-method="${m.id}">
            <span class="sidebar__item-icon">${getMethodIcon(m.id)}</span>
            <span>${m.name}</span>
          </button>
        `).join('')}
      </nav>
    </div>
  `;

  document.getElementById('btn-connect')?.addEventListener('click', showConnectionPanel);

  document.querySelectorAll('[data-method]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const methodId = (e.currentTarget as HTMLElement).dataset.method;
      if (methodId) {
        const method = [...CLIENT_METHODS, ...COLLECTION_MANAGEMENT_METHODS, ...COLLECTION_OPERATIONS_METHODS].find(m => m.id === methodId);
        if (method) {
          store.selectMethod(method);
          renderApiPanel(method);
        }
      }
    });
  });

  document.getElementById('select-collection')?.addEventListener('change', async (e) => {
    const name = (e.target as HTMLSelectElement).value;
    if (name) {
      const result = await chromaService.selectCollection(name);
      if (result.success) {
        store.setCurrentCollection(name);
        toast.success('컬렉션 선택됨', name);
      } else {
        toast.error('선택 실패', result.error);
      }
    }
  });
}

function renderMainContent(): void {
  showConnectionPanel();
}

function showConnectionPanel(): void {
  const content = document.getElementById('main-content');
  if (!content) return;

  const state = store.getState();
  const savedTenant = localStorage.getItem('chromadb_tenant') || 'default_tenant';
  const savedDatabase = localStorage.getItem('chromadb_database') || 'default_database';

  content.innerHTML = `
    <div class="panel">
      <div class="panel__header">
        <h2 class="panel__title"><span>🔌</span> ChromaDB 연결</h2>
        ${state.isConnected ? '<span class="badge badge--success">연결됨</span>' : ''}
      </div>
      <div class="panel__content">
        <div class="grid grid--2 gap-lg">
          <div class="form-group">
            <label class="form-label">Tenant</label>
            <input type="text" class="form-input form-input--mono" id="input-tenant" value="${savedTenant}">
          </div>
          <div class="form-group">
            <label class="form-label">Database</label>
            <input type="text" class="form-input form-input--mono" id="input-database" value="${savedDatabase}">
          </div>
        </div>
        <div class="form-group mt-md">
          <label class="form-label">Auth Token <span class="text-muted text-sm">(선택)</span></label>
          <input type="password" class="form-input form-input--mono" id="input-auth" placeholder="인증 토큰">
        </div>
        <div class="flex gap-md mt-lg">
          <button class="btn btn--primary btn--lg" id="btn-do-connect">${state.isConnected ? '재연결' : '연결'}</button>
          ${state.isConnected ? '<button class="btn btn--secondary btn--lg" id="btn-disconnect">연결 해제</button>' : ''}
        </div>
      </div>
    </div>
    ${state.isConnected ? `
      <div class="panel mt-lg">
        <div class="panel__header">
          <h3 class="panel__title"><span>📚</span> 컬렉션 목록</h3>
          <button class="btn btn--secondary btn--sm" id="btn-refresh-collections">🔄 새로고침</button>
        </div>
        <div class="panel__content" id="collections-list">
          <div class="empty-state"><div class="spinner"></div><p class="mt-md">로딩 중...</p></div>
        </div>
      </div>
    ` : `
      <div class="panel mt-lg">
        <div class="panel__header"><h3 class="panel__title"><span>💡</span> 시작하기</h3></div>
        <div class="panel__content">
          <ol style="line-height: 2; color: var(--text-secondary);">
            <li>ChromaDB 서버 실행 확인</li>
            <li>연결 버튼 클릭</li>
            <li>사이드바에서 API 선택</li>
          </ol>
        </div>
      </div>
    `}
  `;

  document.getElementById('btn-do-connect')?.addEventListener('click', handleConnect);
  document.getElementById('btn-disconnect')?.addEventListener('click', handleDisconnect);
  document.getElementById('btn-refresh-collections')?.addEventListener('click', handleRefreshCollections);

  if (state.isConnected) loadCollectionsList();
}

async function handleConnect(): Promise<void> {
  const tenant = (document.getElementById('input-tenant') as HTMLInputElement)?.value || 'default_tenant';
  const database = (document.getElementById('input-database') as HTMLInputElement)?.value || 'default_database';
  const authToken = (document.getElementById('input-auth') as HTMLInputElement)?.value;

  localStorage.setItem('chromadb_tenant', tenant);
  localStorage.setItem('chromadb_database', database);

  const btn = document.getElementById('btn-do-connect') as HTMLButtonElement;
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> 연결 중...'; }

  const result = await chromaService.connect({ tenant, database, authToken });

  if (result.success) {
    toast.success('연결 성공', 'ChromaDB에 연결되었습니다.');
    showConnectionPanel();
  } else {
    toast.error('연결 실패', result.error);
  }

  if (btn) { btn.disabled = false; btn.textContent = store.getState().isConnected ? '재연결' : '연결'; }
}

function handleDisconnect(): void {
  chromaService.disconnect();
  toast.info('연결 해제됨');
  showConnectionPanel();
}

async function handleRefreshCollections(): Promise<void> {
  await store.refreshCollections();
  loadCollectionsList();
}

async function loadCollectionsList(): Promise<void> {
  const container = document.getElementById('collections-list');
  if (!container) return;

  const result = await chromaService.listCollections();

  if (!result.success) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state__icon">❌</div><div class="empty-state__title">로드 실패</div><div class="empty-state__description">${result.error}</div></div>`;
    return;
  }

  const collections = result.data || [];

  if (collections.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state__icon">📭</div><div class="empty-state__title">컬렉션 없음</div></div>`;
  } else {
    container.innerHTML = `<div class="grid grid--3 gap-md">${collections.map(c => `
      <div class="collection-card" data-collection="${c.name}">
        <div class="collection-card__name">${c.name}</div>
        <div class="collection-card__meta">${c.metadata ? JSON.stringify(c.metadata).substring(0, 50) : 'No metadata'}</div>
      </div>
    `).join('')}</div>`;

    container.querySelectorAll('.collection-card').forEach(card => {
      card.addEventListener('click', async (e) => {
        const name = (e.currentTarget as HTMLElement).dataset.collection;
        if (name) {
          const result = await chromaService.selectCollection(name);
          if (result.success) {
            store.setCurrentCollection(name);
            updateSelectedCollection(name);
            toast.success('컬렉션 선택됨', name);
          }
        }
      });
    });
  }

  updateCollectionSelector(collections.map(c => c.name));
}

function updateCollectionSelector(collections: string[]): void {
  const select = document.getElementById('select-collection') as HTMLSelectElement;
  if (!select) return;
  select.disabled = collections.length === 0;
  select.innerHTML = `<option value="">컬렉션 선택...</option>${collections.map(name => `<option value="${name}">${name}</option>`).join('')}`;
  const current = store.getState().currentCollectionName;
  if (current && collections.includes(current)) select.value = current;
}

function updateSelectedCollection(name: string): void {
  document.querySelectorAll('.collection-card').forEach(card => {
    card.classList.toggle('active', card.getAttribute('data-collection') === name);
  });
  const select = document.getElementById('select-collection') as HTMLSelectElement;
  if (select) select.value = name;
}

function renderApiPanel(method: ApiMethod): void {
  const content = document.getElementById('main-content');
  if (!content) return;

  const state = store.getState();

  content.innerHTML = `
    <div class="panel">
      <div class="panel__header">
        <h2 class="panel__title"><span>${getMethodIcon(method.id)}</span> ${method.name}()</h2>
        <span class="badge">${method.category}</span>
      </div>
      <div class="panel__content">
        <p class="text-secondary mb-lg">${method.description}</p>
        ${method.requiresCollection ? `
          <div class="form-group mb-lg" style="background: var(--warning-bg); padding: var(--spacing-md); border-radius: var(--radius-md); border: 1px solid var(--warning);">
            <div class="flex gap-sm" style="align-items: center;">
              <span>⚠️</span><span>컬렉션 선택 필요</span>
              ${state.currentCollectionName ? `<span class="badge badge--success">현재: ${state.currentCollectionName}</span>` : '<span class="badge badge--error">선택 안됨</span>'}
            </div>
          </div>
        ` : ''}
        ${method.parameters.length > 0 ? `
          <div class="mb-lg">
            <h4 class="text-sm text-muted mb-sm">파라미터</h4>
            <table style="width: 100%; font-size: 0.875rem;">
              <thead><tr style="text-align: left; color: var(--text-muted);"><th style="padding: 8px;">이름</th><th style="padding: 8px;">타입</th><th style="padding: 8px;">필수</th><th style="padding: 8px;">설명</th></tr></thead>
              <tbody>${method.parameters.map(p => `<tr style="border-top: 1px solid var(--border-primary);"><td style="padding: 8px;"><code class="text-mono">${p.name}</code></td><td style="padding: 8px;"><span class="badge">${p.type}</span></td><td style="padding: 8px;">${p.required ? '✓' : '-'}</td><td style="padding: 8px; color: var(--text-secondary);">${p.description}</td></tr>`).join('')}</tbody>
            </table>
          </div>
        ` : ''}
        <div class="json-editor">
          <div class="json-editor__header">
            <span class="json-editor__title">Request Parameters (JSON)</span>
            <div class="json-editor__actions">
              <button class="btn btn--secondary btn--sm" id="btn-format">Format</button>
              <button class="btn btn--secondary btn--sm" id="btn-reset">Reset</button>
            </div>
          </div>
          <textarea class="json-editor__textarea" id="param-editor" placeholder="{}" spellcheck="false">${JSON.stringify(method.example, null, 2)}</textarea>
        </div>
        <div class="flex gap-md mt-lg">
          <button class="btn btn--primary btn--lg" id="btn-execute" ${!state.isConnected ? 'disabled' : ''}>▶ 실행</button>
          ${!state.isConnected ? '<span class="text-muted text-sm">연결이 필요합니다</span>' : ''}
        </div>
      </div>
    </div>
    <div class="panel mt-lg" id="result-panel" style="${state.lastResult ? '' : 'display: none;'}">
      <div class="panel__header">
        <h3 class="panel__title"><span>📤</span> Response</h3>
        <div class="flex gap-md"><span id="result-status" class="result-viewer__status"></span><span id="result-time" class="result-viewer__time"></span></div>
      </div>
      <div class="result-viewer">
        <div class="result-viewer__header"><span class="text-muted text-sm">Output</span><button class="btn btn--secondary btn--sm" id="btn-copy">📋 Copy</button></div>
        <pre class="result-viewer__content" id="result-content"></pre>
      </div>
    </div>
  `;

  document.getElementById('btn-format')?.addEventListener('click', () => formatJson());
  document.getElementById('btn-reset')?.addEventListener('click', () => resetJson(method));
  document.getElementById('btn-execute')?.addEventListener('click', () => executeMethod(method));
  document.getElementById('btn-copy')?.addEventListener('click', () => copyResult());
  document.getElementById('param-editor')?.addEventListener('input', (e) => store.setParameterJson((e.target as HTMLTextAreaElement).value));

  if (state.lastResult) renderResult(state.lastResult);
}

function formatJson(): void {
  const editor = document.getElementById('param-editor') as HTMLTextAreaElement;
  if (!editor) return;
  try {
    editor.value = JSON.stringify(JSON.parse(editor.value), null, 2);
    store.setParameterJson(editor.value);
  } catch { toast.error('JSON 형식 오류'); }
}

function resetJson(method: ApiMethod): void {
  const editor = document.getElementById('param-editor') as HTMLTextAreaElement;
  if (!editor) return;
  editor.value = JSON.stringify(method.example, null, 2);
  store.setParameterJson(editor.value);
}

async function executeMethod(method: ApiMethod): Promise<void> {
  const editor = document.getElementById('param-editor') as HTMLTextAreaElement;
  const btn = document.getElementById('btn-execute') as HTMLButtonElement;
  if (!editor || !btn) return;

  if (method.requiresCollection && !store.getState().currentCollectionName) {
    toast.error('컬렉션 필요', '먼저 컬렉션을 선택하세요.');
    return;
  }

  let params: Record<string, unknown>;
  try { params = JSON.parse(editor.value || '{}'); } catch { toast.error('JSON 형식 오류'); return; }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> 실행 중...';
  store.setExecuting(true);

  const result = await chromaService.executeMethod(method.id, params);
  store.setResult(result);
  renderResult(result);

  if (['createCollection', 'deleteCollection', 'getOrCreateCollection', 'reset'].includes(method.id)) {
    await store.refreshCollections();
    updateCollectionSelector(store.getState().collections);
  }

  btn.disabled = false;
  btn.innerHTML = '▶ 실행';

  if (result.success) toast.success('실행 완료', `${result.duration}ms`);
  else toast.error('실행 실패', result.error);
}

function renderResult(result: { success: boolean; data?: unknown; error?: string; duration: number }): void {
  const panel = document.getElementById('result-panel');
  const statusEl = document.getElementById('result-status');
  const timeEl = document.getElementById('result-time');
  const contentEl = document.getElementById('result-content');
  if (!panel || !statusEl || !timeEl || !contentEl) return;

  panel.style.display = '';
  statusEl.className = `result-viewer__status result-viewer__status--${result.success ? 'success' : 'error'}`;
  statusEl.innerHTML = result.success ? '✓ Success' : '✕ Error';
  timeEl.textContent = `${result.duration}ms`;
  contentEl.textContent = JSON.stringify(result.success ? result.data : { error: result.error }, null, 2);
}

function copyResult(): void {
  const contentEl = document.getElementById('result-content');
  if (!contentEl) return;
  navigator.clipboard.writeText(contentEl.textContent || '').then(() => toast.success('복사됨')).catch(() => toast.error('복사 실패'));
}

function updateConnectionStatus(connected: boolean): void {
  const dot = document.getElementById('connection-dot');
  const text = document.getElementById('connection-text');
  if (dot) dot.classList.toggle('connected', connected);
  if (text) text.textContent = connected ? '연결됨' : '연결 안됨';
}

function updateActiveMenuItem(methodId?: string): void {
  document.querySelectorAll('[data-method]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-method') === methodId);
  });
}

document.addEventListener('DOMContentLoaded', init);
