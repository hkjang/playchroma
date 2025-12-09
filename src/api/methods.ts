// API Method definitions for ChromaDB Client and Collection operations

export interface ApiParameter {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'json';
    required: boolean;
    description: string;
    default?: unknown;
    example?: unknown;
}

export interface ApiMethod {
    id: string;
    name: string;
    description: string;
    category: 'client' | 'collection-management' | 'collection-operations';
    parameters: ApiParameter[];
    example: Record<string, unknown>;
    requiresCollection?: boolean;
}

// Client API Methods
export const CLIENT_METHODS: ApiMethod[] = [
    {
        id: 'heartbeat',
        name: 'heartbeat',
        description: '서버 연결 상태를 확인합니다. 현재 타임스탬프를 반환합니다.',
        category: 'client',
        parameters: [],
        example: {}
    },
    {
        id: 'version',
        name: 'version',
        description: 'ChromaDB 서버 버전 정보를 반환합니다.',
        category: 'client',
        parameters: [],
        example: {}
    },
    {
        id: 'reset',
        name: 'reset',
        description: '⚠️ 데이터베이스의 모든 데이터를 삭제하고 초기화합니다.',
        category: 'client',
        parameters: [],
        example: {}
    },
    {
        id: 'listCollections',
        name: 'listCollections',
        description: '모든 컬렉션 목록을 조회합니다.',
        category: 'client',
        parameters: [
            {
                name: 'limit',
                type: 'number',
                required: false,
                description: '반환할 최대 컬렉션 수',
                example: 10
            },
            {
                name: 'offset',
                type: 'number',
                required: false,
                description: '건너뛸 컬렉션 수 (페이지네이션용)',
                example: 0
            }
        ],
        example: { limit: 10, offset: 0 }
    },
    {
        id: 'countCollections',
        name: 'countCollections',
        description: '전체 컬렉션 개수를 반환합니다.',
        category: 'client',
        parameters: [],
        example: {}
    }
];

// Collection Management Methods
export const COLLECTION_MANAGEMENT_METHODS: ApiMethod[] = [
    {
        id: 'createCollection',
        name: 'createCollection',
        description: '새로운 컬렉션을 생성합니다.',
        category: 'collection-management',
        parameters: [
            {
                name: 'name',
                type: 'string',
                required: true,
                description: '컬렉션 이름 (고유해야 함)',
                example: 'my_collection'
            },
            {
                name: 'metadata',
                type: 'object',
                required: false,
                description: '컬렉션 메타데이터',
                example: { description: 'My test collection' }
            }
        ],
        example: {
            name: 'my_collection',
            metadata: { description: 'My test collection' }
        }
    },
    {
        id: 'getCollection',
        name: 'getCollection',
        description: '이름으로 기존 컬렉션을 조회합니다.',
        category: 'collection-management',
        parameters: [
            {
                name: 'name',
                type: 'string',
                required: true,
                description: '조회할 컬렉션 이름',
                example: 'my_collection'
            }
        ],
        example: { name: 'my_collection' }
    },
    {
        id: 'getOrCreateCollection',
        name: 'getOrCreateCollection',
        description: '컬렉션을 조회하거나, 없으면 새로 생성합니다.',
        category: 'collection-management',
        parameters: [
            {
                name: 'name',
                type: 'string',
                required: true,
                description: '컬렉션 이름',
                example: 'my_collection'
            },
            {
                name: 'metadata',
                type: 'object',
                required: false,
                description: '컬렉션 메타데이터 (생성 시에만 적용)',
                example: { description: 'My collection' }
            }
        ],
        example: {
            name: 'my_collection',
            metadata: { description: 'My collection' }
        }
    },
    {
        id: 'deleteCollection',
        name: 'deleteCollection',
        description: '⚠️ 컬렉션과 모든 데이터를 삭제합니다.',
        category: 'collection-management',
        parameters: [
            {
                name: 'name',
                type: 'string',
                required: true,
                description: '삭제할 컬렉션 이름',
                example: 'my_collection'
            }
        ],
        example: { name: 'my_collection' }
    }
];

