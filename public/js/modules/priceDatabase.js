/**
 * 가격 데이터베이스 모듈
 * 자재 가격 정보를 관리하는 IndexedDB 래퍼
 */

import MaterialService from '../services/materialService.js';
import { EventEmitter } from '../utils/helpers.js';

class PriceDatabase extends EventEmitter {
  constructor() {
    super();
    this.materialService = new MaterialService();
    this.db = null;
    this.isInitialized = false;

    // 호환성을 위한 캐시 속성들
    this.lightweightItemsCache = [];
    this.gypsumItemsCache = [];
    this.modifications = {
      lightweightComponents: { added: [], modified: [], deleted: [] },
      gypsumBoards: { added: [], modified: [], deleted: [] },
    };
    this.cache = new Map();

    // 원본 데이터 보존
    this.originalLightweightData = null;
    this.originalGypsumData = null;

    // 수정사항 추적
    this.modifications = {
      lightweightComponents: {
        added: [],
        modified: [],
        deleted: [],
      },
      gypsumBoards: {
        added: [],
        modified: [],
        deleted: [],
      },
    };
  }

  /**
   * 데이터베이스 초기화
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // IndexedDB 초기화
      await this.initIndexedDB();

      // 내부 데이터 초기화 (서버 대신 하드코딩된 데이터 사용)
      this.initializeInternalData();

      this.isInitialized = true;
      this.emit('initialized');

      console.log('✅ PriceDatabase 초기화 완료 (내부 데이터 사용)');
    } catch (error) {
      console.error('❌ PriceDatabase 초기화 실패:', error);
      throw error;
    }
  }

  /**
   * 내부 데이터 초기화 (하드코딩된 데이터 사용)
   */
  initializeInternalData() {
    // 경량자재 데이터 강제 초기화
    this.getLightweightComponents();

    // 석고보드 데이터 강제 초기화
    this.getGypsumBoards();

    console.log('📦 내부 자재 데이터 초기화 완료:', {
      경량자재: this.lightweightItemsCache?.length || 0,
      석고보드: this.gypsumItemsCache?.length || 0,
    });
  }

  /**
   * IndexedDB 초기화
   */
  async initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('KiyenoMaterialsDB', 3);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // materials 테이블이 없으면 생성 (경량자재 + 석고보드 통합 저장)
        if (!db.objectStoreNames.contains('materials')) {
          const materialsStore = db.createObjectStore('materials', {
            keyPath: 'id',
          });
          materialsStore.createIndex('name', 'name', { unique: false });
          materialsStore.createIndex('category', 'category', { unique: false });
          console.log('✅ materials 테이블 생성 완료 (priceDatabase.js)');
        }

        // unitPrices 테이블이 없으면 생성 (일위대가용)
        if (!db.objectStoreNames.contains('unitPrices')) {
          const unitPricesStore = db.createObjectStore('unitPrices', {
            keyPath: 'id',
          });
          unitPricesStore.createIndex('itemName', 'basic.itemName', {
            unique: false,
          });
          unitPricesStore.createIndex('createdAt', 'createdAt', {
            unique: false,
          });
          console.log('✅ unitPrices 테이블 생성 완료 (priceDatabase.js)');
        }

