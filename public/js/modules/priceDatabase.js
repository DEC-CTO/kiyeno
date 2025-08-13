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
      const request = indexedDB.open('KiyenoDB', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // 자재 저장소 생성
        if (!db.objectStoreNames.contains('materials')) {
          const materialsStore = db.createObjectStore('materials', {
            keyPath: 'id',
          });
          materialsStore.createIndex('category', 'category', { unique: false });
          materialsStore.createIndex('name', 'name', { unique: false });
        }

        // 설정 저장소 생성
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
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
      dbVersion: '1.0.0',
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
    // 기존 55개 경량 자재 데이터 사용
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
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
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
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
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
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
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
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
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
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
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
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
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
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
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
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
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
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
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
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
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
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
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
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
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
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
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
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
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
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
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
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },
        {
          id: 'ST017',
          category: 'STUD_KS',
          name: '스터드 펀칭비',
          spec: '',
          size: '',
          unit: 'EA',
          price: 50,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
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
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
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
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
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
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
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
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
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
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
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
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
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
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
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
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
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
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
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
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
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
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
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
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
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
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
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
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
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
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
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
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },

        // STUD - BS형
        {
          id: 'SB001',
          category: 'STUD_BS',
          name: '메탈 스터드 50형 (BS)',
          spec: '50형',
          size: '0.65T*50*45',
          unit: 'M',
          price: 990,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },
        {
          id: 'SB002',
          category: 'STUD_BS',
          name: '메탈 스터드 65형 (BS)',
          spec: '65형',
          size: '0.65T*65*45',
          unit: 'M',
          price: 1080,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },
        {
          id: 'SB003',
          category: 'STUD_BS',
          name: '메탈 스터드 32형',
          spec: '32형',
          size: '0.65T*32*32',
          unit: 'M',
          price: 740,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },
        {
          id: 'SB004',
          category: 'STUD_BS',
          name: '메탈 스터드 42형',
          spec: '42형',
          size: '0.65T*42*32',
          unit: 'M',
          price: 800,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },
        {
          id: 'SB005',
          category: 'STUD_BS',
          name: '메탈 스터드 64형',
          spec: '64형',
          size: '0.65T*64*32',
          unit: 'M',
          price: 1020,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },

        // RUNNER - BS형
        {
          id: 'RB001',
          category: 'RUNNER_BS',
          name: '메탈 런너 50형 (BS)',
          spec: '50형',
          size: '0.65T*52*40',
          unit: 'M',
          price: 840,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },
        {
          id: 'RB002',
          category: 'RUNNER_BS',
          name: '메탈 런너 65형 (BS)',
          spec: '65형',
          size: '0.65T*67*40',
          unit: 'M',
          price: 940,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },
        {
          id: 'RB003',
          category: 'RUNNER_BS',
          name: '메탈 런너 32형',
          spec: '32형',
          size: '0.65T*32*30',
          unit: 'M',
          price: 660,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },
        {
          id: 'RB004',
          category: 'RUNNER_BS',
          name: '메탈 런너 42형',
          spec: '42형',
          size: '0.65T*42*30',
          unit: 'M',
          price: 730,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },
        {
          id: 'RB005',
          category: 'RUNNER_BS',
          name: '메탈 런너 64형',
          spec: '64형',
          size: '0.65T*64*30',
          unit: 'M',
          price: 890,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },

        // CH-STUD / J런너
        {
          id: 'CH001',
          category: 'CH_STUD_J_RUNNER',
          name: 'CH-STUD 75형',
          spec: '75형',
          size: '0.8*75*35',
          unit: 'M',
          price: 1740,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },
        {
          id: 'CH002',
          category: 'CH_STUD_J_RUNNER',
          name: 'CH-STUD 102형',
          spec: '102형',
          size: '0.8*102*35',
          unit: 'M',
          price: 1960,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },
        {
          id: 'CH003',
          category: 'CH_STUD_J_RUNNER',
          name: 'CH-STUD 127형',
          spec: '127형',
          size: '0.8*127*35',
          unit: 'M',
          price: 2160,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },
        {
          id: 'CH004',
          category: 'CH_STUD_J_RUNNER',
          name: 'CH-STUD 152형',
          spec: '152형',
          size: '0.8*152*35',
          unit: 'M',
          price: 2350,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },
        {
          id: 'JR001',
          category: 'CH_STUD_J_RUNNER',
          name: 'J-RUNNER 75형',
          spec: '75형',
          size: '0.8*77*40',
          unit: 'M',
          price: 1100,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },
        {
          id: 'JR002',
          category: 'CH_STUD_J_RUNNER',
          name: 'J-RUNNER 102형',
          spec: '102형',
          size: '0.8*104*40',
          unit: 'M',
          price: 1310,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },
        {
          id: 'JR003',
          category: 'CH_STUD_J_RUNNER',
          name: 'J-RUNNER 127형',
          spec: '127형',
          size: '0.8*129*40',
          unit: 'M',
          price: 1510,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },
        {
          id: 'JR004',
          category: 'CH_STUD_J_RUNNER',
          name: 'J-RUNNER 152형',
          spec: '152형',
          size: '0.8*154*40',
          unit: 'M',
          price: 1700,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },

        // 비드류
        {
          id: 'BD001',
          category: 'BEADS',
          name: '캐싱비드 9.5mm',
          spec: '9.5mm',
          size: '0.5*10*25',
          unit: 'M',
          price: 320,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },
        {
          id: 'BD002',
          category: 'BEADS',
          name: '캐싱비드 12.5mm',
          spec: '12.5mm',
          size: '0.5*13*25',
          unit: 'M',
          price: 330,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },
        {
          id: 'BD003',
          category: 'BEADS',
          name: '코너비드 32mm',
          spec: '32mm',
          size: '32mm',
          unit: 'M',
          price: 440,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },
        {
          id: 'BD004',
          category: 'BEADS',
          name: '코너비드 40mm',
          spec: '40mm',
          size: '40mm',
          unit: 'M',
          price: 510,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },

        // 체결부품 (123.txt에서 추가)
        {
          id: 'FT001',
          category: 'FASTENERS',
          name: '메거진피스 3*21 (양날)',
          spec: '구조틀용(50형-75형)',
          size: '3*21',
          unit: 'EA',
          price: 8,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },
        {
          id: 'FT002',
          category: 'FASTENERS',
          name: '메거진피스 3*21 (양날)',
          spec: '석고취부용',
          size: '3*21',
          unit: 'EA',
          price: 8,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },
        {
          id: 'FT003',
          category: 'FASTENERS',
          name: '메거진피스 6*25 (양날)',
          spec: '구조틀용',
          size: '6*25',
          unit: 'EA',
          price: 10,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },
        {
          id: 'FT004',
          category: 'FASTENERS',
          name: '메거진피스 6*32 (양날)',
          spec: '구조틀용',
          size: '6*32',
          unit: 'EA',
          price: 12,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },
        {
          id: 'FT005',
          category: 'FASTENERS',
          name: '메거진피스 6*38 (양날)',
          spec: '구조틀용',
          size: '6*38',
          unit: 'EA',
          price: 14,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },
        {
          id: 'FT006',
          category: 'FASTENERS',
          name: '메거진피스 6*41 (양날)',
          spec: '구조틀용',
          size: '6*41',
          unit: 'EA',
          price: 16,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },
        {
          id: 'FT007',
          category: 'FASTENERS',
          name: '메거진피스 6*50 (양날)',
          spec: '구조틀용',
          size: '6*50',
          unit: 'EA',
          price: 20,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },
        {
          id: 'FT008',
          category: 'FASTENERS',
          name: '메거진피스 6*57 (양날)',
          spec: '구조틀용',
          size: '6*57',
          unit: 'EA',
          price: 25,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },
        {
          id: 'FT009',
          category: 'FASTENERS',
          name: '메거진피스 6*25 (외날)',
          spec: '구조틀용',
          size: '6*25',
          unit: 'EA',
          price: 8,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },
        {
          id: 'FT010',
          category: 'FASTENERS',
          name: '메거진피스 6*32 (외날)',
          spec: '구조틀용',
          size: '6*32',
          unit: 'EA',
          price: 10,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },
        {
          id: 'FT011',
          category: 'FASTENERS',
          name: '메거진피스 6*38 (외날)',
          spec: '구조틀용',
          size: '6*38',
          unit: 'EA',
          price: 13,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },
        {
          id: 'FT012',
          category: 'FASTENERS',
          name: '메거진피스 6*25 (외날, 코팅)',
          spec: '구조틀용',
          size: '6*25',
          unit: 'EA',
          price: 10,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },
        {
          id: 'FT013',
          category: 'FASTENERS',
          name: '메거진피스 3*21 (외날, 코팅)',
          spec: '구조틀용',
          size: '3*21',
          unit: 'EA',
          price: 10,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },
        {
          id: 'FT014',
          category: 'FASTENERS',
          name: '타정총알',
          spec: '구조틀용',
          size: 'DN22',
          unit: 'EA',
          price: 28,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },
        {
          id: 'FT015',
          category: 'FASTENERS',
          name: '타정총알',
          spec: '구조틀용',
          size: 'DN27',
          unit: 'EA',
          price: 28,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },
        {
          id: 'FT016',
          category: 'FASTENERS',
          name: '타정총알',
          spec: '구조틀용',
          size: 'DN32',
          unit: 'EA',
          price: 30,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },
        {
          id: 'FT017',
          category: 'FASTENERS',
          name: '타정총알',
          spec: '구조틀용(50형-75형)',
          size: 'DN37',
          unit: 'EA',
          price: 35,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },
        {
          id: 'FT018',
          category: 'FASTENERS',
          name: '타정총알',
          spec: '구조틀용',
          size: 'DN42',
          unit: 'EA',
          price: 38,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },
        {
          id: 'FT019',
          category: 'FASTENERS',
          name: '타정총알',
          spec: '구조틀용',
          size: 'DN47',
          unit: 'EA',
          price: 43,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },
        {
          id: 'FT020',
          category: 'FASTENERS',
          name: '타정총알',
          spec: '구조틀용',
          size: 'DN52',
          unit: 'EA',
          price: 46,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },
        {
          id: 'FT021',
          category: 'FASTENERS',
          name: '타정총알',
          spec: '구조틀용',
          size: 'DN62',
          unit: 'EA',
          price: 58,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },
        {
          id: 'FT022',
          category: 'FASTENERS',
          name: '타정총알',
          spec: '구조틀용',
          size: 'DN72',
          unit: 'EA',
          price: 64,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
          work: '',
        },
        {
          id: 'FT023',
          category: 'FASTENERS',
          name: '용접봉',
          spec: '구조틀용(50형-75형)',
          size: '',
          unit: 'KG',
          price: 3000,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 100,
          workType1: '경량',
          workType2: '경량',
          location: '',
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
          name: '일반석고보드',
          w: 900,
          h: 1800,
          t: 9.5,
          unit: '매',
          price: 3650,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },
        {
          id: 'GB002',
          category: 'STANDARD',
          name: '일반석고보드',
          w: 900,
          h: 1800,
          t: 12.5,
          unit: '매',
          price: 4900,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 4900,
          priceChanged: 4900,
        },
        {
          id: 'GB003',
          category: 'STANDARD',
          name: '일반석고보드',
          w: 900,
          h: 1800,
          t: 15.0,
          unit: '매',
          price: 6140,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },
        {
          id: 'GB004',
          category: 'STANDARD',
          name: '일반석고보드',
          w: 900,
          h: 2400,
          t: 9.5,
          unit: '매',
          price: 4990,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },
        {
          id: 'GB005',
          category: 'STANDARD',
          name: '일반석고보드',
          w: 900,
          h: 2400,
          t: 12.5,
          unit: '매',
          price: 6700,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },
        {
          id: 'GB006',
          category: 'STANDARD',
          name: '일반석고보드',
          w: 900,
          h: 2400,
          t: 15.0,
          unit: '매',
          price: 8190,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },
        {
          id: 'GB007',
          category: 'STANDARD',
          name: '일반석고보드',
          w: 900,
          h: 2700,
          t: 9.5,
          unit: '매',
          price: 5610,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },
        {
          id: 'GB008',
          category: 'STANDARD',
          name: '일반석고보드',
          w: 900,
          h: 2700,
          t: 12.5,
          unit: '매',
          price: 7540,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },
        {
          id: 'GB009',
          category: 'STANDARD',
          name: '일반석고보드',
          w: 1200,
          h: 2400,
          t: 12.5,
          unit: '매',
          price: 8930,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },
        {
          id: 'GB010',
          category: 'STANDARD',
          name: '일반석고보드',
          w: 1200,
          h: 2400,
          t: 15.0,
          unit: '매',
          price: 10930,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },

        // 방수석고보드
        {
          id: 'GM001',
          category: 'MOISTURE',
          name: '방수석고보드',
          w: 900,
          h: 1800,
          t: 9.5,
          unit: '매',
          price: 5900,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },
        {
          id: 'GM002',
          category: 'MOISTURE',
          name: '방수석고보드',
          w: 900,
          h: 1800,
          t: 12.5,
          unit: '매',
          price: 8400,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },
        {
          id: 'GM003',
          category: 'MOISTURE',
          name: '방수석고보드',
          w: 900,
          h: 1800,
          t: 15.0,
          unit: '매',
          price: 11610,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },
        {
          id: 'GM004',
          category: 'MOISTURE',
          name: '방수석고보드',
          w: 900,
          h: 2400,
          t: 9.5,
          unit: '매',
          price: 7990,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },
        {
          id: 'GM005',
          category: 'MOISTURE',
          name: '방수석고보드',
          w: 900,
          h: 2400,
          t: 12.5,
          unit: '매',
          price: 11380,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },
        {
          id: 'GM006',
          category: 'MOISTURE',
          name: '방수석고보드',
          w: 900,
          h: 2400,
          t: 15.0,
          unit: '매',
          price: 15490,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },
        {
          id: 'GM007',
          category: 'MOISTURE',
          name: '방수석고보드',
          w: 900,
          h: 2700,
          t: 9.5,
          unit: '매',
          price: 8980,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },
        {
          id: 'GM008',
          category: 'MOISTURE',
          name: '방수석고보드',
          w: 900,
          h: 2700,
          t: 12.5,
          unit: '매',
          price: 12800,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },

        // 방화석고보드
        {
          id: 'GF001',
          category: 'FIRE',
          name: '방화석고보드',
          w: 900,
          h: 1800,
          t: 12.5,
          unit: '매',
          price: 6350,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },
        {
          id: 'GF002',
          category: 'FIRE',
          name: '방화석고보드',
          w: 900,
          h: 1800,
          t: 15.0,
          unit: '매',
          price: 7900,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },
        {
          id: 'GF003',
          category: 'FIRE',
          name: '방화석고보드',
          w: 900,
          h: 1800,
          t: 19.0,
          unit: '매',
          price: 11230,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },
        {
          id: 'GF004',
          category: 'FIRE',
          name: '방화석고보드',
          spec: '600x1800x25.0',
          size: '600x1800x25.0',
          unit: '매',
          price: 10630,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },
        {
          id: 'GF005',
          category: 'FIRE',
          name: '방화석고보드',
          w: 900,
          h: 2400,
          t: 12.5,
          unit: '매',
          price: 8580,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },
        {
          id: 'GF006',
          category: 'FIRE',
          name: '방화석고보드',
          w: 900,
          h: 2400,
          t: 15.0,
          unit: '매',
          price: 10790,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },
        {
          id: 'GF007',
          category: 'FIRE',
          name: '방화석고보드',
          w: 900,
          h: 2400,
          t: 19.0,
          unit: '매',
          price: 14970,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },
        {
          id: 'GF008',
          category: 'FIRE',
          name: '방화석고보드',
          w: 900,
          h: 2700,
          t: 12.5,
          unit: '매',
          price: 9660,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },
        {
          id: 'GF009',
          category: 'FIRE',
          name: '방화석고보드',
          w: 1200,
          h: 2400,
          t: 12.5,
          unit: '매',
          price: 11450,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },
        {
          id: 'GF010',
          category: 'FIRE',
          name: '방화석고보드',
          w: 1200,
          h: 2400,
          t: 15.0,
          unit: '매',
          price: 14390,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },

        // 방화방수석고보드
        {
          id: 'GFM001',
          category: 'FIRE_MOISTURE',
          name: '방화방수석고보드',
          w: 900,
          h: 1800,
          t: 12.5,
          unit: '매',
          price: 10670,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },
        {
          id: 'GFM002',
          category: 'FIRE_MOISTURE',
          name: '방화방수석고보드',
          w: 900,
          h: 1800,
          t: 15.0,
          unit: '매',
          price: 13000,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },
        {
          id: 'GFM003',
          category: 'FIRE_MOISTURE',
          name: '방화방수석고보드',
          w: 900,
          h: 1800,
          t: 19.0,
          unit: '매',
          price: 16470,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },
        {
          id: 'GFM004',
          category: 'FIRE_MOISTURE',
          name: '방화방수석고보드',
          w: 900,
          h: 2400,
          t: 12.5,
          unit: '매',
          price: 14220,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },
        {
          id: 'GFM005',
          category: 'FIRE_MOISTURE',
          name: '방화방수석고보드',
          w: 900,
          h: 2400,
          t: 15.0,
          unit: '매',
          price: 17350,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },
        {
          id: 'GFM006',
          category: 'FIRE_MOISTURE',
          name: '방화방수석고보드',
          w: 900,
          h: 2400,
          t: 19.0,
          unit: '매',
          price: 21960,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },
        {
          id: 'GFM007',
          category: 'FIRE_MOISTURE',
          name: '방화방수석고보드',
          w: 900,
          h: 2700,
          t: 12.5,
          unit: '매',
          price: 16010,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },
        {
          id: 'GFM008',
          category: 'FIRE_MOISTURE',
          name: '방화방수석고보드',
          spec: '600x1800x25.0',
          size: '600x1800x25.0',
          unit: '매',
          price: 14580,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },
        {
          id: 'GFM009',
          category: 'FIRE_MOISTURE',
          name: '방화방수석고보드',
          spec: '600x2400x25.0',
          size: '600x2400x25.0',
          unit: '매',
          price: 19450,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },

        // 차음석고보드
        {
          id: 'GS001',
          category: 'SOUND',
          name: '차음석고보드',
          w: 900,
          h: 1800,
          t: 9.5,
          unit: '매',
          price: 4350,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },
        {
          id: 'GS002',
          category: 'SOUND',
          name: '차음석고보드',
          w: 900,
          h: 1800,
          t: 12.5,
          unit: '매',
          price: 5750,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },
        {
          id: 'GS003',
          category: 'SOUND',
          name: '차음석고보드',
          w: 900,
          h: 1800,
          t: 15.0,
          unit: '매',
          price: 7120,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },
        {
          id: 'GS004',
          category: 'SOUND',
          name: '차음석고보드',
          w: 900,
          h: 2400,
          t: 12.5,
          unit: '매',
          price: 7780,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },
        {
          id: 'GS005',
          category: 'SOUND',
          name: '차음석고보드',
          w: 900,
          h: 2400,
          t: 15.0,
          unit: '매',
          price: 9500,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },
        {
          id: 'GS006',
          category: 'SOUND',
          name: '차음석고보드',
          w: 900,
          h: 2700,
          t: 12.5,
          unit: '매',
          price: 8760,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },

        // 방균석고보드
        {
          id: 'GA001',
          category: 'ANTIBACTERIAL',
          name: '방균석고보드',
          w: 900,
          h: 1800,
          t: 9.5,
          unit: '매',
          price: 4040,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },
        {
          id: 'GA002',
          category: 'ANTIBACTERIAL',
          name: '방균석고보드',
          w: 900,
          h: 1800,
          t: 12.5,
          unit: '매',
          price: 5420,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },
        {
          id: 'GA003',
          category: 'ANTIBACTERIAL',
          name: '방균석고보드',
          w: 900,
          h: 2400,
          t: 9.5,
          unit: '매',
          price: 5390,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },
        {
          id: 'GA004',
          category: 'ANTIBACTERIAL',
          name: '방균석고보드',
          w: 900,
          h: 2400,
          t: 12.5,
          unit: '매',
          price: 7220,
          laborCost: 0,
          laborProductivity: 0,
          laborCompensation: 0,
          workType1: '건식',
          workType2: '벽체',
          location: '',
          work: '석고보드 설치',
          qty: 1.0,
          priceOriginal: 3650,
          priceChanged: 3650,
        },

        // 그라스울
        {
          id: 'GW001',
          category: 'INSULATION',
          name: '그라스울(24k 50t)',
          w: 450,
          h: 1000,
          t: 50.0,
          unit: 'M2',
          qty: 1.0,
          priceOriginal: 3300,
          priceChanged: 3300,
          note: '1매 - (0.45m2)',
        },
        {
          id: 'GW002',
          category: 'INSULATION',
          name: '그라스울(24k 50t)',
          w: 450,
          h: 1000,
          t: 50.0,
          unit: 'M2',
          qty: 1.0,
          priceOriginal: 3300,
          priceChanged: 3300,
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
  addLightweightComponent(materialData) {
    try {
      // 캐시 초기화 강제
      this.getLightweightComponents();

      // 새로운 ID 생성 (현재 최대 ID + 1)
      const maxId = Math.max(
        ...this.lightweightItemsCache.map(
          (item) => parseInt(item.id.replace(/[A-Z]/g, '')) || 0
        )
      );
      const newId = `LC${String(maxId + 1).padStart(3, '0')}`;

      // 새 자재 생성
      const newMaterial = {
        id: newId,
        name: materialData.name,
        category: materialData.category,
        spec: materialData.spec,
        unit: materialData.unit,
        price: materialData.price,
        note: materialData.note || '',
      };

      // 메모리 내 데이터에 추가
      this.lightweightItemsCache.push(newMaterial);

      // 수정사항 추적
      this.modifications.lightweightComponents.added.push({
        ...newMaterial,
        timestamp: new Date().toISOString(),
      });

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

      // 새 석고보드 생성
      const newMaterial = {
        id: newId,
        name: materialData.name,
        category: materialData.category,
        w: materialData.w,
        h: materialData.h,
        t: materialData.t,
        unit: materialData.unit,
        qty: materialData.qty,
        priceOriginal: materialData.priceOriginal,
        priceChanged: materialData.priceChanged || materialData.priceOriginal,
        unitPriceM2: materialData.unitPriceM2,
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
  saveCurrentState() {
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

    localStorage.setItem('kiyeno_material_state', JSON.stringify(currentState));
    console.log('✅ 현재 상태 저장 완료');
    return currentState;
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

export default priceDatabase;
