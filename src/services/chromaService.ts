// ChromaDB REST API v2 service - Browser compatible (Proxy mode)

export interface ConnectionConfig {
    tenant?: string;
    database?: string;
    authToken?: string;
}

export interface ApiResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    duration: number;
}

export interface ChromaCollection {
    id: string;
    name: string;
    metadata?: Record<string, unknown>;
}

class ChromaService {
    private config: ConnectionConfig = {
        tenant: 'default_tenant',
        database: 'default_database'
    };

    private currentCollection: ChromaCollection | null = null;
    private _isConnected = false;
    private _connectionListeners: ((connected: boolean) => void)[] = [];

    get isConnected(): boolean {
        return this._isConnected;
    }

    get currentCollectionName(): string | null {
        return this.currentCollection?.name || null;
    }

    get currentCollectionId(): string | null {
        return this.currentCollection?.id || null;
    }

    onConnectionChange(listener: (connected: boolean) => void): () => void {
        this._connectionListeners.push(listener);
        return () => {
            this._connectionListeners = this._connectionListeners.filter(l => l !== listener);
        };
    }

    private notifyConnectionChange(connected: boolean): void {
        this._isConnected = connected;
        this._connectionListeners.forEach(l => l(connected));
    }

    private get tenantDatabase(): { tenant: string; database: string } {
        return {
            tenant: this.config.tenant || 'default_tenant',
            database: this.config.database || 'default_database'
        };
    }

    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...((options.headers as Record<string, string>) || {})
        };

        if (this.config.authToken) {
            headers['Authorization'] = `Bearer ${this.config.authToken}`;
        }

        // 항상 상대 경로 사용 (Nginx 프록시 경유)
        const response = await fetch(endpoint, { ...options, headers });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage: string;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.detail || errorJson.message || errorText;
            } catch {
                errorMessage = errorText || `HTTP ${response.status}`;
            }
            throw new Error(errorMessage);
        }

        const text = await response.text();
        if (!text) return undefined as T;
        return JSON.parse(text);
    }

    private async execute<T>(fn: () => Promise<T>): Promise<ApiResult<T>> {
        const start = performance.now();
        try {
            const data = await fn();
            const duration = Math.round(performance.now() - start);
            return { success: true, data, duration };
        } catch (error) {
            const duration = Math.round(performance.now() - start);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return { success: false, error: errorMessage, duration };
        }
    }

    async connect(config: Partial<ConnectionConfig> = {}): Promise<ApiResult<boolean>> {
        this.config = { ...this.config, ...config };
        return this.execute(async () => {
            await this.request<{ nanosecond_heartbeat: number }>('/api/v2/heartbeat');
            this.notifyConnectionChange(true);
            return true;
        });
    }

    disconnect(): void {
        this.currentCollection = null;
        this.notifyConnectionChange(false);
    }

    async heartbeat(): Promise<ApiResult<{ nanosecond_heartbeat: number }>> {
        return this.execute(() => this.request<{ nanosecond_heartbeat: number }>('/api/v2/heartbeat'));
    }

    async version(): Promise<ApiResult<string>> {
        return this.execute(() => this.request<string>('/api/v2/version'));
    }

    async reset(): Promise<ApiResult<boolean>> {
        return this.execute(async () => {
            await this.request('/api/v2/reset', { method: 'POST' });
            this.currentCollection = null;
            return true;
        });
    }

    async listCollections(params: { limit?: number; offset?: number } = {}): Promise<ApiResult<ChromaCollection[]>> {
        const { tenant, database } = this.tenantDatabase;
        const queryParams = new URLSearchParams();
        if (params.limit) queryParams.set('limit', String(params.limit));
        if (params.offset) queryParams.set('offset', String(params.offset));
        const query = queryParams.toString() ? `?${queryParams}` : '';
        return this.execute(() => this.request<ChromaCollection[]>(`/api/v2/tenants/${tenant}/databases/${database}/collections${query}`));
    }

    async countCollections(): Promise<ApiResult<number>> {
        const { tenant, database } = this.tenantDatabase;
        return this.execute(() => this.request<number>(`/api/v2/tenants/${tenant}/databases/${database}/count_collections`));
    }

    async createCollection(params: { name: string; metadata?: Record<string, unknown> }): Promise<ApiResult<ChromaCollection>> {
        const { tenant, database } = this.tenantDatabase;
        return this.execute(async () => {
            const collection = await this.request<ChromaCollection>(`/api/v2/tenants/${tenant}/databases/${database}/collections`, {
                method: 'POST',
                body: JSON.stringify({ name: params.name, metadata: params.metadata || {}, get_or_create: false })
            });
            this.currentCollection = collection;
            return collection;
        });
    }

    async getCollection(params: { name: string }): Promise<ApiResult<ChromaCollection>> {
        const { tenant, database } = this.tenantDatabase;
        return this.execute(async () => {
            const collection = await this.request<ChromaCollection>(`/api/v2/tenants/${tenant}/databases/${database}/collections/${params.name}`);
            this.currentCollection = collection;
            return collection;
        });
    }

    async getOrCreateCollection(params: { name: string; metadata?: Record<string, unknown> }): Promise<ApiResult<ChromaCollection>> {
        const { tenant, database } = this.tenantDatabase;
        return this.execute(async () => {
            const collection = await this.request<ChromaCollection>(`/api/v2/tenants/${tenant}/databases/${database}/collections`, {
                method: 'POST',
                body: JSON.stringify({ name: params.name, metadata: params.metadata || {}, get_or_create: true })
            });
            this.currentCollection = collection;
            return collection;
        });
    }

    async deleteCollection(params: { name: string }): Promise<ApiResult<void>> {
        const { tenant, database } = this.tenantDatabase;
        return this.execute(async () => {
            await this.request(`/api/v2/tenants/${tenant}/databases/${database}/collections/${params.name}`, { method: 'DELETE' });
            if (this.currentCollection?.name === params.name) {
                this.currentCollection = null;
            }
        });
    }

    async selectCollection(name: string): Promise<ApiResult<ChromaCollection>> {
        return this.getCollection({ name });
    }

    private ensureCollection(): string {
        if (!this.currentCollection?.id) {
            throw new Error('No collection selected. Please select or create a collection first.');
        }
        return this.currentCollection.id;
    }

    async add(params: { ids: string[]; documents?: string[]; embeddings?: number[][]; metadatas?: Record<string, unknown>[] }): Promise<ApiResult<boolean>> {
        const collectionId = this.ensureCollection();
        return this.execute(async () => {
            await this.request(`/api/v2/collections/${collectionId}/add`, {
                method: 'POST',
                body: JSON.stringify({ ids: params.ids, documents: params.documents, embeddings: params.embeddings, metadatas: params.metadatas })
            });
            return true;
        });
    }

    async upsert(params: { ids: string[]; documents?: string[]; embeddings?: number[][]; metadatas?: Record<string, unknown>[] }): Promise<ApiResult<boolean>> {
        const collectionId = this.ensureCollection();
        return this.execute(async () => {
            await this.request(`/api/v2/collections/${collectionId}/upsert`, {
                method: 'POST',
                body: JSON.stringify({ ids: params.ids, documents: params.documents, embeddings: params.embeddings, metadatas: params.metadatas })
            });
            return true;
        });
    }

    async get(params: { ids?: string[]; where?: Record<string, unknown>; whereDocument?: Record<string, unknown>; limit?: number; offset?: number; include?: string[] } = {}): Promise<ApiResult<{ ids: string[]; embeddings?: number[][] | null; documents?: (string | null)[] | null; metadatas?: (Record<string, unknown> | null)[] | null }>> {
        const collectionId = this.ensureCollection();
        return this.execute(() => this.request(`/api/v2/collections/${collectionId}/get`, {
            method: 'POST',
            body: JSON.stringify({ ids: params.ids, where: params.where, where_document: params.whereDocument, limit: params.limit, offset: params.offset, include: params.include || ['documents', 'metadatas'] })
        }));
    }

    async query(params: { queryTexts?: string[]; queryEmbeddings?: number[][]; nResults?: number; where?: Record<string, unknown>; whereDocument?: Record<string, unknown>; include?: string[] }): Promise<ApiResult<{ ids: string[][]; embeddings?: number[][][] | null; documents?: (string | null)[][] | null; metadatas?: (Record<string, unknown> | null)[][] | null; distances?: number[][] | null }>> {
        const collectionId = this.ensureCollection();
        return this.execute(() => this.request(`/api/v2/collections/${collectionId}/query`, {
            method: 'POST',
            body: JSON.stringify({ query_texts: params.queryTexts, query_embeddings: params.queryEmbeddings, n_results: params.nResults || 10, where: params.where, where_document: params.whereDocument, include: params.include || ['documents', 'metadatas', 'distances'] })
        }));
    }

    async update(params: { ids: string[]; documents?: string[]; embeddings?: number[][]; metadatas?: Record<string, unknown>[] }): Promise<ApiResult<boolean>> {
        const collectionId = this.ensureCollection();
        return this.execute(async () => {
            await this.request(`/api/v2/collections/${collectionId}/update`, {
                method: 'POST',
                body: JSON.stringify({ ids: params.ids, documents: params.documents, embeddings: params.embeddings, metadatas: params.metadatas })
            });
            return true;
        });
    }

    async delete(params: { ids?: string[]; where?: Record<string, unknown>; whereDocument?: Record<string, unknown> } = {}): Promise<ApiResult<string[]>> {
        const collectionId = this.ensureCollection();
        return this.execute(() => this.request(`/api/v2/collections/${collectionId}/delete`, {
            method: 'POST',
            body: JSON.stringify({ ids: params.ids, where: params.where, where_document: params.whereDocument })
        }));
    }

    async peek(params: { limit?: number } = {}): Promise<ApiResult<{ ids: string[]; embeddings?: number[][] | null; documents?: (string | null)[] | null; metadatas?: (Record<string, unknown> | null)[] | null }>> {
        const collectionId = this.ensureCollection();
        return this.execute(() => this.request(`/api/v2/collections/${collectionId}/get`, {
            method: 'POST',
            body: JSON.stringify({ limit: params.limit || 10, include: ['documents', 'metadatas'] })
        }));
    }

    async count(): Promise<ApiResult<number>> {
        const collectionId = this.ensureCollection();
        return this.execute(() => this.request<number>(`/api/v2/collections/${collectionId}/count`));
    }

    async modify(params: { name?: string; metadata?: Record<string, unknown> }): Promise<ApiResult<void>> {
        const collectionId = this.ensureCollection();
        return this.execute(async () => {
            await this.request(`/api/v2/collections/${collectionId}`, {
                method: 'PUT',
                body: JSON.stringify({ new_name: params.name, new_metadata: params.metadata })
            });
            if (params.name && this.currentCollection) {
                this.currentCollection.name = params.name;
            }
            if (params.metadata && this.currentCollection) {
                this.currentCollection.metadata = params.metadata;
            }
        });
    }

    async executeMethod(methodId: string, params: Record<string, unknown>): Promise<ApiResult<unknown>> {
        switch (methodId) {
            case 'heartbeat': return this.heartbeat();
            case 'version': return this.version();
            case 'reset': return this.reset();
            case 'listCollections': return this.listCollections(params as { limit?: number; offset?: number });
            case 'countCollections': return this.countCollections();
            case 'createCollection': return this.createCollection(params as { name: string; metadata?: Record<string, unknown> });
            case 'getCollection': return this.getCollection(params as { name: string });
            case 'getOrCreateCollection': return this.getOrCreateCollection(params as { name: string; metadata?: Record<string, unknown> });
            case 'deleteCollection': return this.deleteCollection(params as { name: string });
            case 'add': return this.add(params as { ids: string[]; documents?: string[]; embeddings?: number[][]; metadatas?: Record<string, unknown>[] });
            case 'upsert': return this.upsert(params as { ids: string[]; documents?: string[]; embeddings?: number[][]; metadatas?: Record<string, unknown>[] });
            case 'get': return this.get(params as { ids?: string[]; where?: Record<string, unknown>; limit?: number; offset?: number; include?: string[] });
            case 'query': return this.query(params as { queryTexts?: string[]; queryEmbeddings?: number[][]; nResults?: number; where?: Record<string, unknown>; include?: string[] });
            case 'update': return this.update(params as { ids: string[]; documents?: string[]; embeddings?: number[][]; metadatas?: Record<string, unknown>[] });
            case 'delete': return this.delete(params as { ids?: string[]; where?: Record<string, unknown> });
            case 'peek': return this.peek(params as { limit?: number });
            case 'count': return this.count();
            case 'modify': return this.modify(params as { name?: string; metadata?: Record<string, unknown> });
            default: return { success: false, error: `Unknown method: ${methodId}`, duration: 0 };
        }
    }
}

export const chromaService = new ChromaService();
