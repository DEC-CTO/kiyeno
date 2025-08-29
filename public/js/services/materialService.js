/**
 * 자재 관리 API 서비스
 * 자재 데이터 관련 API 통신을 담당
 */

import ApiService from './apiService.js';

class MaterialService extends ApiService {
  constructor() {
    super();
    this.endpoint = '/materials';
  }

  /**
   * 모든 자재 데이터 조회
   */
  async getAllMaterials() {
    return await this.get(this.endpoint);
  }

  /**
   * 특정 자재 조회
   */
  async getMaterialById(id) {
    return await this.get(`${this.endpoint}/${id}`);
  }

  /**
   * 카테고리별 자재 조회
   */
  async getMaterialsByCategory(category) {
    return await this.get(
      `${this.endpoint}/category/${encodeURIComponent(category)}`
    );
  }

  /**
   * 모든 카테고리 조회
   */
  async getCategories() {
    return await this.get(`${this.endpoint}/categories/list`);
  }

  /**
   * 새 자재 생성
   */
  async createMaterial(materialData) {
    return await this.post(this.endpoint, materialData);
  }

  /**
   * 자재 수정
   */
  async updateMaterial(id, materialData) {
    return await this.put(`${this.endpoint}/${id}`, materialData);
  }

  /**
   * 자재 삭제
   */
  async deleteMaterial(id) {
    return await this.delete(`${this.endpoint}/${id}`);
  }

  /**
   * 자재 검색
   */
  async searchMaterials(query) {
    return await this.get(
      `${this.endpoint}/search/${encodeURIComponent(query)}`
    );
  }

  /**
   * 가격 업데이트
   */
  async updatePrices(priceUpdates) {
    return await this.post(`${this.endpoint}/prices/update`, priceUpdates);
  }

  /**
   * 자재 일괄 생성
   */
  async createMaterials(materialsData) {
    const requests = materialsData.map((material) => ({
      endpoint: this.endpoint,
      options: {
        method: 'POST',
        body: JSON.stringify(material),
      },
    }));

    return await this.batch(requests);
  }

  /**
   * 자재 복제
   */
  async duplicateMaterial(id) {
    try {
      const result = await this.getMaterialById(id);
      if (result.success) {
        const materialData = { ...result.data };
        delete materialData.id;
        delete materialData.metadata;
        materialData.name = `${materialData.name} (복사본)`;

        return await this.createMaterial(materialData);
      }
      return result;
    } catch (error) {
      console.error('자재 복제 실패:', error);
      throw error;
    }
  }

  /**
   * 자재 가격 비교
   */
  async comparePrices(materialIds) {
    try {
      const requests = materialIds.map((id) => ({
        endpoint: `${this.endpoint}/${id}`,
        options: { method: 'GET' },
      }));

      const results = await this.batch(requests);
      const materials = results
        .filter((result) => result.success)
        .map((result) => result.data);

      return {
        success: true,
        data: materials,
        message: '자재 가격 비교 조회 성공',
      };
    } catch (error) {
      console.error('자재 가격 비교 실패:', error);
      throw error;
    }
  }

  /**
   * 자재 재고 추적 (미래 확장용)
   */
  async getInventoryStatus(materialId) {
    // 현재는 더미 데이터 반환
    return {
      success: true,
      data: {
        materialId,
        inStock: true,
        quantity: 100,
        lastUpdated: new Date().toISOString(),
      },
      message: '재고 상태 조회 성공',
    };
  }

  /**
   * 자재 통계 조회
   */
  async getMaterialStats() {
    try {
      const result = await this.getAllMaterials();
      if (result.success) {
        const materials = result.data;
        const stats = {
          total: materials.length,
          byCategory: {},
          averagePrice: 0,
          priceRange: { min: Infinity, max: -Infinity },
        };

        materials.forEach((material) => {
          // 카테고리별 통계
          stats.byCategory[material.category] =
            (stats.byCategory[material.category] || 0) + 1;

          // 가격 통계
          const price = material.price || material.totalPrice || 0;
          stats.averagePrice += price;
          stats.priceRange.min = Math.min(stats.priceRange.min, price);
          stats.priceRange.max = Math.max(stats.priceRange.max, price);
        });

        stats.averagePrice =
          stats.total > 0 ? stats.averagePrice / stats.total : 0;

        if (stats.priceRange.min === Infinity) {
          stats.priceRange.min = 0;
        }
        if (stats.priceRange.max === -Infinity) {
          stats.priceRange.max = 0;
        }

        return {
          success: true,
          data: stats,
          message: '자재 통계 조회 성공',
        };
      }
      return result;
    } catch (error) {
      console.error('자재 통계 조회 실패:', error);
      throw error;
    }
  }
}

export default MaterialService;
