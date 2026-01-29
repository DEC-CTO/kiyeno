/**
 * 엑셀 단가표 임포터 모듈
 * - KiyenoExcelDB (별도 IndexedDB) 관리
 * - 엑셀 파싱 (SheetJS)
 * - importedUnitPrices / excelWallTypes CRUD
 *
 * 기존 KiyenoMaterialsDB (v3)와 완전 분리
 */

const ExcelUnitPriceImporter = (function () {
  // ========================================
  // 상수 정의
  // ========================================
  const DB_NAME = 'KiyenoExcelDB';
  const DB_VERSION = 1;
  const STORE_UNIT_PRICES = 'importedUnitPrices';
  const STORE_WALL_TYPES = 'excelWallTypes';

  // 12개 기본 레이어 필드명 (기존 wallTypeMasters와 동일)
  const DEFAULT_LAYER_FIELDS = [
    'layer3_1',   // 좌측마감 Layer3
    'layer2_1',   // 좌측마감 Layer2
    'layer1_1',   // 좌측마감 Layer1
    'column1',    // 구조체
    'infill',     // 단열재
    'layer1_2',   // 우측마감 Layer1
    'layer2_2',   // 우측마감 Layer2
    'layer3_2',   // 우측마감 Layer3
    'column2',    // 옵션1
    'channel',    // 옵션2
    'runner',     // 옵션3
    'steelPlate'  // 옵션4
  ];

  // 엑셀 헤더 매핑 (한글 헤더 → 필드명)
  const HEADER_MAP = {
    '부위': 'location',
    '품명': 'item',
    '품목': 'item',
    '규격': 'spec',
    '단위': 'unit',
    '두께': 'thickness',
    '수량': 'quantity',
    '자재비': 'materialPrice',
    '노무비': 'laborPrice',
    '단가': 'totalPrice',
    '합계': 'totalPrice',
    '자재공종': 'materialWorkType',
    '노무공종': 'laborWorkType'
  };

  // 필수 필드
  const REQUIRED_FIELDS = ['item', 'spec', 'materialPrice', 'laborPrice'];

  // ========================================
  // DB 인스턴스
  // ========================================
  let db = null;
  let isInitialized = false;

  // ========================================
  // Phase 2: IndexedDB 초기화
  // ========================================

  /**
   * KiyenoExcelDB 초기화
   * @returns {Promise<IDBDatabase>}
   */
  async function initDB() {
    if (isInitialized && db) return db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('❌ KiyenoExcelDB 열기 실패:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        db = request.result;
        isInitialized = true;
        console.log('✅ KiyenoExcelDB 초기화 완료 (v' + DB_VERSION + ')');
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const database = event.target.result;

        // importedUnitPrices 테이블 생성
        if (!database.objectStoreNames.contains(STORE_UNIT_PRICES)) {
          const unitPriceStore = database.createObjectStore(STORE_UNIT_PRICES, {
            keyPath: 'id'
          });
          unitPriceStore.createIndex('key', 'key', { unique: true });
          unitPriceStore.createIndex('item', 'item', { unique: false });
          unitPriceStore.createIndex('spec', 'spec', { unique: false });
          unitPriceStore.createIndex('importedAt', 'importedAt', { unique: false });
          console.log('✅ importedUnitPrices 테이블 생성 완료');
        }

        // excelWallTypes 테이블 생성
        if (!database.objectStoreNames.contains(STORE_WALL_TYPES)) {
          const wallTypeStore = database.createObjectStore(STORE_WALL_TYPES, {
            keyPath: 'id'
          });
          wallTypeStore.createIndex('name', 'name', { unique: true });
          wallTypeStore.createIndex('createdAt', 'createdAt', { unique: false });
          console.log('✅ excelWallTypes 테이블 생성 완료');
        }
      };
    });
  }

  /**
   * DB 인스턴스 반환 (초기화 보장)
   * @returns {Promise<IDBDatabase>}
   */
  async function getDB() {
    if (!db || !isInitialized) {
      await initDB();
    }
    return db;
  }

  // ========================================
  // Phase 3: 엑셀 파싱
  // ========================================

  /**
   * 키 생성: (품명 + "_" + 규격) 소문자, 공백 제거
   * @param {string} item - 품명
   * @param {string} spec - 규격
   * @returns {string}
   */
  function generateKey(item, spec) {
    return (item + '_' + spec).toLowerCase().replace(/\s+/g, '');
  }

  /**
   * 엑셀 파일 파싱
   * @param {File} file - 엑셀 파일 (.xlsx, .xls)
   * @returns {Promise<Array>} 파싱된 일위대가 배열
   */
  async function parseUnitPriceExcel(file) {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();

        reader.onload = function (e) {
          try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // 첫 번째 시트 사용
            const sheetName = workbook.SheetNames[0];
            if (!sheetName) {
              reject(new Error('엑셀 파일에 시트가 없습니다.'));
              return;
            }

            const worksheet = workbook.Sheets[sheetName];
            // 원시 데이터를 배열로 변환 (헤더 포함)
            const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

            if (rawData.length < 2) {
              reject(new Error('데이터가 부족합니다. 헤더와 최소 1개의 데이터 행이 필요합니다.'));
              return;
            }

            // 헤더 행 찾기
            const headerResult = findHeaderRow(rawData);
            if (!headerResult) {
              reject(new Error('헤더를 인식할 수 없습니다. 품명, 규격, 자재비, 노무비 컬럼이 필요합니다.'));
              return;
            }

            const { headerRowIndex, columnMap } = headerResult;

            // 필수 컬럼 확인
            const missingFields = REQUIRED_FIELDS.filter(f => columnMap[f] === undefined);
            if (missingFields.length > 0) {
              reject(new Error('필수 컬럼이 없습니다: ' + missingFields.join(', ')));
              return;
            }

            // 데이터 행 파싱
            const parsedItems = [];
            const now = new Date().toISOString();

            for (let i = headerRowIndex + 1; i < rawData.length; i++) {
              const row = rawData[i];
              if (!row || row.length === 0) continue;

              const item = String(row[columnMap.item] || '').trim();
              const spec = String(row[columnMap.spec] || '').trim();

              // 품명과 규격이 모두 비어있으면 건너뛰기
              if (!item && !spec) continue;
              // 필수 필드 중 하나라도 비어있으면 건너뛰기
              if (!item || !spec) continue;

              const materialPrice = parseNumericValue(row[columnMap.materialPrice]);
              const laborPrice = parseNumericValue(row[columnMap.laborPrice]);

              // 자재비와 노무비 둘 다 0이면 건너뛰기
              if (materialPrice === 0 && laborPrice === 0) continue;

              const location = columnMap.location !== undefined
                ? String(row[columnMap.location] || '').trim() : '';
              const unit = columnMap.unit !== undefined
                ? String(row[columnMap.unit] || '').trim() || 'M2' : 'M2';
              const thickness = columnMap.thickness !== undefined
                ? parseNumericValue(row[columnMap.thickness], false) : 0;
              const quantity = columnMap.quantity !== undefined
                ? (parseNumericValue(row[columnMap.quantity]) || 1) : 1;
              const totalPrice = columnMap.totalPrice !== undefined
                ? parseNumericValue(row[columnMap.totalPrice]) : (materialPrice + laborPrice);
              const materialWorkType = columnMap.materialWorkType !== undefined
                ? String(row[columnMap.materialWorkType] || '').trim() : '';
              const laborWorkType = columnMap.laborWorkType !== undefined
                ? String(row[columnMap.laborWorkType] || '').trim() : '';

              const key = generateKey(item, spec);

              parsedItems.push({
                id: 'imp_' + Date.now() + '_' + i,
                key: key,
                location: location,
                item: item,
                spec: spec,
                unit: unit,
                thickness: thickness,
                quantity: quantity,
                materialPrice: materialPrice,
                laborPrice: laborPrice,
                totalPrice: totalPrice || (materialPrice + laborPrice),
                materialWorkType: materialWorkType,
                laborWorkType: laborWorkType,
                importedAt: now,
                updatedAt: now
              });
            }

            if (parsedItems.length === 0) {
              reject(new Error('유효한 데이터가 없습니다. 품명, 규격, 자재비, 노무비를 확인하세요.'));
              return;
            }

            console.log(`✅ 엑셀 파싱 완료: ${parsedItems.length}개 항목`);
            resolve(parsedItems);
          } catch (parseError) {
            console.error('❌ 엑셀 파싱 오류:', parseError);
            reject(new Error('엑셀 파일 파싱 중 오류가 발생했습니다: ' + parseError.message));
          }
        };

        reader.onerror = function () {
          reject(new Error('파일 읽기에 실패했습니다.'));
        };

        reader.readAsArrayBuffer(file);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 헤더 행 찾기 (첫 번째 행부터 탐색)
   * @param {Array<Array>} rawData - 원시 데이터 배열
   * @returns {{ headerRowIndex: number, columnMap: Object } | null}
   */
  function findHeaderRow(rawData) {
    // 최대 10행까지 탐색 (빈 행, 제목 행 등이 있을 수 있음)
    const maxSearch = Math.min(rawData.length, 10);

    for (let rowIdx = 0; rowIdx < maxSearch; rowIdx++) {
      const row = rawData[rowIdx];
      if (!row || row.length === 0) continue;

      const columnMap = {};
      let matchCount = 0;

      for (let colIdx = 0; colIdx < row.length; colIdx++) {
        const cellValue = String(row[colIdx] || '').trim();
        if (!cellValue) continue;

        // 헤더 매핑 검사
        const fieldName = HEADER_MAP[cellValue];
        if (fieldName && columnMap[fieldName] === undefined) {
          columnMap[fieldName] = colIdx;
          matchCount++;
        }
      }

      // 필수 필드가 모두 매핑되면 이 행이 헤더
      const hasAllRequired = REQUIRED_FIELDS.every(f => columnMap[f] !== undefined);
      if (hasAllRequired && matchCount >= 4) {
        return { headerRowIndex: rowIdx, columnMap: columnMap };
      }
    }

    return null;
  }

  /**
   * 숫자 값 파싱 (천단위 콤마 제거, 빈 값 0 반환)
   * @param {*} value
   * @returns {number}
   */
  function parseNumericValue(value, round = true) {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return round ? Math.round(value) : value;
    const cleaned = String(value).replace(/[,\s]/g, '');
    const num = Number(cleaned);
    if (isNaN(num)) return 0;
    return round ? Math.round(num) : num;
  }

  // ========================================
  // importedUnitPrices CRUD
  // ========================================

  /**
   * 파싱된 일위대가 DB 저장 (upsert)
   * @param {Array} unitPrices - parseUnitPriceExcel 반환값
   * @returns {Promise<{ inserted: number, updated: number }>}
   */
  async function saveImportedUnitPrices(unitPrices) {
    const database = await getDB();
    const now = new Date().toISOString();

    let inserted = 0;
    let updated = 0;

    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_UNIT_PRICES, 'readwrite');
      const store = tx.objectStore(STORE_UNIT_PRICES);
      const keyIndex = store.index('key');

      let processed = 0;
      const total = unitPrices.length;

      unitPrices.forEach((item) => {
        // key로 기존 데이터 조회
        const getRequest = keyIndex.get(item.key);

        getRequest.onsuccess = () => {
          const existing = getRequest.result;

          if (existing) {
            // 업데이트: 기존 id, importedAt 유지
            const updatedItem = {
              ...existing,
              location: item.location,
              item: item.item,
              spec: item.spec,
              unit: item.unit,
              thickness: item.thickness,
              quantity: item.quantity,
              materialPrice: item.materialPrice,
              laborPrice: item.laborPrice,
              totalPrice: item.totalPrice,
              materialWorkType: item.materialWorkType,
              laborWorkType: item.laborWorkType,
              updatedAt: now
            };
            store.put(updatedItem);
            updated++;
          } else {
            // 신규 삽입
            store.put(item);
            inserted++;
          }

          processed++;
          if (processed === total) {
            // 모든 아이템 처리 완료 (트랜잭션 완료 대기)
          }
        };

        getRequest.onerror = () => {
          console.error('❌ key 조회 실패:', item.key, getRequest.error);
          processed++;
        };
      });

      tx.oncomplete = () => {
        console.log(`✅ DB 저장 완료: 신규 ${inserted}개, 업데이트 ${updated}개`);
        resolve({ inserted, updated });
      };

      tx.onerror = () => {
        console.error('❌ DB 저장 실패:', tx.error);
        reject(tx.error);
      };
    });
  }

  /**
   * 전체 일위대가 조회
   * @returns {Promise<Array>}
   */
  async function getAllImportedUnitPrices() {
    const database = await getDB();

    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_UNIT_PRICES, 'readonly');
      const store = tx.objectStore(STORE_UNIT_PRICES);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        console.error('❌ 전체 조회 실패:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * ID로 일위대가 조회
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async function getImportedUnitPriceById(id) {
    const database = await getDB();

    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_UNIT_PRICES, 'readonly');
      const store = tx.objectStore(STORE_UNIT_PRICES);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * key로 일위대가 조회
   * @param {string} key - 품명_규격 소문자
   * @returns {Promise<Object|null>}
   */
  async function getImportedUnitPriceByKey(key) {
    const database = await getDB();

    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_UNIT_PRICES, 'readonly');
      const store = tx.objectStore(STORE_UNIT_PRICES);
      const index = store.index('key');
      const request = index.get(key);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * 일위대가 수정
   * @param {string} id
   * @param {Object} data - 수정할 필드
   * @returns {Promise<Object>}
   */
  async function updateImportedUnitPrice(id, data) {
    const database = await getDB();

    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_UNIT_PRICES, 'readwrite');
      const store = tx.objectStore(STORE_UNIT_PRICES);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const existing = getRequest.result;
        if (!existing) {
          reject(new Error('해당 항목을 찾을 수 없습니다: ' + id));
          return;
        }

        const updated = {
          ...existing,
          ...data,
          id: existing.id,       // id 보호
          importedAt: existing.importedAt,  // 최초 가져온 시간 보호
          updatedAt: new Date().toISOString()
        };

        // 품명 또는 규격 변경 시 key 재생성
        if (data.item !== undefined || data.spec !== undefined) {
          updated.key = ((updated.item || '') + '_' + (updated.spec || '')).toLowerCase().replace(/\s+/g, '');
        }

        // totalPrice 자동 재계산
        if (data.materialPrice !== undefined || data.laborPrice !== undefined) {
          updated.totalPrice = (updated.materialPrice || 0) + (updated.laborPrice || 0);
        }

        const putRequest = store.put(updated);

        putRequest.onsuccess = () => {
          resolve(updated);
        };

        putRequest.onerror = () => {
          reject(putRequest.error);
        };
      };

      getRequest.onerror = () => {
        reject(getRequest.error);
      };
    });
  }

  /**
   * 일위대가 삭제
   * @param {string} id
   * @returns {Promise<void>}
   */
  async function deleteImportedUnitPrice(id) {
    const database = await getDB();

    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_UNIT_PRICES, 'readwrite');
      const store = tx.objectStore(STORE_UNIT_PRICES);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * 전체 일위대가 삭제
   * @returns {Promise<void>}
   */
  async function clearAllImportedUnitPrices() {
    const database = await getDB();

    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_UNIT_PRICES, 'readwrite');
      const store = tx.objectStore(STORE_UNIT_PRICES);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('✅ importedUnitPrices 전체 삭제 완료');
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // ========================================
  // excelWallTypes CRUD
  // ========================================

  /**
   * 새 엑셀 벽체타입 생성 (빈 템플릿)
   * @param {string} name - 타입명 (예: 'W-01')
   * @returns {Object} 새 벽체타입 객체
   */
  function createEmptyExcelWallType(name) {
    const now = new Date().toISOString();
    const wallType = {
      id: 'ewt_' + Date.now(),
      name: name || '',
      source: 'excel',
      // 기본 12개 레이어 (빈 값)
      layer3_1: '',
      layer2_1: '',
      layer1_1: '',
      column1: '',
      infill: '',
      layer1_2: '',
      layer2_2: '',
      layer3_2: '',
      column2: '',
      channel: '',
      runner: '',
      steelPlate: '',
      // 동적 추가 레이어 (12개 초과 시)
      extraLayers: [],
      // 합산 금액
      thickness: 0,
      totalMaterialPrice: 0,
      totalLaborPrice: 0,
      totalPrice: 0,
      createdAt: now,
      updatedAt: now
    };
    return wallType;
  }

  /**
   * 엑셀 벽체타입 저장
   * @param {Object} wallType
   * @returns {Promise<Object>}
   */
  async function saveExcelWallType(wallType) {
    const database = await getDB();

    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_WALL_TYPES, 'readwrite');
      const store = tx.objectStore(STORE_WALL_TYPES);

      wallType.updatedAt = new Date().toISOString();
      const request = store.put(wallType);

      request.onsuccess = () => {
        resolve(wallType);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * 전체 엑셀 벽체타입 조회
   * @returns {Promise<Array>}
   */
  async function getAllExcelWallTypes() {
    const database = await getDB();

    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_WALL_TYPES, 'readonly');
      const store = tx.objectStore(STORE_WALL_TYPES);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * ID로 엑셀 벽체타입 조회
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async function getExcelWallTypeById(id) {
    const database = await getDB();

    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_WALL_TYPES, 'readonly');
      const store = tx.objectStore(STORE_WALL_TYPES);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * 이름으로 엑셀 벽체타입 조회
   * @param {string} name
   * @returns {Promise<Object|null>}
   */
  async function getExcelWallTypeByName(name) {
    const database = await getDB();

    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_WALL_TYPES, 'readonly');
      const store = tx.objectStore(STORE_WALL_TYPES);
      const index = store.index('name');
      const request = index.get(name);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * 엑셀 벽체타입 수정
   * @param {string} id
   * @param {Object} data - 수정할 필드
   * @returns {Promise<Object>}
   */
  async function updateExcelWallType(id, data) {
    const database = await getDB();

    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_WALL_TYPES, 'readwrite');
      const store = tx.objectStore(STORE_WALL_TYPES);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const existing = getRequest.result;
        if (!existing) {
          reject(new Error('해당 벽체타입을 찾을 수 없습니다: ' + id));
          return;
        }

        const updated = {
          ...existing,
          ...data,
          id: existing.id,
          source: 'excel',
          createdAt: existing.createdAt,
          updatedAt: new Date().toISOString()
        };

        const putRequest = store.put(updated);

        putRequest.onsuccess = () => {
          resolve(updated);
        };

        putRequest.onerror = () => {
          reject(putRequest.error);
        };
      };

      getRequest.onerror = () => {
        reject(getRequest.error);
      };
    });
  }

  /**
   * 엑셀 벽체타입 삭제
   * @param {string} id
   * @returns {Promise<void>}
   */
  async function deleteExcelWallType(id) {
    const database = await getDB();

    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_WALL_TYPES, 'readwrite');
      const store = tx.objectStore(STORE_WALL_TYPES);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * 전체 엑셀 벽체타입 삭제
   * @returns {Promise<void>}
   */
  async function clearAllExcelWallTypes() {
    const database = await getDB();

    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_WALL_TYPES, 'readwrite');
      const store = tx.objectStore(STORE_WALL_TYPES);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('✅ excelWallTypes 전체 삭제 완료');
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // ========================================
  // 벽체타입 금액 계산 유틸리티
  // ========================================

  /**
   * 벽체타입의 레이어별 금액 합산 계산
   * 각 레이어에 배정된 importedUnitPrice의 자재비/노무비를 합산
   * @param {Object} wallType - excelWallType 객체
   * @returns {Promise<{ thickness: number, totalMaterialPrice: number, totalLaborPrice: number, totalPrice: number }>}
   */
  async function calculateWallTypeTotals(wallType) {
    let totalThickness = 0;
    let totalMaterialPrice = 0;
    let totalLaborPrice = 0;

    // 기본 12개 레이어에서 unitPriceId 수집
    const unitPriceIds = [];
    for (const field of DEFAULT_LAYER_FIELDS) {
      const id = wallType[field];
      if (id) unitPriceIds.push(id);
    }

    // extraLayers에서 unitPriceId 수집
    if (Array.isArray(wallType.extraLayers)) {
      for (const extra of wallType.extraLayers) {
        if (extra.unitPriceId) unitPriceIds.push(extra.unitPriceId);
      }
    }

    // 중복 제거 없이 각각 합산 (같은 자재가 여러 레이어에 사용될 수 있음)
    for (const id of unitPriceIds) {
      try {
        const unitPrice = await getImportedUnitPriceById(id);
        if (unitPrice) {
          totalThickness += (unitPrice.thickness || 0);
          totalMaterialPrice += (unitPrice.materialPrice || 0);
          totalLaborPrice += (unitPrice.laborPrice || 0);
        }
      } catch (e) {
        console.warn('⚠️ 일위대가 조회 실패:', id, e);
      }
    }

    return {
      thickness: totalThickness,
      totalMaterialPrice: totalMaterialPrice,
      totalLaborPrice: totalLaborPrice,
      totalPrice: totalMaterialPrice + totalLaborPrice
    };
  }

  // ========================================
  // 유틸리티
  // ========================================

  /**
   * DB 상태 확인
   * @returns {boolean}
   */
  function isDBReady() {
    return isInitialized && db !== null;
  }

  /**
   * 기본 레이어 필드 목록 반환
   * @returns {Array<string>}
   */
  function getDefaultLayerFields() {
    return [...DEFAULT_LAYER_FIELDS];
  }

  // ========================================
  // Public API
  // ========================================
  return {
    // DB 초기화
    initDB,
    getDB,
    isDBReady,

    // 상수
    DB_NAME,
    DB_VERSION,
    STORE_UNIT_PRICES,
    STORE_WALL_TYPES,
    DEFAULT_LAYER_FIELDS: DEFAULT_LAYER_FIELDS,
    getDefaultLayerFields,

    // 엑셀 파싱
    parseUnitPriceExcel,
    generateKey,

    // importedUnitPrices CRUD
    saveImportedUnitPrices,
    getAllImportedUnitPrices,
    getImportedUnitPriceById,
    getImportedUnitPriceByKey,
    updateImportedUnitPrice,
    deleteImportedUnitPrice,
    clearAllImportedUnitPrices,

    // excelWallTypes CRUD
    createEmptyExcelWallType,
    saveExcelWallType,
    getAllExcelWallTypes,
    getExcelWallTypeById,
    getExcelWallTypeByName,
    updateExcelWallType,
    deleteExcelWallType,
    clearAllExcelWallTypes,

    // 벽체타입 계산
    calculateWallTypeTotals
  };
})();

// 전역 노출
window.ExcelUnitPriceImporter = ExcelUnitPriceImporter;