        // wallTypeMasters 테이블이 없으면 생성 (벽체 타입 마스터용)
        if (!db.objectStoreNames.contains('wallTypeMasters')) {
          const wallTypeStore = db.createObjectStore('wallTypeMasters', {
            keyPath: 'id',
          });
          wallTypeStore.createIndex('name', 'name', { unique: false });
          wallTypeStore.createIndex('category', 'category', { unique: false });
          wallTypeStore.createIndex('thickness', 'thickness', {
            unique: false,
          });
          wallTypeStore.createIndex('createdAt', 'createdAt', {
            unique: false,
          });
          wallTypeStore.createIndex('isTemplate', 'isTemplate', {
            unique: false,
          });
          console.log('✅ wallTypeMasters 테이블 생성 완료 (priceDatabase.js)');
        }
      };
    });
  }

  /**
   * 서버에서 자재 데이터 로드
   */
  async loadMaterialsFromServer() {
    try {
      const result = await this.materialService.getAllMaterials();

      if (result.success) {
        // IndexedDB에 저장
        await this.storeMaterialsInDB(result.data);

        // 캐시 업데이트
        this.updateCache(result.data);

        this.emit('materialsLoaded', result.data);
      } else {
        throw new Error(result.message || '자재 데이터 로드 실패');
      }
    } catch (error) {
      console.error('서버에서 자재 데이터 로드 실패:', error);
      throw error;
    }
  }

  /**
   * 자재 데이터를 IndexedDB에 저장
   */
  async storeMaterialsInDB(materials) {
    const transaction = this.db.transaction(['materials'], 'readwrite');
    const store = transaction.objectStore('materials');

    // 기존 데이터 삭제
    await store.clear();

    // 새 데이터 저장
    for (const material of materials) {
      await store.add(material);
    }

    return transaction.complete;
  }

  /**
   * 캐시 업데이트
   */
  updateCache(materials) {
    this.cache.clear();
    materials.forEach((material) => {
      this.cache.set(material.id, material);
    });
  }

  /**
   * 모든 자재 조회
   */
  async getAllMaterials() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // 캐시에서 먼저 조회
      if (this.cache.size > 0) {
        return Array.from(this.cache.values());
      }

      // IndexedDB에서 조회
      const transaction = this.db.transaction(['materials'], 'readonly');
      const store = transaction.objectStore('materials');
      const request = store.getAll();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const materials = request.result;
          this.updateCache(materials);
          resolve(materials);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('자재 조회 실패:', error);
      throw error;
    }
  }

  /**
   * ID로 자재 조회
   */
  async findMaterialById(id) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // 캐시에서 먼저 조회
    if (this.cache.has(id)) {
      return this.cache.get(id);
    }

    // IndexedDB에서 조회
    const transaction = this.db.transaction(['materials'], 'readonly');
    const store = transaction.objectStore('materials');
    const request = store.get(id);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const material = request.result;
        if (material) {
          this.cache.set(id, material);
        }
        resolve(material);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 카테고리별 자재 조회
   */
  async findMaterialsByCategory(category) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const transaction = this.db.transaction(['materials'], 'readonly');
    const store = transaction.objectStore('materials');
    const index = store.index('category');
    const request = index.getAll(category);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 자재 이름으로 검색
   */
  async searchMaterialsByName(name) {
    const materials = await this.getAllMaterials();
    const searchTerm = name.toLowerCase();

    return materials.filter((material) =>
      material.name.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * 자재 추가/수정
   */
  async saveMaterial(material) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // 서버에 저장
      let result;
      if (material.id) {
        result = await this.materialService.updateMaterial(
          material.id,
          material
        );
      } else {
        result = await this.materialService.createMaterial(material);
      }

      if (result.success) {
        // IndexedDB 업데이트
        const transaction = this.db.transaction(['materials'], 'readwrite');
        const store = transaction.objectStore('materials');
        await store.put(result.data);

        // 캐시 업데이트
        this.cache.set(result.data.id, result.data);

        this.emit('materialSaved', result.data);
        return result.data;
      } else {
        throw new Error(result.message || '자재 저장 실패');
      }
    } catch (error) {
      console.error('자재 저장 실패:', error);
      throw error;
    }
  }

  /**
   * 자재 삭제
   */
  async deleteMaterial(id) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // 서버에서 삭제
      const result = await this.materialService.deleteMaterial(id);

      if (result.success) {
        // IndexedDB에서 삭제
        const transaction = this.db.transaction(['materials'], 'readwrite');
        const store = transaction.objectStore('materials');
        await store.delete(id);

        // 캐시에서 삭제
        this.cache.delete(id);

        this.emit('materialDeleted', id);
        return true;
      } else {
        throw new Error(result.message || '자재 삭제 실패');
      }
    } catch (error) {
      console.error('자재 삭제 실패:', error);
      throw error;
    }
  }

  /**
   * 자재 가격 업데이트
   */
  async updateMaterialPrice(id, price) {
    const material = await this.findMaterialById(id);
    if (material) {
      material.price = price;
      material.totalPrice = price; // 호환성을 위해
      return await this.saveMaterial(material);
    }
    throw new Error('자재를 찾을 수 없습니다');
  }

  /**
   * 자재 통계 조회
   */
  async getStatistics() {
    const materials = await this.getAllMaterials();

    return {
      total: materials.length,
      byCategory: this.groupByCategory(materials),
      averagePrice: this.calculateAveragePrice(materials),
      priceRange: this.calculatePriceRange(materials),
    };
  }

  /**
   * 카테고리별 그룹화
   */
  groupByCategory(materials) {
    return materials.reduce((groups, material) => {
      const category = material.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(material);
      return groups;
    }, {});
  }

  /**
   * 평균 가격 계산
   */
  calculateAveragePrice(materials) {
    if (materials.length === 0) return 0;

    const total = materials.reduce((sum, material) => {
      return sum + (material.price || material.totalPrice || 0);
    }, 0);

    return total / materials.length;
  }

  /**
   * 가격 범위 계산
   */
  calculatePriceRange(materials) {
    if (materials.length === 0) return { min: 0, max: 0 };

    const prices = materials.map(
      (material) => material.price || material.totalPrice || 0
    );

    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }

  /**
   * 데이터베이스 새로고침
   */
  async refresh() {
    this.cache.clear();
    await this.loadMaterialsFromServer();
    this.emit('refreshed');
  }

  /**
   * 데이터 상태 조회 (기존 코드 호환성)
   */
  getDataStatus() {
    return {
      isInitialized: this.isInitialized,
      materialsCount: this.cache.size,
      dbVersion: '3.0.0', // v2→v3 통합 업그레이드
      lastUpdated: new Date().toISOString(),
      status: this.isInitialized ? 'ready' : 'loading',
      summary: {
        total: this.cache.size,
        lightweightComponents: {
          added: 0,
          modified: 0,
          deleted: 0,
        },
        gypsumBoards: {
          added: 0,
          modified: 0,
          deleted: 0,
        },
      },
    };
  }

  /**
   * 기존 코드와 호환성을 위한 메소드들
   */

  // 경량부품 관련 (기존 코드 호환성)
  findLightweightComponentById(id) {
    return this.findMaterialById(id);
  }

  async findLightweightComponentsByCategory(category) {
    return await this.findMaterialsByCategory(category);
  }

  // 석고보드 관련 (기존 코드 호환성)
  findGypsumBoardById(id) {
    return this.findMaterialById(id);
  }

  async findGypsumBoardsByCategory(category) {
    return await this.findMaterialsByCategory(category);
  }

  // 기타 호환성 메소드들
  async loadInitialData() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.getAllMaterials();
  }

  async refreshData() {
    return await this.refresh();
  }

  getCachedMaterials() {
    return Array.from(this.cache.values());
  }

  isCacheValid() {
    return this.cache.size > 0;
  }

  // 경량 자재 조회 (기존 코드 호환성)
  getLightweightComponents() {
    const categories = {
      STUD_KS: { name: 'STUD - KS형', displayOrder: 1 },
      RUNNER_KS: { name: 'RUNNER - KS형', displayOrder: 2 },
      STUD_BS: { name: 'STUD - BS형', displayOrder: 3 },
      RUNNER_BS: { name: 'RUNNER - BS형', displayOrder: 4 },
      CH_STUD_J_RUNNER: { name: 'CH-STUD / J런너', displayOrder: 5 },
      BEADS: { name: '비드류', displayOrder: 6 },
      FASTENERS: { name: '체결부품', displayOrder: 7 },
    };

    // 원본 데이터 보존 (최초 1회만)
    if (!this.originalLightweightData) {
      this.originalLightweightData = [
        // STUD - KS형
        {
          id: 'ST001',
          category: 'STUD_KS',
          name: '메탈 스터드 50형 ㉿',
          spec: '50형',
          size: '0.8T*60*45',
          unit: 'M',
          price: 1160,
          laborCost: 3696,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'ST002',
          category: 'STUD_KS',
          name: '메탈 스터드 60형',
          spec: '60형',
          size: '0.8T*60*45',
          unit: 'M',
          price: 1240,
          laborCost: 3696,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'ST003',
          category: 'STUD_KS',
          name: '메탈 스터드 65형 ㉿',
          spec: '65형',
          size: '0.8T*60*45',
          unit: 'M',
          price: 1280,
          laborCost: 3696,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'ST004',
          category: 'STUD_KS',
          name: '메탈 스터드 70형',
          spec: '70형',
          size: '0.8T*70*45',
          unit: 'M',
          price: 1320,
          laborCost: 3696,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'ST005',
          category: 'STUD_KS',
          name: '메탈 스터드 75형 ㉿',
          spec: '75형',
          size: '0.8T*75*45',
          unit: 'M',
          price: 1350,
          laborCost: 3696,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'ST006',
          category: 'STUD_KS',
          name: '메탈 스터드 80형',
          spec: '80형',
          size: '0.8T*80*45',
          unit: 'M',
          price: 1390,
          laborCost: 4225,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'ST007',
          category: 'STUD_KS',
          name: '메탈 스터드 90형 ㉿',
          spec: '90형',
          size: '0.8T*90*45',
          unit: 'M',
          price: 1480,
          laborCost: 4225,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'ST008',
          category: 'STUD_KS',
          name: '메탈 스터드 100형 ㉿',
          spec: '100형',
          size: '0.8T*100*45',
          unit: 'M',
          price: 1550,
          laborCost: 4225,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'ST009',
          category: 'STUD_KS',
          name: '메탈 스터드 110형',
          spec: '110형',
          size: '0.8T*110*45',
          unit: 'M',
          price: 1630,
          laborCost: 4929,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'ST010',
          category: 'STUD_KS',
          name: '메탈 스터드 120형',
          spec: '120형',
          size: '0.8T*120*45',
          unit: 'M',
          price: 1710,
          laborCost: 4929,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'ST011',
          category: 'STUD_KS',
          name: '메탈 스터드 125형',
          spec: '125형',
          size: '0.8T*125*45',
          unit: 'M',
          price: 1740,
          laborCost: 4929,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'ST012',
          category: 'STUD_KS',
          name: '메탈 스터드 130형',
          spec: '130형',
          size: '0.8T*130*45',
          unit: 'M',
          price: 1790,
          laborCost: 5915,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'ST013',
          category: 'STUD_KS',
          name: '메탈 스터드 140형',
          spec: '140형',
          size: '0.8T*140*45',
          unit: 'M',
          price: 1860,
          laborCost: 5915,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'ST014',
          category: 'STUD_KS',
          name: '메탈 스터드 150형',
          spec: '150형',
          size: '0.8T*150*45',
          unit: 'M',
          price: 1950,
          laborCost: 5915,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'ST015',
          category: 'STUD_KS',
          name: '메탈 스터드 160형',
          spec: '160형',
          size: '0.8T*160*45',
          unit: 'M',
          price: 2020,
          laborCost: 7393,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'ST016',
          category: 'STUD_KS',
          name: '메탈 스터드 200형',
          spec: '200형',
          size: '0.8T*200*45',
          unit: 'M',
          price: 2390,
          laborCost: 7393,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'ST017',
          category: 'STUD_KS',
          name: 'CH-STUD 75형',
          spec: '75형',
          size: '0.8T*75*35',
          unit: 'M',
          price: 1740,
          laborCost: 3696,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'ST018',
          category: 'STUD_KS',
          name: 'CH-STUD 102형',
          spec: '102형',
          size: '0.8T*102*35',
          unit: 'M',
          price: 1960,
          laborCost: 4225,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'ST019',
          category: 'STUD_KS',
          name: 'CH-STUD 127형',
          spec: '127형',
          size: '0.8T*127*35',
          unit: 'M',
          price: 2160,
          laborCost: 4929,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'ST020',
          category: 'STUD_KS',
          name: 'CH-STUD 152형',
          spec: '152형',
          size: '0.8T*152*35',
          unit: 'M',
          price: 2350,
          laborCost: 4929,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        // RUNNER - KS형
        {
          id: 'RN001',
          category: 'RUNNER_KS',
          name: '메탈 런너 50형 ㉿',
          spec: '50형',
          size: '0.8T*52*40',
          unit: 'M',
          price: 990,
          laborCost: 597,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'RN002',
          category: 'RUNNER_KS',
          name: '메탈 런너 60형',
          spec: '60형',
          size: '0.8T*62*40',
          unit: 'M',
          price: 1070,
          laborCost: 597,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'RN003',
          category: 'RUNNER_KS',
          name: '메탈 런너 65형 ㉿',
          spec: '65형',
          size: '0.8T*67*40',
          unit: 'M',
          price: 1110,
          laborCost: 597,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'RN004',
          category: 'RUNNER_KS',
          name: '메탈 런너 70형',
          spec: '70형',
          size: '0.8T*72*40',
          unit: 'M',
          price: 1150,
          laborCost: 597,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'RN005',
          category: 'RUNNER_KS',
          name: '메탈 런너 75형 ㉿',
          spec: '75형',
          size: '0.8T*77*40',
          unit: 'M',
          price: 1190,
          laborCost: 597,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'RN006',
          category: 'RUNNER_KS',
          name: '메탈 런너 80형',
          spec: '80형',
          size: '0.8T*82*40',
          unit: 'M',
          price: 1220,
          laborCost: 682,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'RN007',
          category: 'RUNNER_KS',
          name: '메탈 런너 90형 ㉿',
          spec: '90형',
          size: '0.8T*92*40',
          unit: 'M',
          price: 1300,
          laborCost: 682,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'RN008',
          category: 'RUNNER_KS',
          name: '메탈 런너 100형 ㉿',
          spec: '100형',
          size: '0.8T*102*40',
          unit: 'M',
          price: 1380,
          laborCost: 682,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'RN009',
          category: 'RUNNER_KS',
          name: '메탈 런너 110형',
          spec: '110형',
          size: '0.8T*112*40',
          unit: 'M',
          price: 1460,
          laborCost: 796,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'RN010',
          category: 'RUNNER_KS',
          name: '메탈 런너 120형',
          spec: '120형',
          size: '0.8T*122*40',
          unit: 'M',
          price: 1530,
          laborCost: 796,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'RN011',
          category: 'RUNNER_KS',
          name: '메탈 런너 125형',
          spec: '125형',
          size: '0.8T*127*40',
          unit: 'M',
          price: 1570,
          laborCost: 796,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'RN012',
          category: 'RUNNER_KS',
          name: '메탈 런너 130형',
          spec: '130형',
          size: '0.8T*132*40',
          unit: 'M',
          price: 1610,
          laborCost: 955,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'RN013',
          category: 'RUNNER_KS',
          name: '메탈 런너 140형',
          spec: '140형',
          size: '0.8T*142*40',
          unit: 'M',
          price: 1700,
          laborCost: 955,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'RN014',
          category: 'RUNNER_KS',
          name: '메탈 런너 150형',
          spec: '150형',
          size: '0.8T*152*40',
          unit: 'M',
          price: 1770,
          laborCost: 955,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'RN015',
          category: 'RUNNER_KS',
          name: '메탈 런너 160형',
          spec: '160형',
          size: '0.8T*162*40',
          unit: 'M',
          price: 1840,
          laborCost: 1194,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'RN016',
          category: 'RUNNER_KS',
          name: '메탈 런너 200형',
          spec: '200형',
          size: '0.8T*202*40',
          unit: 'M',
          price: 2350,
          laborCost: 1194,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'RN017',
          category: 'RUNNER_KS',
          name: 'J-RUNNER 75형',
          spec: '75형',
          size: '0.8T*77*40',
          unit: 'M',
          price: 1100,
          laborCost: 597,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'RN018',
          category: 'RUNNER_KS',
          name: 'J-RUNNER 102형',
          spec: '102형',
          size: '0.8T*104*40',
          unit: 'M',
          price: 1310,
          laborCost: 682,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'RN019',
          category: 'RUNNER_KS',
          name: 'J-RUNNER 127형',
          spec: '127형',
          size: '0.8T*129*40',
          unit: 'M',
          price: 1510,
          laborCost: 796,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'RN020',
          category: 'RUNNER_KS',
          name: 'J-RUNNER 152형',
          spec: '152형',
          size: '0.8T*154*40',
          unit: 'M',
          price: 1700,
          laborCost: 796,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'FT001',
          category: 'FASTENERS',
          name: '메거진피스 3*21 (양날)',
          spec: '구조틀용(50형-75형)',
          size: '3*21',
          unit: 'EA',
          price: 8,
          laborCost: 739,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'FT002',
          category: 'FASTENERS',
          name: '메거진피스 3*21 (양날)',
          spec: '구조틀용(80형-100형)',
          size: '3*21',
          unit: 'EA',
          price: 8,
          laborCost: 845,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'FT003',
          category: 'FASTENERS',
          name: '메거진피스 3*21 (양날)',
          spec: '구조틀용(110형-125형)',
          size: '3*21',
          unit: 'EA',
          price: 8,
          laborCost: 985,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'FT004',
          category: 'FASTENERS',
          name: '메거진피스 3*21 (양날)',
          spec: '구조틀용(130형-150형)',
          size: '3*21',
          unit: 'EA',
          price: 8,
          laborCost: 1183,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'FT005',
          category: 'FASTENERS',
          name: '메거진피스 3*21 (양날)',
          spec: '구조틀용(130형-150형)',
          size: '3*21',
          unit: 'EA',
          price: 8,
          laborCost: 1478,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'FT006',
          category: 'FASTENERS',
          name: '메거진피스 3*21 (양날)',
          spec: 'CH구조틀용(50형-75형)',
          size: '3*21',
          unit: 'EA',
          price: 8,
          laborCost: 739,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'FT007',
          category: 'FASTENERS',
          name: '메거진피스 3*21 (양날)',
          spec: 'CH구조틀용(80형-102형)',
          size: '3*21',
          unit: 'EA',
          price: 8,
          laborCost: 845,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'FT008',
          category: 'FASTENERS',
          name: '메거진피스 3*21 (양날)',
          spec: 'CH구조틀용(100형-155형)',
          size: '3*21',
          unit: 'EA',
          price: 8,
          laborCost: 985,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'FT009',
          category: 'FASTENERS',
          name: '메거진피스 3*21 (양날)',
          spec: '석고취부용',
          size: '3*21',
          unit: 'EA',
          price: 8,
          laborCost: 228,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '건자재',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        // {
        //   id: 'FT003',
        //   category: 'FASTENERS',
        //   name: '메거진피스 6*25 (양날)',
        //   spec: '구조틀용',
        //   size: '6*25',
        //   unit: 'EA',
        //   price: 10,
        //   laborCost: 0,
        //   laborProductivity: 0,
        //   laborCompensation: 0,
        //   baseLabor: 0,
        //   laborSettings: {
        //     workers: [{ type: '조공', cost: 0 }],
        //     productivity: 0,
        //     compensation: 0,
        //   },
        //   workType1: '경량',
        //   workType2: '경량',
        //   location: '벽체',
        //   work: '',
        // },
        // {
        //   id: 'FT004',
        //   category: 'FASTENERS',
        //   name: '메거진피스 6*32 (양날)',
        //   spec: '구조틀용',
        //   size: '6*32',
        //   unit: 'EA',
        //   price: 12,
        //   laborCost: 0,
        //   laborProductivity: 0,
        //   laborCompensation: 0,
        //   baseLabor: 0,
        //   laborSettings: {
        //     workers: [{ type: '조공', cost: 0 }],
        //     productivity: 0,
        //     compensation: 0,
        //   },
        //   workType1: '경량',
        //   workType2: '경량',
        //   location: '벽체',
        //   work: '',
        // },
        // {
        //   id: 'FT005',
        //   category: 'FASTENERS',
        //   name: '메거진피스 6*38 (양날)',
        //   spec: '구조틀용',
        //   size: '6*38',
        //   unit: 'EA',
        //   price: 14,
        //   laborCost: 0,
        //   laborProductivity: 0,
        //   laborCompensation: 0,
        //   baseLabor: 0,
        //   laborSettings: {
        //     workers: [{ type: '조공', cost: 0 }],
        //     productivity: 0,
        //     compensation: 0,
        //   },
        //   workType1: '경량',
        //   workType2: '경량',
        //   location: '벽체',
        //   work: '',
        // },
        // {
        //   id: 'FT006',
        //   category: 'FASTENERS',
        //   name: '메거진피스 6*41 (양날)',
        //   spec: '구조틀용',
        //   size: '6*41',
        //   unit: 'EA',
        //   price: 16,
        //   laborCost: 0,
        //   laborProductivity: 0,
        //   laborCompensation: 0,
        //   baseLabor: 0,
        //   laborSettings: {
        //     workers: [{ type: '조공', cost: 0 }],
        //     productivity: 0,
        //     compensation: 0,
        //   },
        //   workType1: '경량',
        //   workType2: '경량',
        //   location: '벽체',
        //   work: '',
        // },
        // {
        //   id: 'FT007',
        //   category: 'FASTENERS',
        //   name: '메거진피스 6*50 (양날)',
        //   spec: '구조틀용',
        //   size: '6*50',
        //   unit: 'EA',
        //   price: 20,
        //   laborCost: 0,
        //   laborProductivity: 0,
        //   laborCompensation: 0,
        //   baseLabor: 0,
        //   laborSettings: {
        //     workers: [{ type: '조공', cost: 0 }],
        //     productivity: 0,
        //     compensation: 0,
        //   },
        //   workType1: '경량',
        //   workType2: '경량',
        //   location: '벽체',
        //   work: '',
        // },
        // {
        //   id: 'FT008',
        //   category: 'FASTENERS',
        //   name: '메거진피스 6*57 (양날)',
        //   spec: '구조틀용',
        //   size: '6*57',
        //   unit: 'EA',
        //   price: 25,
        //   laborCost: 0,
        //   laborProductivity: 0,
        //   laborCompensation: 0,
        //   baseLabor: 0,
        //   laborSettings: {
        //     workers: [{ type: '조공', cost: 0 }],
        //     productivity: 0,
        //     compensation: 0,
        //   },
        //   workType1: '경량',
        //   workType2: '경량',
        //   location: '벽체',
        //   work: '',
        // },
        // {
        //   id: 'FT009',
        //   category: 'FASTENERS',
        //   name: '메거진피스 6*25 (외날)',
        //   spec: '구조틀용',
        //   size: '6*25',
        //   unit: 'EA',
        //   price: 8,
        //   laborCost: 0,
        //   laborProductivity: 0,
        //   laborCompensation: 0,
        //   baseLabor: 0,
        //   laborSettings: {
        //     workers: [{ type: '조공', cost: 0 }],
        //     productivity: 0,
        //     compensation: 0,
        //   },
        //   workType1: '경량',
        //   workType2: '경량',
        //   location: '벽체',
        //   work: '',
        // },
        // {
        //   id: 'FT010',
        //   category: 'FASTENERS',
        //   name: '메거진피스 6*32 (외날)',
        //   spec: '구조틀용',
        //   size: '6*32',
        //   unit: 'EA',
        //   price: 10,
        //   laborCost: 0,
        //   laborProductivity: 0,
        //   laborCompensation: 0,
        //   baseLabor: 0,
        //   laborSettings: {
        //     workers: [{ type: '조공', cost: 0 }],
        //     productivity: 0,
        //     compensation: 0,
        //   },
        //   workType1: '경량',
        //   workType2: '경량',
        //   location: '벽체',
        //   work: '',
        // },
        // {
        //   id: 'FT011',
        //   category: 'FASTENERS',
        //   name: '메거진피스 6*38 (외날)',
        //   spec: '구조틀용',
        //   size: '6*38',
        //   unit: 'EA',
        //   price: 13,
        //   laborCost: 0,
        //   laborProductivity: 0,
        //   laborCompensation: 0,
        //   baseLabor: 0,
        //   laborSettings: {
        //     workers: [{ type: '조공', cost: 0 }],
        //     productivity: 0,
        //     compensation: 0,
        //   },
        //   workType1: '경량',
        //   workType2: '경량',
        //   location: '벽체',
        //   work: '',
        // },
        // {
        //   id: 'FT012',
        //   category: 'FASTENERS',
        //   name: '메거진피스 6*25 (외날, 코팅)',
        //   spec: '구조틀용',
        //   size: '6*25',
        //   unit: 'EA',
        //   price: 10,
        //   laborCost: 0,
        //   laborProductivity: 0,
        //   laborCompensation: 0,
        //   baseLabor: 0,
        //   laborSettings: {
        //     workers: [{ type: '조공', cost: 0 }],
        //     productivity: 0,
        //     compensation: 0,
        //   },
        //   workType1: '경량',
        //   workType2: '경량',
        //   location: '벽체',
        //   work: '',
        // },
        // {
        //   id: 'FT013',
        //   category: 'FASTENERS',
        //   name: '메거진피스 3*21 (외날, 코팅)',
        //   spec: '구조틀용',
        //   size: '3*21',
        //   unit: 'EA',
        //   price: 10,
        //   laborCost: 0,
        //   laborProductivity: 0,
        //   laborCompensation: 0,
        //   baseLabor: 0,
        //   laborSettings: {
        //     workers: [{ type: '조공', cost: 0 }],
        //     productivity: 0,
        //     compensation: 0,
        //   },
        //   workType1: '경량',
        //   workType2: '경량',
        //   location: '벽체',
        //   work: '',
        // },
        // {
        //   id: 'FT010',
        //   category: 'FASTENERS',
        //   name: '타정총알',
        //   spec: '구조틀용(50형-75형)',
        //   size: 'DN22',
        //   unit: 'EA',
        //   price: 28,
        //   laborCost: 0,
        //   laborProductivity: 0,
        //   laborCompensation: 0,
        //   baseLabor: 0,
        //   laborSettings: {
        //     workers: [{ type: '조공', cost: 0 }],
        //     productivity: 0,
        //     compensation: 0,
        //   },
        //   workType1: '경량',
        //   workType2: '경량',
        //   location: '벽체',
        //   work: '',
        // },
        // {
        //   id: 'FT015',
        //   category: 'FASTENERS',
        //   name: '타정총알',
        //   spec: '구조틀용',
        //   size: 'DN27',
        //   unit: 'EA',
        //   price: 28,
        //   laborCost: 0,
        //   laborProductivity: 0,
        //   laborCompensation: 0,
        //   baseLabor: 0,
        //   laborSettings: {
        //     workers: [{ type: '조공', cost: 0 }],
        //     productivity: 0,
        //     compensation: 0,
        //   },
        //   workType1: '경량',
        //   workType2: '경량',
        //   location: '벽체',
        //   work: '',
        // },
        // {
        //   id: 'FT016',
        //   category: 'FASTENERS',
        //   name: '타정총알',
        //   spec: '구조틀용',
        //   size: 'DN32',
        //   unit: 'EA',
        //   price: 30,
        //   laborCost: 0,
        //   laborProductivity: 0,
        //   laborCompensation: 0,
        //   baseLabor: 0,
        //   laborSettings: {
        //     workers: [{ type: '조공', cost: 0 }],
        //     productivity: 0,
        //     compensation: 0,
        //   },
        //   workType1: '경량',
        //   workType2: '경량',
        //   location: '벽체',
        //   work: '',
        // },
        {
          id: 'FT010',
          category: 'FASTENERS',
          name: '타정총알',
          spec: '구조틀용(50형-75형)',
          size: 'DN37',
          unit: 'EA',
          price: 35,
          laborCost: 597,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'FT011',
          category: 'FASTENERS',
          name: '타정총알',
          spec: '구조틀용(80형-100형)',
          size: 'DN37',
          unit: 'EA',
          price: 35,
          laborCost: 682,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'FT012',
          category: 'FASTENERS',
          name: '타정총알',
          spec: '구조틀용(110형-125형)',
          size: 'DN37',
          unit: 'EA',
          price: 35,
          laborCost: 796,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'FT013',
          category: 'FASTENERS',
          name: '타정총알',
          spec: '구조틀용(130형-150형)',
          size: 'DN37',
          unit: 'EA',
          price: 35,
          laborCost: 955,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'FT014',
          category: 'FASTENERS',
          name: '타정총알',
          spec: '구조틀용(160형-200형)',
          size: 'DN37',
          unit: 'EA',
          price: 35,
          laborCost: 1194,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'FT015',
          category: 'FASTENERS',
          name: '타정총알',
          spec: 'CH구조틀용(50형-75형)',
          size: 'DN37',
          unit: 'EA',
          price: 35,
          laborCost: 597,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'FT016',
          category: 'FASTENERS',
          name: '타정총알',
          spec: 'CH구조틀용(80형-102형)',
          size: 'DN37',
          unit: 'EA',
          price: 35,
          laborCost: 682,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'FT017',
          category: 'FASTENERS',
          name: '타정총알',
          spec: 'CH구조틀용(100형-155형)',
          size: 'DN37',
          unit: 'EA',
          price: 35,
          laborCost: 796,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'FT018',
          category: 'FASTENERS',
          name: '용접봉',
          spec: '구조틀용(50형-75형)',
          size: '',
          unit: 'KG',
          price: 3000,
          laborCost: 56,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'FT019',
          category: 'FASTENERS',
          name: '용접봉',
          spec: '구조틀용(80형-100형)',
          size: '',
          unit: 'KG',
          price: 3000,
          laborCost: 65,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'FT020',
          category: 'FASTENERS',
          name: '용접봉',
          spec: '구조틀용(110형-125형)',
          size: '',
          unit: 'KG',
          price: 3000,
          laborCost: 75,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'FT021',
          category: 'FASTENERS',
          name: '용접봉',
          spec: '구조틀용(130형-150형)',
          size: '',
          unit: 'KG',
          price: 3000,
          laborCost: 91,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'FT022',
          category: 'FASTENERS',
          name: '용접봉',
          spec: '구조틀용(160형-200형)',
          size: '',
          unit: 'KG',
          price: 3000,
          laborCost: 113,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'FT023',
          category: 'FASTENERS',
          name: '용접봉',
          spec: 'CH구조틀용(50형-75형)',
          size: '',
          unit: 'KG',
          price: 3000,
          laborCost: 56,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'FT024',
          category: 'FASTENERS',
          name: '용접봉',
          spec: 'CH구조틀용(80형-102형)',
          size: '',
          unit: 'KG',
          price: 3000,
          laborCost: 65,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
        {
          id: 'FT025',
          category: 'FASTENERS',
          name: '용접봉',
          spec: 'CH구조틀용(100형-155형)',
          size: '',
          unit: 'KG',
          price: 3000,
          laborCost: 75,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '경량',
          workType2: '경량',
          location: '벽체',
          work: '',
        },
      ];
    }

    // 작업용 캐시 초기화 (원본 데이터 복사)
    if (
      !this.lightweightItemsCache ||
      this.lightweightItemsCache.length === 0
    ) {
      this.lightweightItemsCache = JSON.parse(
        JSON.stringify(this.originalLightweightData)
      );
      console.log(
        '🔄 lightweightItemsCache 초기화:',
        this.lightweightItemsCache.length
      );
    }

    return {
      categories: categories,
      items: this.lightweightItemsCache,
      total: this.lightweightItemsCache.length,
    };
  }

  // 석고보드 조회 (기존 코드 호환성)
  getGypsumBoards() {
    // 기존 49개 석고보드 데이터 사용
    const categories = {
      STANDARD: { name: '일반석고보드', displayOrder: 1 },
      MOISTURE: { name: '방수석고보드', displayOrder: 2 },
      FIRE: { name: '방화석고보드', displayOrder: 3 },
      FIRE_MOISTURE: { name: '방화방수석고보드', displayOrder: 4 },
      SOUND: { name: '차음석고보드', displayOrder: 5 },
      ANTIBACTERIAL: { name: '방균석고보드', displayOrder: 6 },
      INSULATION: { name: '그라스울', displayOrder: 7 },
    };

    // 원본 데이터 보존 (최초 1회만)
    if (!this.originalGypsumData) {
      this.originalGypsumData = [
        // 일반석고보드
        {
          id: 'GB001',
          category: 'STANDARD',
          item: '석고보드',
          name: '일반석고보드',
          spec: '9.5T*1PLY',
          w: 900,
          h: 1800,
          t: 9.5,
          unit: '매',
          qty: 1.0,
          unitPrice: 3650, //장당단가
          materialCost: 2254,
          laborCost: 2048,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '건자재',
          workType2: '경량',
          location: '벽체',
          work: '석고보드 설치',
        },
        {
          id: 'GB002',
          category: 'STANDARD',
          item: '석고보드',
          name: '일반석고보드',
          spec: '12.5T*1PLY',
          w: 900,
          h: 1800,
          t: 12.5,
          unit: '매',
          qty: 1.0,
          unitPrice: 4900,
          materialCost: 3025,
          laborCost: 2048,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '건자재',
          workType2: '경량',
          location: '벽체',
          work: '석고보드 설치',
        },
        {
          id: 'GB003',
          category: 'STANDARD',
          item: '석고보드',
          name: '일반석고보드',
          spec: '15.0T*1PLY',
          w: 900,
          h: 1800,
          t: 15.0,
          unit: '매',
          qty: 1.0,
          unitPrice: 6140,
          materialCost: 3791,
          laborCost: 2275,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '건자재',
          workType2: '경량',
          location: '벽체',
          work: '석고보드 설치',
        },
        {
          id: 'GB004',
          category: 'STANDARD',
          item: '석고보드',
          name: '일반석고보드',
          spec: '9.5T*3*8*1PLY',
          w: 900,
          h: 2400,
          t: 9.5,
          unit: '매',
          qty: 1.0,
          unitPrice: 4990,
          materialCost: 2311,
          laborCost: 2275,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '건자재',
          workType2: '경량',
          location: '벽체',
          work: '석고보드 설치',
        },
        {
          id: 'GB005',
          category: 'STANDARD',
          item: '석고보드',
          name: '일반석고보드',
          spec: '12.5T*3*8*1PLY',
          w: 900,
          h: 2400,
          t: 12.5,
          unit: '매',
          qty: 1.0,
          unitPrice: 6700,
          materialCost: 3102,
          laborCost: 2275,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '건자재',
          workType2: '경량',
          location: '벽체',
          work: '석고보드 설치',
        },
        {
          id: 'GB006',
          category: 'STANDARD',
          item: '석고보드',
          name: '일반석고보드',
          spec: '15T*3*8*1PLY',
          w: 900,
          h: 2400,
          t: 15,
          unit: '매',
          qty: 1.0,
          unitPrice: 8190,
          materialCost: 3792,
          laborCost: 2409,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '건자재',
          workType2: '경량',
          location: '벽체',
          work: '석고보드 설치',
        },
        {
          id: 'GB007',
          category: 'STANDARD',
          item: '석고보드',
          name: '일반석고보드',
          spec: '12.5T*4*8*1PLY',
          w: 1200,
          h: 2400,
          t: 12.5,
          unit: '매',
          qty: 1.0,
          unitPrice: 8930,
          materialCost: 3101,
          laborCost: 2409,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '건자재',
          workType2: '경량',
          location: '벽체',
          work: '석고보드 설치',
        },
        {
          id: 'GB008',
          category: 'STANDARD',
          item: '석고보드',
          name: '일반석고보드',
          spec: '15T*4*8*1PLY',
          w: 1200,
          h: 2400,
          t: 15,
          unit: '매',
          qty: 1.0,
          unitPrice: 10930,
          materialCost: 3796,
          laborCost: 2409,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '건자재',
          workType2: '경량',
          location: '벽체',
          work: '석고보드 설치',
        },
        // 방수석고보드
        {
          id: 'GM001',
          category: 'MOISTURE',
          item: '석고보드',
          name: '방수석고보드',
          spec: '9.5T*1PLY',
          w: 900,
          h: 1800,
          t: 9.5,
          unit: '매',
          qty: 1.0,
          unitPrice: 5900,
          materialCost: 3642,
          laborCost: 2275,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '건자재',
          workType2: '경량',
          location: '벽체',
          work: '석고보드 설치',
        },
        {
          id: 'GM002',
          category: 'MOISTURE',
          item: '석고보드',
          name: '방수석고보드',
          spec: '12.5T*1PLY',
          w: 900,
          h: 1800,
          t: 12.5,
          unit: '매',
          qty: 1.0,
          unitPrice: 8400,
          materialCost: 5186,
          laborCost: 2275,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '건자재',
          workType2: '경량',
          location: '벽체',
          work: '석고보드 설치',
        },
        {
          id: 'GM003',
          category: 'MOISTURE',
          item: '석고보드',
          name: '방수석고보드',
          spec: '15.0T*1PLY',
          w: 900,
          h: 1800,
          t: 15.0,
          unit: '매',
          qty: 1.0,
          unitPrice: 11610,
          materialCost: 7167,
          laborCost: 2409,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '건자재',
          workType2: '경량',
          location: '벽체',
          work: '석고보드 설치',
        },
        // 방화석고보드
        {
          id: 'GF001',
          category: 'FIRE',
          item: '석고보드',
          name: '방화석고보드',
          spec: '12.5T*1PLY',
          w: 900,
          h: 1800,
          t: 12.5,
          unit: '매',
          qty: 1.0,
          unitPrice: 6350,
          materialCost: 3920,
          laborCost: 2559,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '건자재',
          workType2: '경량',
          location: '벽체',
          work: '석고보드 설치',
        },
        {
          id: 'GF002',
          category: 'FIRE',
          item: '석고보드',
          name: '방화석고보드',
          spec: '15.0T*1PLY',
          w: 900,
          h: 1800,
          t: 15.0,
          unit: '매',
          qty: 1.0,
          unitPrice: 7900,
          materialCost: 4877,
          laborCost: 2730,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '건자재',
          workType2: '경량',
          location: '벽체',
          work: '석고보드 설치',
        },
        {
          id: 'GF003',
          category: 'FIRE',
          item: '석고보드',
          name: '방화석고보드',
          spec: '19.0T*1PLY',
          w: 900,
          h: 1800,
          t: 19.0,
          unit: '매',
          qty: 1.0,
          unitPrice: 11230,
          materialCost: 6933,
          laborCost: 2730,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '건자재',
          workType2: '경량',
          location: '벽체',
          work: '석고보드 설치',
        },
        {
          id: 'GF004',
          category: 'FIRE',
          item: '석고보드',
          name: '방화석고보드',
          spec: '25T*2*6*1PLY',
          w: 600,
          h: 1800,
          t: 25.0,
          unit: '매',
          qty: 1.0,
          unitPrice: 10630,
          materialCost: 9843,
          laborCost: 2730,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '건자재',
          workType2: '경량',
          location: '벽체',
          work: '석고보드 설치',
        },
        // 차음석고보드
        {
          id: 'GS001',
          category: 'SOUND',
          item: '석고보드',
          name: '차음석고보드',
          spec: '9.5T*1PLY',
          w: 900,
          h: 1800,
          t: 9.5,
          unit: '매',
          qty: 1.0,
          unitPrice: 4350,
          materialCost: 2686,
          laborCost: 2275,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '건자재',
          workType2: '경량',
          location: '벽체',
          work: '석고보드 설치',
        },
        {
          id: 'GS002',
          category: 'SOUND',
          item: '석고보드',
          name: '차음석고보드',
          spec: '12.5T*1PLY',
          w: 900,
          h: 1800,
          t: 12.5,
          unit: '매',
          qty: 1.0,
          unitPrice: 5750,
          materialCost: 3550,
          laborCost: 2275,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '건자재',
          workType2: '경량',
          location: '벽체',
          work: '석고보드 설치',
        },
        {
          id: 'GS003',
          category: 'SOUND',
          item: '석고보드',
          name: '차음석고보드',
          spec: '15.0T*1PLY',
          w: 900,
          h: 1800,
          t: 15.0,
          unit: '매',
          qty: 1.0,
          unitPrice: 7120,
          materialCost: 4396,
          laborCost: 2409,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '건자재',
          workType2: '경량',
          location: '벽체',
          work: '석고보드 설치',
        },
        // 그라스울
        {
          id: 'GW001',
          category: 'INSULATION',
          item: '그라스울',
          name: '그라스울',
          spec: '24K*50T',
          w: 450,
          h: 1000,
          t: 50.0,
          unit: 'M2',
          qty: 1.0,
          unitPrice: 3300,
          materialCost: 3300,
          laborCost: 1978,
          laborProductivity: 0,
          laborCompensation: 0,
          baseLabor: 0,
          laborSettings: {
            workers: [{ type: '조공', cost: 0 }],
            productivity: 0,
            compensation: 0,
          },
          workType1: '건자재',
          workType2: '경량',
          location: '벽체',
          work: '그라스울 설치',
          note: '1매 - (0.45m2)',
        },
      ];
    }

    // 작업용 캐시 초기화 (원본 데이터 복사)
    if (!this.gypsumItemsCache || this.gypsumItemsCache.length === 0) {
      this.gypsumItemsCache = JSON.parse(
        JSON.stringify(this.originalGypsumData)
      );
      console.log('🔄 gypsumItemsCache 초기화:', this.gypsumItemsCache.length);
    }

    return {
      categories: categories,
      items: this.gypsumItemsCache,
      total: this.gypsumItemsCache.length,
    };
  }

  // 동기 버전의 자재 조회 (기존 코드 호환성)
  findMaterialByIdSync(id) {
    return this.cache.get(id) || null;
  }

  // 카테고리별 동기 조회 (기존 코드 호환성)
  findMaterialsByCategorySync(category) {
    return this.getCachedMaterials().filter(
      (material) => material.category === category
    );
  }

  // 경량 자재 ID로 조회 (기존 코드 호환성)
  findLightweightComponentById(materialId) {
    const lightweightData = this.getLightweightComponents();
    return lightweightData.items.find((item) => item.id === materialId) || null;
  }

  // 석고보드 ID로 조회 (기존 코드 호환성)
  findGypsumBoardById(materialId) {
    const gypsumData = this.getGypsumBoards();
    return gypsumData.items.find((item) => item.id === materialId) || null;
  }

  // 경량 자재 추가 (기존 코드 호환성)
  async addLightweightComponent(materialData) {
    try {
      // 캐시 초기화 강제
      this.getLightweightComponents();

      // 새로운 ID 생성 (현재 최대 ID + 1) - 빈 배열 처리 추가
      let maxId = 0;
      if (this.lightweightItemsCache && this.lightweightItemsCache.length > 0) {
        maxId = Math.max(
          ...this.lightweightItemsCache.map(
            (item) => parseInt(item.id?.replace(/[A-Z]/g, '')) || 0
          )
        );
      }
      const newId = `LC${String(maxId + 1).padStart(3, '0')}`;

      // 새 자재 생성 (입력된 노무비 설정 사용)
      const newMaterial = {
        id: newId,
        name: materialData.name,
        category: materialData.category,
        spec: materialData.spec,
        unit: materialData.unit,
        price: materialData.price,
        note: materialData.note || '',
        laborCost: materialData.laborCost || 0,
        laborProductivity: materialData.laborProductivity || 0,
        laborCompensation: materialData.laborCompensation || 0,
        baseLabor: materialData.baseLabor || 0,
        laborSettings: materialData.laborSettings || {
          workers: [{ type: '조공', cost: 0 }],
          productivity: 0,
          compensation: 0,
        },
        workType1: materialData.workType1 || '경량',
        workType2: materialData.workType2 || '경량',
        location: materialData.location || '벽체',
        work: materialData.work || '',
      };

      // 메모리 내 데이터에 추가
      this.lightweightItemsCache.push(newMaterial);

      // 수정사항 추적
      this.modifications.lightweightComponents.added.push({
        ...newMaterial,
        timestamp: new Date().toISOString(),
      });

      // IndexedDB에 저장
      try {
        await this.lightweightComponents.put(newMaterial);
        console.log('✅ 경량부품 IndexedDB 저장 완료:', newId);
      } catch (dbError) {
        console.error('❌ 경량부품 IndexedDB 저장 실패:', dbError);
      }

      console.log('경량 자재 추가:', newId, materialData);

      return newMaterial;
    } catch (error) {
      console.error('경량 자재 추가 오류:', error);
      throw error;
    }
  }

  // 경량 자재 업데이트 (기존 코드 호환성)
  updateLightweightComponent(materialId, updateData) {
    try {
      // 캐시 초기화 강제
      this.getLightweightComponents();

      const materialIndex = this.lightweightItemsCache.findIndex(
        (item) => item.id === materialId
      );

      if (materialIndex === -1) {
        console.error('자재를 찾을 수 없습니다:', materialId);
        return false;
      }

      // 원본 데이터 찾기
      const originalMaterial = this.originalLightweightData.find(
        (item) => item.id === materialId
      );
      const currentMaterial = this.lightweightItemsCache[materialIndex];

      // 자재 업데이트
      const updatedMaterial = {
        ...currentMaterial,
        ...updateData,
      };

      // 메모리 내 데이터 업데이트
      this.lightweightItemsCache[materialIndex] = updatedMaterial;

      // 수정사항 추적 (원본과 비교)
      if (originalMaterial) {
        // 기존 수정사항에서 제거
        const modifiedIndex =
          this.modifications.lightweightComponents.modified.findIndex(
            (item) => item.id === materialId
          );
        if (modifiedIndex !== -1) {
          this.modifications.lightweightComponents.modified.splice(
            modifiedIndex,
            1
          );
        }

        // 원본과 다른 경우에만 수정사항에 추가
        if (
          JSON.stringify(originalMaterial) !== JSON.stringify(updatedMaterial)
        ) {
          this.modifications.lightweightComponents.modified.push({
            id: materialId,
            original: originalMaterial,
            current: updatedMaterial,
            timestamp: new Date().toISOString(),
          });
        }
      }

      console.log('경량 자재 업데이트:', materialId, updateData);

      return true;
    } catch (error) {
      console.error('경량 자재 업데이트 오류:', error);
      return false;
    }
  }

  // 경량 자재 삭제 (기존 코드 호환성)
  deleteLightweightComponent(materialId) {
    try {
      // 캐시 초기화 강제
      this.getLightweightComponents();

      const materialIndex = this.lightweightItemsCache.findIndex(
        (item) => item.id === materialId
      );

      if (materialIndex === -1) {
        console.error('자재를 찾을 수 없습니다:', materialId);
        return false;
      }

      // 메모리 내 데이터에서 제거
      const removedMaterial = this.lightweightItemsCache.splice(
        materialIndex,
        1
      )[0];

      // 수정사항 추적
      const originalMaterial = this.originalLightweightData.find(
        (item) => item.id === materialId
      );
      if (originalMaterial) {
        // 원본에 있던 것이므로 삭제 추적
        this.modifications.lightweightComponents.deleted.push({
          ...removedMaterial,
          timestamp: new Date().toISOString(),
        });

        // 기존 수정사항에서 제거
        const modifiedIndex =
          this.modifications.lightweightComponents.modified.findIndex(
            (item) => item.id === materialId
          );
        if (modifiedIndex !== -1) {
          this.modifications.lightweightComponents.modified.splice(
            modifiedIndex,
            1
          );
        }
      } else {
        // 추가했던 것이므로 추가 목록에서 제거
        const addedIndex =
          this.modifications.lightweightComponents.added.findIndex(
            (item) => item.id === materialId
          );
        if (addedIndex !== -1) {
          this.modifications.lightweightComponents.added.splice(addedIndex, 1);
        }
      }

      console.log('경량 자재 삭제:', materialId, removedMaterial);

      return true;
    } catch (error) {
      console.error('경량 자재 삭제 오류:', error);
      return false;
    }
  }

  // 석고보드 추가 (기존 코드 호환성)
  addGypsumBoard(materialData) {
    try {
      // 캐시 초기화 강제
      this.getGypsumBoards();

      // 새로운 ID 생성 (현재 최대 ID + 1)
      const maxId = Math.max(
        ...this.gypsumItemsCache.map(
          (item) => parseInt(item.id.replace(/[A-Z]/g, '')) || 0
        )
      );
      const newId = `GB${String(maxId + 1).padStart(3, '0')}`;

      // 새 석고보드 생성 (기본 노무비 설정 포함)
      const newMaterial = {
        id: newId,
        item: '석고보드',
        name: materialData.name,
        category: materialData.category,
        spec: `${materialData.t}T*1PLY`,
        w: materialData.w,
        h: materialData.h,
        t: materialData.t,
        unit: materialData.unit,
        qty: materialData.qty,
        unitPrice: materialData.priceOriginal,
        materialCost: Math.round(materialData.priceOriginal * 0.618),
        laborCost: 0,
        laborProductivity: 0,
        laborCompensation: 0,
        baseLabor: 0,
        laborSettings: {
          workers: [{ type: '조공', cost: 0 }],
          productivity: 0,
          compensation: 0,
        },
        workType1: '건자재',
        workType2: '경량',
        location: '벽체',
        work: '석고보드 설치',
        note: materialData.note || '',
      };

      // 메모리 내 데이터에 추가
      this.gypsumItemsCache.push(newMaterial);

      // 수정사항 추적
      this.modifications.gypsumBoards.added.push({
        ...newMaterial,
        timestamp: new Date().toISOString(),
      });

      console.log('석고보드 추가:', newId, materialData);

      return newMaterial;
    } catch (error) {
      console.error('석고보드 추가 오류:', error);
      throw error;
    }
  }

  // 석고보드 업데이트 (기존 코드 호환성)
  updateGypsumBoard(materialId, updateData) {
    try {
      // 캐시 초기화 강제
      this.getGypsumBoards();

      const materialIndex = this.gypsumItemsCache.findIndex(
        (item) => item.id === materialId
      );

      if (materialIndex === -1) {
        console.error('석고보드를 찾을 수 없습니다:', materialId);
        return false;
      }

      // 석고보드 업데이트
      const updatedMaterial = {
        ...this.gypsumItemsCache[materialIndex],
        ...updateData,
      };

      // 메모리 내 데이터 업데이트
      this.gypsumItemsCache[materialIndex] = updatedMaterial;

      // 수정사항 추적 (원본과 비교)
      const originalMaterial = this.originalGypsumData.find(
        (item) => item.id === materialId
      );
      if (originalMaterial) {
        // 기존 수정사항에서 제거
        const modifiedIndex =
          this.modifications.gypsumBoards.modified.findIndex(
            (item) => item.id === materialId
          );
        if (modifiedIndex !== -1) {
          this.modifications.gypsumBoards.modified.splice(modifiedIndex, 1);
        }

        // 원본과 다른 경우에만 수정사항에 추가
        if (
          JSON.stringify(originalMaterial) !== JSON.stringify(updatedMaterial)
        ) {
          this.modifications.gypsumBoards.modified.push({
            id: materialId,
            original: originalMaterial,
            current: updatedMaterial,
            timestamp: new Date().toISOString(),
          });
        }
      }

      console.log('석고보드 업데이트:', materialId, updateData);

      return true;
    } catch (error) {
      console.error('석고보드 업데이트 오류:', error);
      return false;
    }
  }

  // 석고보드 삭제 (기존 코드 호환성)
  deleteGypsumBoard(materialId) {
    try {
      // 캐시 초기화 강제
      this.getGypsumBoards();

      const materialIndex = this.gypsumItemsCache.findIndex(
        (item) => item.id === materialId
      );

      if (materialIndex === -1) {
        console.error('석고보드를 찾을 수 없습니다:', materialId);
        return false;
      }

      // 메모리 내 데이터에서 제거
      const removedMaterial = this.gypsumItemsCache.splice(materialIndex, 1)[0];

      // 수정사항 추적
      const originalMaterial = this.originalGypsumData.find(
        (item) => item.id === materialId
      );
      if (originalMaterial) {
        // 원본에 있던 것이므로 삭제 추적
        this.modifications.gypsumBoards.deleted.push({
          ...removedMaterial,
          timestamp: new Date().toISOString(),
        });

        // 기존 수정사항에서 제거
        const modifiedIndex =
          this.modifications.gypsumBoards.modified.findIndex(
            (item) => item.id === materialId
          );
        if (modifiedIndex !== -1) {
          this.modifications.gypsumBoards.modified.splice(modifiedIndex, 1);
        }
      } else {
        // 추가했던 것이므로 추가 목록에서 제거
        const addedIndex = this.modifications.gypsumBoards.added.findIndex(
          (item) => item.id === materialId
        );
        if (addedIndex !== -1) {
          this.modifications.gypsumBoards.added.splice(addedIndex, 1);
        }
      }

      console.log('석고보드 삭제:', materialId, removedMaterial);

      return true;
    } catch (error) {
      console.error('석고보드 삭제 오류:', error);
      return false;
    }
  }

  // 벽체 CRUD API 연결 메소드들
  async createWall(wallData) {
    try {
      const response = await this.materialService.post('/walls', wallData);
      if (response.success) {
        this.emit('wallCreated', response.data);
        return response.data;
      }
      throw new Error(response.message || '벽체 생성 실패');
    } catch (error) {
      console.error('벽체 생성 오류:', error);
      throw error;
    }
  }

  async updateWall(wallId, wallData) {
    try {
      const response = await this.materialService.put(
        `/walls/${wallId}`,
        wallData
      );
      if (response.success) {
        this.emit('wallUpdated', response.data);
        return response.data;
      }
      throw new Error(response.message || '벽체 수정 실패');
    } catch (error) {
      console.error('벽체 수정 오류:', error);
      throw error;
    }
  }

  async deleteWall(wallId) {
    try {
      const response = await this.materialService.delete(`/walls/${wallId}`);
      if (response.success) {
        this.emit('wallDeleted', wallId);
        return true;
      }
      throw new Error(response.message || '벽체 삭제 실패');
    } catch (error) {
      console.error('벽체 삭제 오류:', error);
      throw error;
    }
  }

  async getAllWalls() {
    try {
      const response = await this.materialService.get('/walls');
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || '벽체 조회 실패');
    } catch (error) {
      console.error('벽체 조회 오류:', error);
      throw error;
    }
  }

  async getWallById(wallId) {
    try {
      const response = await this.materialService.get(`/walls/${wallId}`);
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || '벽체 조회 실패');
    } catch (error) {
      console.error('벽체 조회 오류:', error);
      throw error;
    }
  }

  // 데이터 관리 기능들

  // 현재 상태 저장
  async saveCurrentState() {
    const currentState = {
      lightweightComponents: this.lightweightItemsCache
        ? JSON.parse(JSON.stringify(this.lightweightItemsCache))
        : [],
      gypsumBoards: this.gypsumItemsCache
        ? JSON.parse(JSON.stringify(this.gypsumItemsCache))
        : [],
      modifications: JSON.parse(JSON.stringify(this.modifications)),
      savedAt: new Date().toISOString(),
    };

    try {
      // 1. localStorage 백업 저장 (기존 방식)
      localStorage.setItem(
        'kiyeno_material_state',
        JSON.stringify(currentState)
      );

      // 2. IndexedDB 저장 (새로 추가)
      await this.saveToIndexedDB(currentState);

      // 3. 자재 데이터 업데이트 이벤트 발생 (일위대가 관리 동기화용)
      console.log('📡 자재 데이터 저장 완료 이벤트 발생...');
      this.triggerMaterialDataUpdateEvent();

      console.log(
        '✅ 현재 상태 저장 완료 (localStorage + IndexedDB + 이벤트 발생)'
      );
      return currentState;
    } catch (error) {
      console.error('❌ 상태 저장 실패:', error);
      // localStorage라도 저장되었으므로 상태는 반환
      return currentState;
    }
  }

  // IndexedDB에 데이터 저장하는 헬퍼 함수 (v2 호환)
  async saveToIndexedDB(currentState) {
    console.log('📦 IndexedDB v2 저장 시작...');
    let savedCount = 0;

    try {
      // v2 데이터베이스에 직접 연결
      const db = await this.openDatabaseV2();

      // 저장 전 캐시 무효화 (자재 선택에서 최신 데이터 반영을 위해)
      console.log('🔄 저장 전 캐시 무효화...');
      this.lightweightItemsCache = null;
      this.gypsumItemsCache = null;

      // 단일 트랜잭션으로 모든 데이터 저장
      const transaction = db.transaction(['materials'], 'readwrite');
      const store = transaction.objectStore('materials');

      // 기존 데이터 삭제
      await store.clear();
      console.log('🗑️ 기존 자재 데이터 삭제 완료');

      // 경량자재 저장
      if (
        currentState.lightweightComponents &&
        currentState.lightweightComponents.length > 0
      ) {
        console.log(
          `📦 경량자재 ${currentState.lightweightComponents.length}개 저장 중...`
        );

        for (const material of currentState.lightweightComponents) {
          try {
            // v2 호환 형식으로 데이터 변환 - 테이블에서 실제 사용하는 필드만 저장
            const materialData = {
              // 테이블 필수 필드들 (12개)
              id: material.id,
              name: material.name,
              spec: material.spec,
              size: material.size,
              unit: material.unit,
              price: material.price,
              laborCost: material.laborCost || 0,
              laborProductivity: material.laborProductivity || 0,
              laborCompensation: material.laborCompensation || 0,
              workType1: material.workType1 || '',
              workType2: material.workType2 || '',
              location: material.location || '',
              work: material.work || '',
              note: material.note || '',

              // 일위대가 관리 호환성 필드 (2개)
              재료비단가: material.price,
              노무비단가: material.laborCost || 0,

              // 최소 메타데이터 (3개)
              category: 'lightweight',
              originalCategory: material.category,
              updatedAt: new Date().toISOString(),
            };

            await store.put(materialData);
            savedCount++;
          } catch (error) {
            console.warn(`경량자재 저장 실패 (${material.name}):`, error);
          }
        }
        console.log(`✅ 경량자재 ${savedCount}개 저장 완료`);
      }

      // 석고보드 저장
      if (currentState.gypsumBoards && currentState.gypsumBoards.length > 0) {
        console.log(
          `📦 석고보드 ${currentState.gypsumBoards.length}개 저장 중...`
        );

        for (const material of currentState.gypsumBoards) {
          try {
            // v2 호환 형식으로 데이터 변환 - 테이블에서 실제 사용하는 필드만 저장
            const materialData = {
              // 테이블 필수 필드들 (18개)
              id: material.id,
              item: material.item || '석고보드',
              name: material.name,
              spec: material.spec,
              w: material.w,
              h: material.h,
              t: material.t,
              unit: material.unit,
              qty: material.qty || 1.0,
              unitPrice: material.priceChanged || material.unitPrice || 0,
              materialCost: material.materialCost || 0,
              laborCost: material.laborCost || 0,
              laborProductivity: material.laborProductivity || 0,
              laborCompensation: material.laborCompensation || 0,
              workType1: material.workType1 || '',
              workType2: material.workType2 || '',
              location: material.location || '',
              work: material.work || '석고보드 설치',

              // 일위대가 관리 호환성 필드 (2개)
              재료비단가: material.materialCost || 0,
              노무비단가: material.laborCost || 0,

              // 최소 메타데이터 (3개)
              category: 'gypsum',
              originalCategory: material.category,
              updatedAt: new Date().toISOString(),
            };

            await store.put(materialData);
            savedCount++;
          } catch (error) {
            console.warn(`석고보드 저장 실패 (${material.name}):`, error);
          }
        }
      }

      // 트랜잭션 완료 대기
      await new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });

      db.close();
      console.log(`📦 IndexedDB v2 저장 완료: ${savedCount}개 자재`);

      // 저장 완료 후 전역 캐시 무효화 이벤트 발생
      console.log('📡 자재 데이터 저장 완료 이벤트 발생...');
      this.triggerMaterialDataUpdateEvent();
    } catch (error) {
      console.error('❌ IndexedDB v2 저장 실패:', error);
      throw error;
    }
  }

  // v2 데이터베이스 직접 열기
  async openDatabaseV2() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('KiyenoMaterialsDB', 3);

      request.onerror = () => {
        console.error('❌ KiyenoMaterialsDB v2 열기 실패');
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // materials 테이블이 없으면 생성
        if (!db.objectStoreNames.contains('materials')) {
          const materialsStore = db.createObjectStore('materials', {
            keyPath: 'id',
          });
          materialsStore.createIndex('name', 'name', { unique: false });
          materialsStore.createIndex('category', 'category', { unique: false });
        }

        // unitPrices 테이블이 없으면 생성 (일위대가용)
        if (!db.objectStoreNames.contains('unitPrices')) {
          const unitPricesStore = db.createObjectStore('unitPrices', {
            keyPath: 'id',
          });
          unitPricesStore.createIndex('itemName', 'basic.itemName', {
            unique: false,
          });
          unitPricesStore.createIndex('createdAt', 'createdAt', {
            unique: false,
          });
        }
      };
    });
  }

  // 자재 데이터 업데이트 이벤트 발생 (다른 모듈에서 캐시 무효화를 위해)
  triggerMaterialDataUpdateEvent() {
    // 전역 이벤트 발생 (일위대가 관리 등에서 감지)
    const event = new CustomEvent('materialDataUpdated', {
      detail: {
        timestamp: new Date().toISOString(),
        message: '자재 데이터가 업데이트되었습니다',
      },
    });
    window.dispatchEvent(event);
    console.log('📡 materialDataUpdated 이벤트 발생됨');
  }

  // 저장된 상태 불러오기
  loadSavedState() {
    const savedState = localStorage.getItem('kiyeno_material_state');
    if (savedState) {
      const state = JSON.parse(savedState);
      this.lightweightItemsCache = state.lightweightComponents || [];
      this.gypsumItemsCache = state.gypsumBoards || [];
      this.modifications = state.modifications || {
        lightweightComponents: { added: [], modified: [], deleted: [] },
        gypsumBoards: { added: [], modified: [], deleted: [] },
      };
      console.log('✅ 저장된 상태 불러오기 완료');
      return state;
    }
    return null;
  }

  // 전체 데이터 내보내기
  exportAllData() {
    const allData = {
      lightweightComponents: this.lightweightItemsCache
        ? JSON.parse(JSON.stringify(this.lightweightItemsCache))
        : [],
      gypsumBoards: this.gypsumItemsCache
        ? JSON.parse(JSON.stringify(this.gypsumItemsCache))
        : [],
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        totalLightweightComponents: this.lightweightItemsCache
          ? this.lightweightItemsCache.length
          : 0,
        totalGypsumBoards: this.gypsumItemsCache
          ? this.gypsumItemsCache.length
          : 0,
      },
      modifications: this.modifications,
    };

    console.log('✅ 전체 데이터 내보내기 완료');
    return allData;
  }

  // 전체 데이터 가져오기
  importAllData(importedData) {
    try {
      if (!importedData || typeof importedData !== 'object') {
        throw new Error('유효하지 않은 데이터 형식입니다.');
      }

      // 데이터 유효성 검사
      if (!importedData.lightweightComponents || !importedData.gypsumBoards) {
        throw new Error(
          '필수 데이터가 없습니다. (lightweightComponents, gypsumBoards)'
        );
      }

      // 데이터 가져오기
      this.lightweightItemsCache = JSON.parse(
        JSON.stringify(importedData.lightweightComponents)
      );
      this.gypsumItemsCache = JSON.parse(
        JSON.stringify(importedData.gypsumBoards)
      );

      // 수정사항 정보가 있으면 복원
      if (importedData.modifications) {
        this.modifications = JSON.parse(
          JSON.stringify(importedData.modifications)
        );
      } else {
        // 수정사항 정보가 없으면 초기화
        this.modifications = {
          lightweightComponents: { added: [], modified: [], deleted: [] },
          gypsumBoards: { added: [], modified: [], deleted: [] },
        };
      }

      console.log('✅ 전체 데이터 가져오기 완료');
      return {
        success: true,
        lightweightCount: this.lightweightItemsCache.length,
        gypsumCount: this.gypsumItemsCache.length,
      };
    } catch (error) {
      console.error('❌ 데이터 가져오기 실패:', error);
      throw error;
    }
  }

  // 원본으로 초기화
  resetToOriginal() {
    if (this.originalLightweightData) {
      this.lightweightItemsCache = JSON.parse(
        JSON.stringify(this.originalLightweightData)
      );
    }
    if (this.originalGypsumData) {
      this.gypsumItemsCache = JSON.parse(
        JSON.stringify(this.originalGypsumData)
      );
    }

    // 수정사항 초기화
    this.modifications = {
      lightweightComponents: { added: [], modified: [], deleted: [] },
      gypsumBoards: { added: [], modified: [], deleted: [] },
    };

    // 저장된 상태 제거
    localStorage.removeItem('kiyeno_material_state');

    console.log('✅ 원본으로 초기화 완료');
    return true;
  }

  // 데이터 상태 조회
  getDataStatus() {
    const summary = {
      lightweightComponents: {
        added: this.modifications.lightweightComponents.added.length,
        modified: this.modifications.lightweightComponents.modified.length,
        deleted: this.modifications.lightweightComponents.deleted.length,
      },
      gypsumBoards: {
        added: this.modifications.gypsumBoards.added.length,
        modified: this.modifications.gypsumBoards.modified.length,
        deleted: this.modifications.gypsumBoards.deleted.length,
      },
    };

    const total =
      summary.lightweightComponents.added +
      summary.lightweightComponents.modified +
      summary.lightweightComponents.deleted +
      summary.gypsumBoards.added +
      summary.gypsumBoards.modified +
      summary.gypsumBoards.deleted;

    return {
      status: total > 0 ? '수정됨' : '원본',
      summary: { ...summary, total },
      lastModified: new Date().toISOString(),
    };
  }

  /**
   * 저장된 상태 불러오기 (호환성 메서드)
   */
  loadSavedState() {
    const savedState = localStorage.getItem('kiyeno_material_state');
    if (savedState) {
      const state = JSON.parse(savedState);
      this.lightweightItemsCache = state.lightweightComponents || [];
      this.gypsumItemsCache = state.gypsumBoards || [];
      this.modifications = state.modifications || {
        lightweightComponents: { added: [], modified: [], deleted: [] },
        gypsumBoards: { added: [], modified: [], deleted: [] },
      };
      console.log('✅ 저장된 상태 불러오기 완료');
      return state;
    }
    return null;
  }

  /**
   * 정리 작업
   */
  destroy() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.cache.clear();
    this.isInitialized = false;
  }
}

// 싱글톤 인스턴스 생성
const priceDatabase = new PriceDatabase();

// 전역 변수로 할당 (다른 모듈에서 접근 가능하도록)
window.priceDatabase = priceDatabase;

export default priceDatabase;
