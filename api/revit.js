/**
 * Revit 연동 API 라우트
 */

const express = require('express');
const router = express.Router();
const RevitService = require('../services/revitService');

const revitService = new RevitService();

// Revit 데이터 동기화
router.post('/sync', async (req, res) => {
    try {
        const revitData = req.body;
        const result = await revitService.syncRevitData(revitData);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Revit 데이터 동기화 중 서버 오류 발생'
        });
    }
});

// Revit 타입 매핑 조회
router.get('/types', async (req, res) => {
    try {
        const result = await revitService.getTypeMappings();
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Revit 타입 매핑 조회 중 서버 오류 발생'
        });
    }
});

// Revit 타입 매핑 저장
router.post('/types', async (req, res) => {
    try {
        const mappings = req.body;
        const result = await revitService.saveTypeMappings(mappings);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Revit 타입 매핑 저장 중 서버 오류 발생'
        });
    }
});

// Revit 데이터 내보내기
router.post('/export', async (req, res) => {
    try {
        const { wallIds } = req.body;
        const result = await revitService.exportToRevit(wallIds);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Revit 데이터 내보내기 중 서버 오류 발생'
        });
    }
});

// Revit 데이터 가져오기
router.post('/import', async (req, res) => {
    try {
        const { revitWalls } = req.body;
        const result = await revitService.importFromRevit(revitWalls);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Revit 데이터 가져오기 중 서버 오류 발생'
        });
    }
});

// Revit 연결 상태 확인
router.get('/status', async (req, res) => {
    try {
        const result = await revitService.checkRevitConnection();
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Revit 연결 상태 확인 중 서버 오류 발생'
        });
    }
});

// Revit에서 요소 선택
router.post('/selectElements', async (req, res) => {
    try {
        // C# RevitCommand 구조에 맞게 ElementIds 추출
        const elementIds = req.body.ElementIds || req.body.elementIds;
        const result = await revitService.selectElementsInRevit(elementIds);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Revit 요소 선택 중 서버 오류 발생'
        });
    }
});

module.exports = router;