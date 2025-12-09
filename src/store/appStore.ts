// State management for the application

import { chromaService } from '../services/chromaService';
import { ApiMethod, ALL_METHODS } from '../api/methods';

export interface AppState {
    isConnected: boolean;
    currentMethod: ApiMethod | null;
    currentCollectionName: string | null;
    collections: string[];
    parameterJson: string;
    lastResult: {
        success: boolean;
        data?: unknown;
        error?: string;
        duration: number;
    } | null;
    isExecuting: boolean;
}

type StateListener = (state: AppState) => void;

class AppStore {
    private state: AppState = {
        isConnected: false,
        currentMethod: ALL_METHODS[0], // Default to heartbeat
        currentCollectionName: null,
        collections: [],
        parameterJson: '{}',
        lastResult: null,
        isExecuting: false
    };

    private listeners: StateListener[] = [];

    constructor() {
        // Listen for connection changes from ChromaService
        chromaService.onConnectionChange((connected) => {
            this.setState({ isConnected: connected });
            if (connected) {
                this.refreshCollections();
            }
        });
    }

    getState(): AppState {
        return { ...this.state };
    }

    subscribe(listener: StateListener): () => void {
        this.listeners.push(listener);
        // Immediately call with current state
        listener(this.getState());
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private setState(partial: Partial<AppState>): void {
        this.state = { ...this.state, ...partial };
        this.listeners.forEach(l => l(this.getState()));
    }

    selectMethod(method: ApiMethod): void {
        const example = JSON.stringify(method.example, null, 2);
        this.setState({
            currentMethod: method,
            parameterJson: example,
            lastResult: null
        });
    }

    setParameterJson(json: string): void {
        this.setState({ parameterJson: json });
    }

    setResult(result: AppState['lastResult']): void {
        this.setState({ lastResult: result, isExecuting: false });
    }

    setExecuting(executing: boolean): void {
        this.setState({ isExecuting: executing });
    }

    async refreshCollections(): Promise<void> {
        if (!this.state.isConnected) return;

        try {
            const result = await chromaService.listCollections();
            if (result.success && result.data) {
                const names = result.data.map(c => c.name);
                this.setState({
                    collections: names,
                    currentCollectionName: chromaService.currentCollectionName
                });
            }
        } catch (e) {
            console.error('Failed to refresh collections:', e);
        }
    }

    setCurrentCollection(name: string | null): void {
        this.setState({ currentCollectionName: name });
    }
}

export const store = new AppStore();
