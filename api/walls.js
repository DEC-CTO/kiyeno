/**
 * 벽체 관리 API 라우트
 */

const express = require('express');
const router = express.Router();
const WallService = require('../services/wallService');

const wallService = new WallService();

// 모든 벽체 조회
router.get('/', async (req, res) => {
    try {
        const result = await wallService.getAllWalls();
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: '벽체 조회 중 서버 오류 발생'
        });
    }
});

// 특정 벽체 조회
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await wallService.getWallById(id);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(404).json(result);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: '벽체 조회 중 서버 오류 발생'
        });
    }
});

// 새 벽체 생성
router.post('/', async (req, res) => {
    try {
        const wallData = req.body;
        const result = await wallService.createWall(wallData);
        
        if (result.success) {
            res.status(201).json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: '벽체 생성 중 서버 오류 발생'
        });
    }
});

// 벽체 수정
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const wallData = req.body;
        const result = await wallService.updateWall(id, wallData);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(404).json(result);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: '벽체 수정 중 서버 오류 발생'
        });
    }
});

// 벽체 삭제
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await wallService.deleteWall(id);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(404).json(result);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: '벽체 삭제 중 서버 오류 발생'
        });
    }
});

// 벽체 순서 변경
router.post('/reorder', async (req, res) => {
    try {
        const orderData = req.body;
        const result = await wallService.reorderWalls(orderData);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: '벽체 순서 변경 중 서버 오류 발생'
        });
    }
});

// 벽체 검색
router.get('/search/:query', async (req, res) => {
    try {
        const { query } = req.params;
        const result = await wallService.searchWalls(query);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: '벽체 검색 중 서버 오류 발생'
        });
    }
});

module.exports = router;