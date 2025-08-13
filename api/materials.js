/**
 * 자재 관리 API 라우트
 */

const express = require('express');
const router = express.Router();
const MaterialService = require('../services/materialService');

const materialService = new MaterialService();

// 모든 자재 조회
router.get('/', async (req, res) => {
    try {
        const result = await materialService.getAllMaterials();
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: '자재 조회 중 서버 오류 발생'
        });
    }
});

// 특정 자재 조회
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await materialService.getMaterialById(id);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(404).json(result);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: '자재 조회 중 서버 오류 발생'
        });
    }
});

// 카테고리별 자재 조회
router.get('/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const result = await materialService.getMaterialsByCategory(category);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: '카테고리별 자재 조회 중 서버 오류 발생'
        });
    }
});

// 모든 카테고리 조회
router.get('/categories/list', async (req, res) => {
    try {
        const result = await materialService.getCategories();
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: '카테고리 조회 중 서버 오류 발생'
        });
    }
});

// 새 자재 생성
router.post('/', async (req, res) => {
    try {
        const materialData = req.body;
        const result = await materialService.createMaterial(materialData);
        
        if (result.success) {
            res.status(201).json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: '자재 생성 중 서버 오류 발생'
        });
    }
});

// 자재 수정
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const materialData = req.body;
        const result = await materialService.updateMaterial(id, materialData);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(404).json(result);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: '자재 수정 중 서버 오류 발생'
        });
    }
});

// 자재 삭제
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await materialService.deleteMaterial(id);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(404).json(result);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: '자재 삭제 중 서버 오류 발생'
        });
    }
});

// 자재 검색
router.get('/search/:query', async (req, res) => {
    try {
        const { query } = req.params;
        const result = await materialService.searchMaterials(query);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: '자재 검색 중 서버 오류 발생'
        });
    }
});

// 가격 업데이트
router.post('/prices/update', async (req, res) => {
    try {
        const priceUpdates = req.body;
        const result = await materialService.updatePrices(priceUpdates);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: '가격 업데이트 중 서버 오류 발생'
        });
    }
});

module.exports = router;