// Collection Operations Methods
export const COLLECTION_OPERATIONS_METHODS: ApiMethod[] = [
    {
        id: 'add',
        name: 'add',
        description: '컬렉션에 문서/임베딩을 추가합니다.',
        category: 'collection-operations',
        requiresCollection: true,
        parameters: [
            {
                name: 'ids',
                type: 'array',
                required: true,
                description: '고유 ID 배열',
                example: ['id1', 'id2', 'id3']
            },
            {
                name: 'documents',
                type: 'array',
                required: false,
                description: '문서 텍스트 배열 (임베딩 자동 생성)',
                example: ['Hello world', 'Goodbye world', 'Test document']
            },
            {
                name: 'embeddings',
                type: 'array',
                required: false,
                description: '임베딩 벡터 배열 (직접 지정)',
                example: [[1.0, 2.0, 3.0], [4.0, 5.0, 6.0], [7.0, 8.0, 9.0]]
            },
            {
                name: 'metadatas',
                type: 'array',
                required: false,
                description: '각 문서의 메타데이터 배열',
                example: [{ source: 'doc1' }, { source: 'doc2' }, { source: 'doc3' }]
            }
        ],
        example: {
            ids: ['id1', 'id2', 'id3'],
            documents: ['Hello world', 'Goodbye world', 'Test document'],
            metadatas: [{ source: 'doc1' }, { source: 'doc2' }, { source: 'doc3' }]
        }
    },
    {
        id: 'upsert',
        name: 'upsert',
        description: '문서를 추가하거나 기존 문서를 업데이트합니다.',
        category: 'collection-operations',
        requiresCollection: true,
        parameters: [
            {
                name: 'ids',
                type: 'array',
                required: true,
                description: '고유 ID 배열',
                example: ['id1', 'id2']
            },
            {
                name: 'documents',
                type: 'array',
                required: false,
                description: '문서 텍스트 배열',
                example: ['Updated document 1', 'New document 2']
            },
            {
                name: 'embeddings',
                type: 'array',
                required: false,
                description: '임베딩 벡터 배열',
                example: [[1.0, 2.0, 3.0], [4.0, 5.0, 6.0]]
            },
            {
                name: 'metadatas',
                type: 'array',
                required: false,
                description: '메타데이터 배열',
                example: [{ updated: true }, { new: true }]
            }
        ],
        example: {
            ids: ['id1', 'id2'],
            documents: ['Updated document 1', 'New document 2'],
            metadatas: [{ updated: true }, { new: true }]
        }
    },
    {
        id: 'get',
        name: 'get',
        description: 'ID 또는 필터로 문서를 조회합니다.',
        category: 'collection-operations',
        requiresCollection: true,
        parameters: [
            {
                name: 'ids',
                type: 'array',
                required: false,
                description: '조회할 ID 배열',
                example: ['id1', 'id2']
            },
            {
                name: 'where',
                type: 'object',
                required: false,
                description: '메타데이터 필터 조건',
                example: { source: 'doc1' }
            },
            {
                name: 'whereDocument',
                type: 'object',
                required: false,
                description: '문서 내용 필터 조건',
                example: { '$contains': 'hello' }
            },
            {
                name: 'limit',
                type: 'number',
                required: false,
                description: '반환할 최대 결과 수',
                example: 10
            },
            {
                name: 'offset',
                type: 'number',
                required: false,
                description: '건너뛸 결과 수',
                example: 0
            },
            {
                name: 'include',
                type: 'array',
                required: false,
                description: '포함할 필드들 (embeddings, documents, metadatas)',
                example: ['documents', 'metadatas']
            }
        ],
        example: {
            ids: ['id1', 'id2'],
            include: ['documents', 'metadatas']
        }
    },
    {
        id: 'query',
        name: 'query',
        description: '유사도 검색을 수행합니다.',
        category: 'collection-operations',
        requiresCollection: true,
        parameters: [
            {
                name: 'queryTexts',
                type: 'array',
                required: false,
                description: '검색 쿼리 텍스트 배열',
                example: ['What is the meaning of life?']
            },
            {
                name: 'queryEmbeddings',
                type: 'array',
                required: false,
                description: '검색 쿼리 임베딩 배열',
                example: [[1.0, 2.0, 3.0]]
            },
            {
                name: 'nResults',
                type: 'number',
                required: false,
                description: '반환할 결과 수',
                default: 10,
                example: 5
            },
            {
                name: 'where',
                type: 'object',
                required: false,
                description: '메타데이터 필터',
                example: { category: 'science' }
            },
            {
                name: 'whereDocument',
                type: 'object',
                required: false,
                description: '문서 내용 필터',
                example: { '$contains': 'important' }
            },
            {
                name: 'include',
                type: 'array',
                required: false,
                description: '포함할 필드들',
                example: ['documents', 'metadatas', 'distances']
            }
        ],
        example: {
            queryTexts: ['What is the meaning of life?'],
            nResults: 5,
            include: ['documents', 'metadatas', 'distances']
        }
    },
    {
        id: 'update',
        name: 'update',
        description: '기존 문서를 업데이트합니다.',
        category: 'collection-operations',
        requiresCollection: true,
        parameters: [
            {
                name: 'ids',
                type: 'array',
                required: true,
                description: '업데이트할 ID 배열',
                example: ['id1']
            },
            {
                name: 'documents',
                type: 'array',
                required: false,
                description: '새 문서 텍스트 배열',
                example: ['Updated content']
            },
            {
                name: 'embeddings',
                type: 'array',
                required: false,
                description: '새 임베딩 배열',
                example: [[1.1, 2.2, 3.3]]
            },
            {
                name: 'metadatas',
                type: 'array',
                required: false,
                description: '새 메타데이터 배열',
                example: [{ updated_at: '2024-01-01' }]
            }
        ],
        example: {
            ids: ['id1'],
            documents: ['Updated content'],
            metadatas: [{ updated_at: '2024-01-01' }]
        }
    },
    {
        id: 'delete',
        name: 'delete',
        description: '문서를 삭제합니다.',
        category: 'collection-operations',
        requiresCollection: true,
        parameters: [
            {
                name: 'ids',
                type: 'array',
                required: false,
                description: '삭제할 ID 배열',
                example: ['id1', 'id2']
            },
            {
                name: 'where',
                type: 'object',
                required: false,
                description: '삭제할 문서의 메타데이터 필터',
                example: { status: 'deleted' }
            },
            {
                name: 'whereDocument',
                type: 'object',
                required: false,
                description: '삭제할 문서의 내용 필터',
                example: { '$contains': 'deprecated' }
            }
        ],
        example: {
            ids: ['id1', 'id2']
        }
    },
    {
        id: 'peek',
        name: 'peek',
        description: '컬렉션의 샘플 데이터를 조회합니다.',
        category: 'collection-operations',
        requiresCollection: true,
        parameters: [
            {
                name: 'limit',
                type: 'number',
                required: false,
                description: '조회할 샘플 수',
                default: 10,
                example: 5
            }
        ],
        example: { limit: 5 }
    },
    {
        id: 'count',
        name: 'count',
        description: '컬렉션의 총 문서 수를 반환합니다.',
        category: 'collection-operations',
        requiresCollection: true,
        parameters: [],
        example: {}
    },
    {
        id: 'modify',
        name: 'modify',
        description: '컬렉션의 이름이나 메타데이터를 수정합니다.',
        category: 'collection-operations',
        requiresCollection: true,
        parameters: [
            {
                name: 'name',
                type: 'string',
                required: false,
                description: '새 컬렉션 이름',
                example: 'new_collection_name'
            },
            {
                name: 'metadata',
                type: 'object',
                required: false,
                description: '새 메타데이터',
                example: { description: 'Updated description' }
            }
        ],
        example: {
            metadata: { description: 'Updated description' }
        }
    }
];

// All methods combined
export const ALL_METHODS: ApiMethod[] = [
    ...CLIENT_METHODS,
    ...COLLECTION_MANAGEMENT_METHODS,
    ...COLLECTION_OPERATIONS_METHODS
];

// Get method by ID
export function getMethodById(id: string): ApiMethod | undefined {
    return ALL_METHODS.find(m => m.id === id);
}

// Get methods by category
export function getMethodsByCategory(category: ApiMethod['category']): ApiMethod[] {
    return ALL_METHODS.filter(m => m.category === category);
}
