// =============================================================================
// Kiyeno 벽체 관리 시스템 - 서비스 모듈
// 자재관리, Revit연동, 데이터 내보내기/가져오기 등 서비스
// =============================================================================

// =============================================================================
// 자재 관리 서비스
// =============================================================================

Kiyeno.MaterialService = {
    // 자재 데이터베이스에서 자재 조회
    async getMaterialsByName(name) {
        try {
            if (!kiyenoDB) return [];
            
            const materials = await kiyenoDB.materials
                .where('name')
                .startsWithIgnoreCase(name)
                .toArray();
                
            return materials;
        } catch (error) {
            console.error('자재 조회 실패:', error);
            return [];
        }
    },
    
    // 모든 자재 조회
    async getAllMaterials() {
        try {
            if (!kiyenoDB) return [];
            return await kiyenoDB.materials.toArray();
        } catch (error) {
            console.error('전체 자재 조회 실패:', error);
            return [];
        }
    },
    
    // 자재 추가
    async addMaterial(materialData) {
        try {
            if (!kiyenoDB) return null;
            
            const material = {
                ...materialData,
                created: new Date().toISOString(),
                updated: new Date().toISOString()
            };
            
            const id = await kiyenoDB.materials.add(material);
            return { ...material, id };
        } catch (error) {
            console.error('자재 추가 실패:', error);
            return null;
        }
    },
    
    // 자재 수정
    async updateMaterial(id, updates) {
        try {
            if (!kiyenoDB) return false;
            
            const updateData = {
                ...updates,
                updated: new Date().toISOString()
            };
            
            await kiyenoDB.materials.update(id, updateData);
            return true;
        } catch (error) {
            console.error('자재 수정 실패:', error);
            return false;
        }
    },
    
    // 자재 삭제
    async deleteMaterial(id) {
        try {
            if (!kiyenoDB) return false;
            await kiyenoDB.materials.delete(id);
            return true;
        } catch (error) {
            console.error('자재 삭제 실패:', error);
            return false;
        }
    }
};

// =============================================================================
// Revit 연동 서비스
// =============================================================================

Kiyeno.RevitService = {
    // Revit 데이터 저장소
    revitWallData: [],
    selectedRevitIds: new Set(),
    
    // Revit에서 단일 벽체 선택
    selectSingleWallFromRevit() {
        try {
            // WebSocket을 통한 Revit 통신
            if (window.socketService && window.socketService.isConnected()) {
                window.socketService.sendRevitCommand('selectWall');
            } else {
                // 일반 브라우저 환경 - 테스트 데이터
                console.log('일반 브라우저에서 실행 중 - 테스트 데이터 사용');
                this.simulateRevitWallSelection();
            }
        } catch (error) {
            console.error('Revit 단일 벽체 선택 실패:', error);
            showToast('Revit 연동 중 오류가 발생했습니다.', 'error');
        }
    },
    
    // Revit에서 다중 벽체 선택
    selectMultipleWallsFromRevit() {
        try {
            // WebSocket을 통한 Revit 통신
            if (window.socketService && window.socketService.isConnected()) {
                window.socketService.sendRevitCommand('selectMultipleWalls');
            } else {
                console.log('일반 브라우저에서 실행 중 - 테스트 데이터 사용');
                this.simulateRevitWallSelection(true);
            }
        } catch (error) {
            console.error('Revit 다중 벽체 선택 실패:', error);
            showToast('Revit 연동 중 오류가 발생했습니다.', 'error');
        }
    },
    
    // 테스트용 Revit 데이터 시뮬레이션
    simulateRevitWallSelection(multiple = false) {
        const testWalls = [
            {
                elementId: 'test_001',
                name: '테스트 벽체 1',
                wallType: 'A1b',
                area: 25.5,
                height: 3.0,
                length: 8.5,
                thickness: 100,
                level: '1F',
                material: '콘크리트'
            }
        ];
        
        if (multiple) {
            testWalls.push({
                elementId: 'test_002',
                name: '테스트 벽체 2',
                wallType: 'B1b',
                area: 18.2,
                height: 3.0,
                length: 6.1,
                thickness: 150,
                level: '1F',
                material: '블록'
            });
        }
        
        this.handleRevitWallData(testWalls);
    },
    
    // Revit에서 받은 벽체 데이터 처리
    handleRevitWallData(wallsData) {
        try {
            this.revitWallData = wallsData;
            this.selectedRevitIds.clear();
            
            console.log('Revit 벽체 데이터 수신:', wallsData);
            
            // Revit 데이터 섹션 표시
            this.renderRevitDataSection();
            
            showToast(`${wallsData.length}개 벽체 데이터를 Revit에서 가져왔습니다.`, 'success');
        } catch (error) {
            console.error('Revit 데이터 처리 실패:', error);
            showToast('Revit 데이터 처리 중 오류가 발생했습니다.', 'error');
        }
    },
    
    // Revit 데이터 섹션 렌더링
    renderRevitDataSection() {
        const container = document.getElementById('revitDataContainer');
        if (!container) {
            console.warn('Revit 데이터 컨테이너를 찾을 수 없습니다.');
            return;
        }
        
        if (this.revitWallData.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 20px;">Revit에서 벽체를 선택해주세요.</p>';
            return;
        }
        
        const tableRows = this.revitWallData.map(wall => `
            <tr>
                <td>
                    <input type="checkbox" 
                           value="${wall.elementId}" 
                           onchange="toggleRevitSelection('${wall.elementId}')" />
                </td>
                <td>${wall.name || wall.elementId}</td>
                <td>${wall.wallType || '-'}</td>
                <td>${wall.area || 0}</td>
                <td>${wall.height || 0}</td>
                <td>${wall.thickness || 0}</td>
                <td>${wall.level || '-'}</td>
                <td>${wall.material || '-'}</td>
            </tr>
        `).join('');
        
        container.innerHTML = `
            <div style="margin-bottom: 16px;">
                <h4>📋 Revit 벽체 데이터</h4>
                <div style="margin: 8px 0;">
                    <button onclick="toggleAllRevitSelection()" class="btn btn-secondary">전체 선택/해제</button>
                    <button onclick="addSelectedRevitWalls()" class="btn btn-primary">선택된 벽체 추가</button>
                    <button onclick="clearRevitData()" class="btn btn-secondary">데이터 지우기</button>
                </div>
            </div>
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb;">
                    <thead>
                        <tr style="background: #f9fafb;">
                            <th style="padding: 8px; border: 1px solid #e5e7eb;">선택</th>
                            <th style="padding: 8px; border: 1px solid #e5e7eb;">이름</th>
                            <th style="padding: 8px; border: 1px solid #e5e7eb;">타입</th>
                            <th style="padding: 8px; border: 1px solid #e5e7eb;">면적(m²)</th>
                            <th style="padding: 8px; border: 1px solid #e5e7eb;">높이(m)</th>
                            <th style="padding: 8px; border: 1px solid #e5e7eb;">두께(mm)</th>
                            <th style="padding: 8px; border: 1px solid #e5e7eb;">레벨</th>
                            <th style="padding: 8px; border: 1px solid #e5e7eb;">재료</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        `;
    },
    
    // Revit 선택 토글
    toggleRevitSelection(elementId) {
        if (this.selectedRevitIds.has(elementId)) {
            this.selectedRevitIds.delete(elementId);
        } else {
            this.selectedRevitIds.add(elementId);
        }
    },
    
    // Revit 전체 선택 토글
    toggleAllRevitSelection() {
        if (this.selectedRevitIds.size === this.revitWallData.length) {
            this.selectedRevitIds.clear();
        } else {
            this.selectedRevitIds.clear();
            this.revitWallData.forEach(wall => {
                this.selectedRevitIds.add(wall.elementId);
            });
        }
        
        // 체크박스 상태 업데이트
        const checkboxes = document.querySelectorAll('#revitDataContainer input[type="checkbox"]');
        const isAllSelected = this.selectedRevitIds.size === this.revitWallData.length;
        checkboxes.forEach(checkbox => {
            checkbox.checked = isAllSelected;
        });
    },
    
    // 선택된 Revit 벽체를 메인 테이블에 추가
    addSelectedRevitWalls() {
        if (this.selectedRevitIds.size === 0) {
            showToast('추가할 벽체를 선택해주세요.', 'warning');
            return;
        }
        
        const selectedWalls = this.revitWallData.filter(wall => 
            this.selectedRevitIds.has(wall.elementId)
        );
        
        let addedCount = 0;
        
        selectedWalls.forEach(revitWall => {
            const wallData = {
                wallType: revitWall.wallType || '새 벽체 타입',
                area: revitWall.area || '',
                thickness: revitWall.thickness || '',
                fire: '',
                // Revit 원본 정보 저장
                revitElementId: revitWall.elementId,
                revitName: revitWall.name,
                revitLevel: revitWall.level,
                revitMaterial: revitWall.material,
                // 기본 레이어 정보
                layer1_1: '',
                layer2_1: '',
                layer3_1: '',
                column1: '',
                infill: '',
                layer1_2: '',
                layer2_2: '',
                layer3_2: '',
                column2: '',
                channel: '',
                runner: '',
                steelPlate: ''
            };
            
            Kiyeno.Data.addWall(wallData);
            addedCount++;
        });
        
        // 테이블 렌더링
        if (typeof renderTable === 'function') {
            renderTable();
        }
        
        showToast(`${addedCount}개 벽체가 추가되었습니다.`, 'success');
        
        // 선택 초기화
        this.selectedRevitIds.clear();
        this.renderRevitDataSection();
    },
    
    // Revit 데이터 지우기
    clearRevitData() {
        this.revitWallData = [];
        this.selectedRevitIds.clear();
        this.renderRevitDataSection();
        showToast('Revit 데이터가 지워졌습니다.', 'info');
    }
};

// =============================================================================
// 데이터 내보내기/가져오기 서비스 (기존 UI 호환)
// =============================================================================

// 기존 UI 호환을 위한 전역 함수들
function exportData() {
    const formatOptions = [
        { value: 'json', text: '📊 JSON (데이터 백업용)' },
        { value: 'csv', text: '📈 CSV (Excel 호환)' },
        { value: 'excel', text: '📉 Excel (XLSX)' },
        { value: 'pdf', text: '📜 PDF 리포트' }
    ];
    
    showSelectModal('데이터 내보내기 형식 선택', formatOptions, (selectedFormat) => {
        if (selectedFormat) {
            switch(selectedFormat) {
                case 'json':
                    exportAsJSON();
                    break;
                case 'csv':
                    exportAsCSV();
                    break;
                case 'excel':
                    exportAsExcel();
                    break;
                case 'pdf':
                    exportAsPDF();
                    break;
            }
        }
    });
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.csv,.xls,.xlsx';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                if (file.name.endsWith('.json')) {
                    importFromJSON(event.target.result);
                } else if (file.name.endsWith('.csv')) {
                    importFromCSV(event.target.result);
                } else {
                    showToast('지원되지 않는 파일 형식입니다.', 'error');
                }
            } catch (error) {
                console.error('파일 가져오기 오류:', error);
                showToast('파일을 가져오는 중 오류가 발생했습니다.', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// 선택 모달 함수
function showSelectModal(title, options, callback) {
    const optionButtons = options.map(option => 
        `<button onclick="selectOption('${option.value}')" class="btn btn-primary" style="display: block; width: 100%; margin: 5px 0;">${option.text}</button>`
    ).join('');
    
    const content = `
        <div style="min-width: 300px;">
            <p style="margin-bottom: 20px;">${title}</p>
            ${optionButtons}
        </div>
    `;
    
    // 전역 콜백 저장
    window.currentSelectCallback = callback;
    window.selectOption = function(value) {
        if (window.currentSelectCallback) {
            window.currentSelectCallback(value);
        }
        const modal = document.querySelector('.modal-overlay');
        if (modal) modal.remove();
    };
    
    createModal(title, content, [
        { text: '취소', class: 'btn-secondary', onClick: (modal) => modal.remove() }
    ]);
}

// 내보내기 함수들
function exportAsJSON() {
    try {
        const exportData = {
            metadata: {
                exportDate: new Date().toISOString(),
                version: "1.0",
                totalWalls: Kiyeno.Data.wallData.length,
                statistics: getWallStatistics()
            },
            wallData: Kiyeno.Data.wallData
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const fileName = `wall_data_${new Date().toISOString().split('T')[0]}.json`;
        downloadFile(dataStr, fileName, 'application/json');
        showToast('JSON 파일이 다운로드되었습니다.', 'success');
    } catch (error) {
        console.error('JSON 내보내기 오류:', error);
        showToast('JSON 파일 내보내기 중 오류가 발생했습니다.', 'error');
    }
}

function exportAsCSV() {
    try {
        const headers = [
            'No.', 'WallType', 'M2', 'Layer3(1)', 'Column(1)', 'Infill',
            'Layer3(2)', 'Column(2)', 'Channel', 'Runner', 'Steel Plate', '두께(mm)', '방화'
        ];
        
        let csvContent = '\uFEFF' + headers.join(',') + '\n'; // UTF-8 BOM 추가
        
        Kiyeno.Data.wallData.forEach(wall => {
            const row = [
                escapeCSV(wall.no),
                escapeCSV(wall.wallType),
                wall.area || '',
                escapeCSV(wall.layer3_1),
                escapeCSV(wall.column1),
                escapeCSV(wall.infill),
                escapeCSV(wall.layer3_2),
                escapeCSV(wall.column2),
                escapeCSV(wall.channel),
                escapeCSV(wall.runner),
                escapeCSV(wall.steelPlate),
                wall.thickness || '',
                escapeCSV(wall.fire)
            ];
            csvContent += row.join(',') + '\n';
        });
        
        const fileName = `wall_data_${new Date().toISOString().split('T')[0]}.csv`;
        downloadFile(csvContent, fileName, 'text/csv');
        showToast('CSV 파일이 다운로드되었습니다.', 'success');
    } catch (error) {
        console.error('CSV 내보내기 오류:', error);
        showToast('CSV 파일 내보내기 중 오류가 발생했습니다.', 'error');
    }
}

function exportAsExcel() {
    try {
        let htmlContent = `
            <html xmlns:x="urn:schemas-microsoft-com:office:excel">
            <head>
                <meta charset="utf-8">
                <style>
                    table { border-collapse: collapse; }
                    th, td { border: 1px solid #000; padding: 5px; text-align: center; }
                    th { background-color: #f0f0f0; font-weight: bold; }
                </style>
            </head>
            <body>
                <table>
                    <tr>
                        <th>No.</th><th>WallType</th><th>M2</th><th>Layer3(1)</th>
                        <th>Column(1)</th><th>Infill</th><th>Layer3(2)</th><th>Column(2)</th>
                        <th>Channel</th><th>Runner</th><th>Steel Plate</th><th>두께(mm)</th><th>방화</th>
                    </tr>
        `;
        
        Kiyeno.Data.wallData.forEach(wall => {
            htmlContent += `
                <tr>
                    <td>${wall.no || ''}</td>
                    <td>${wall.wallType || ''}</td>
                    <td>${wall.area || ''}</td>
                    <td>${wall.layer3_1 || ''}</td>
                    <td>${wall.column1 || ''}</td>
                    <td>${wall.infill || ''}</td>
                    <td>${wall.layer3_2 || ''}</td>
                    <td>${wall.column2 || ''}</td>
                    <td>${wall.channel || ''}</td>
                    <td>${wall.runner || ''}</td>
                    <td>${wall.steelPlate || ''}</td>
                    <td>${wall.thickness || ''}</td>
                    <td>${wall.fire || ''}</td>
                </tr>
            `;
        });
        
        htmlContent += `</table></body></html>`;
        
        const fileName = `wall_data_${new Date().toISOString().split('T')[0]}.xls`;
        downloadFile(htmlContent, fileName, 'application/vnd.ms-excel');
        showToast('Excel 파일이 다운로드되었습니다.', 'success');
    } catch (error) {
        console.error('Excel 내보내기 오류:', error);
        showToast('Excel 파일 내보내기 중 오류가 발생했습니다.', 'error');
    }
}

function exportAsPDF() {
    try {
        const stats = getWallStatistics();
        const reportWindow = window.open('', '_blank');
        
        let reportHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>벽체 정보 리포트</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h1 { color: #333; text-align: center; }
                    .stats { background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 10px; }
                    th { background: #f0f0f0; font-weight: bold; }
                </style>
            </head>
            <body>
                <h1>벽체 정보 관리 시스템 리포트</h1>
                <p style="text-align: center;">생성일: ${new Date().toLocaleDateString('ko-KR')}</p>
                
                <div class="stats">
                    <h3>통계 정보</h3>
                    <p><strong>총 벽체 수:</strong> ${stats.totalWalls}개</p>
                    <p><strong>총 면적:</strong> ${stats.totalArea.toFixed(3)}m²</p>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>No.</th><th>WallType</th><th>M2</th><th>두께(mm)</th><th>방화</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        Kiyeno.Data.wallData.forEach(wall => {
            reportHTML += `
                <tr>
                    <td>${wall.no || ''}</td>
                    <td>${wall.wallType || ''}</td>
                    <td>${wall.area || ''}</td>
                    <td>${wall.thickness || ''}</td>
                    <td>${wall.fire || ''}</td>
                </tr>
            `;
        });
        
        reportHTML += `
                    </tbody>
                </table>
                <div style="margin-top: 30px; text-align: center;">
                    <button onclick="window.print()">인쇄하기</button>
                    <button onclick="window.close()">닫기</button>
                </div>
            </body>
            </html>
        `;
        
        reportWindow.document.write(reportHTML);
        reportWindow.document.close();
        
        showToast('PDF 리포트가 새 창에서 열렸습니다.', 'success');
    } catch (error) {
        console.error('PDF 리포트 생성 오류:', error);
        showToast('PDF 리포트 생성 중 오류가 발생했습니다.', 'error');
    }
}

// 유틸리티 함수들
function escapeCSV(field) {
    if (field === null || field === undefined) return '';
    const str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType + ';charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function getWallStatistics() {
    const totalWalls = Kiyeno.Data.wallData.length;
    const totalArea = Kiyeno.Data.wallData.reduce((sum, wall) => sum + (parseFloat(wall.area) || 0), 0);
    
    return {
        totalWalls,
        totalArea,
        avgThickness: totalWalls > 0 ? 
            Kiyeno.Data.wallData.reduce((sum, wall) => sum + (parseFloat(wall.thickness) || 0), 0) / totalWalls : 0
    };
}

// 가져오기 함수들
function importFromJSON(content) {
    try {
        const importedData = JSON.parse(content);
        let wallArray;
        
        if (importedData.wallData && Array.isArray(importedData.wallData)) {
            wallArray = importedData.wallData;
        } else if (Array.isArray(importedData)) {
            wallArray = importedData;
        } else {
            throw new Error('올바른 JSON 형식이 아닙니다.');
        }
        
        const importOption = confirm('기존 데이터에 추가하시겠습니까?\n"확인": 추가, "취소": 교체');
        
        if (!importOption) {
            Kiyeno.Data.wallData = [];
            Kiyeno.Data.lastWallId = 0;
        }
        
        wallArray.forEach(wall => {
            const newWall = Kiyeno.Data.addWall(wall);
        });
        
        if (typeof renderTable === 'function') {
            renderTable();
        }
        showToast(`${wallArray.length}개 벽체 데이터를 가져왔습니다.`, 'success');
    } catch (error) {
        showToast('JSON 파일 형식이 올바르지 않습니다.', 'error');
    }
}

function importFromCSV(content) {
    try {
        const lines = content.split('\n');
        if (lines.length < 2) {
            throw new Error('CSV 파일이 비어있거나 헤더가 없습니다.');
        }
        
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const importedWalls = [];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = parseCSVLine(line);
            if (values.length >= 5) {
                const wall = {
                    wallType: values[1] || '가져온 벽체',
                    area: parseFloat(values[2]) || 0,
                    layer3_1: values[3] || '',
                    column1: values[4] || '',
                    infill: values[5] || '',
                    layer3_2: values[6] || '',
                    column2: values[7] || '',
                    channel: values[8] || '',
                    runner: values[9] || '',
                    steelPlate: values[10] || '',
                    thickness: parseFloat(values[11]) || 0,
                    fire: values[12] || ''
                };
                importedWalls.push(wall);
            }
        }
        
        if (importedWalls.length > 0) {
            const importOption = confirm('기존 데이터에 추가하시겠습니까?\n"확인": 추가, "취소": 교체');
            
            if (!importOption) {
                Kiyeno.Data.wallData = [];
                Kiyeno.Data.lastWallId = 0;
            }
            
            importedWalls.forEach(wall => {
                Kiyeno.Data.addWall(wall);
            });
            
            if (typeof renderTable === 'function') {
                renderTable();
            }
            showToast(`${importedWalls.length}개 벽체 데이터를 가져왔습니다.`, 'success');
        } else {
            showToast('가져올 수 있는 데이터가 없습니다.', 'warning');
        }
    } catch (error) {
        console.error('CSV 가져오기 오류:', error);
        showToast('CSV 파일을 처리하는 중 오류가 발생했습니다.', 'error');
    }
}

function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    values.push(current.trim());
    return values;
}

Kiyeno.ExportService = {
    // 데이터 내보내기 모달 표시
    exportData() {
        showDataManagementModal();
    },

    // JSON 형식으로 내보내기
    exportToJSON() {
        try {
            const data = {
                wallData: Kiyeno.Data.wallData,
                exportedAt: new Date().toISOString(),
                version: '2.0',
                totalWalls: Kiyeno.Data.wallData.length
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { 
                type: 'application/json' 
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `kiyeno_walldata_${this.getDateString()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showToast('JSON 파일로 내보내기 완료', 'success');
        } catch (error) {
            console.error('JSON 내보내기 실패:', error);
            showToast('내보내기 실패', 'error');
        }
    },
    
    // CSV 형식으로 내보내기
    exportToCSV() {
        try {
            const headers = [
                'No', 'WallType', 'Area', 'Layer3_1', 'Column1', 'Infill', 
                'Layer3_2', 'Column2', 'Channel', 'Runner', 'SteelPlate', 
                'Thickness', 'Fire'
            ];
            
            const csvData = [
                headers.join(','),
                ...Kiyeno.Data.wallData.map(wall => [
                    wall.no,
                    `"${wall.wallType || ''}"`,
                    wall.area || '',
                    `"${wall.layer3_1 || ''}"`,
                    `"${wall.column1 || ''}"`,
                    `"${wall.infill || ''}"`,
                    `"${wall.layer3_2 || ''}"`,
                    `"${wall.column2 || ''}"`,
                    `"${wall.channel || ''}"`,
                    `"${wall.runner || ''}"`,
                    `"${wall.steelPlate || ''}"`,
                    wall.thickness || '',
                    `"${wall.fire || ''}"`
                ].join(','))
            ].join('\n');
            
            const blob = new Blob(['\uFEFF' + csvData], { 
                type: 'text/csv;charset=utf-8;' 
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `kiyeno_walldata_${this.getDateString()}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showToast('CSV 파일로 내보내기 완료', 'success');
        } catch (error) {
            console.error('CSV 내보내기 실패:', error);
            showToast('내보내기 실패', 'error');
        }
    },
    
    // 파일에서 가져오기
    importFromFile(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                let importData;
                
                if (file.name.endsWith('.json')) {
                    importData = JSON.parse(content);
                    this.processImportedData(importData.wallData || importData);
                } else if (file.name.endsWith('.csv')) {
                    importData = this.parseCSV(content);
                    this.processImportedData(importData);
                } else {
                    throw new Error('지원하지 않는 파일 형식입니다.');
                }
            } catch (error) {
                console.error('파일 가져오기 실패:', error);
                showToast('파일 가져오기 실패: ' + error.message, 'error');
            }
        };
        
        reader.readAsText(file);
    },
    
    // CSV 파싱
    parseCSV(content) {
        const lines = content.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = this.parseCSVLine(line);
            const obj = {};
            
            headers.forEach((header, index) => {
                obj[header.toLowerCase().replace(/[^a-z0-9]/g, '')] = values[index] || '';
            });
            
            data.push({
                wallType: obj.walltype || '',
                area: parseFloat(obj.area) || '',
                layer3_1: obj.layer31 || '',
                column1: obj.column1 || '',
                infill: obj.infill || '',
                layer3_2: obj.layer32 || '',
                column2: obj.column2 || '',
                channel: obj.channel || '',
                runner: obj.runner || '',
                steelPlate: obj.steelplate || '',
                thickness: parseFloat(obj.thickness) || '',
                fire: obj.fire || ''
            });
        }
        
        return data;
    },
    
    // CSV 라인 파싱 (따옴표 처리)
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    },
    
    // 가져온 데이터 처리
    processImportedData(data) {
        if (!Array.isArray(data)) {
            throw new Error('올바른 데이터 형식이 아닙니다.');
        }
        
        // 기존 데이터 백업
        const backup = [...Kiyeno.Data.wallData];
        
        try {
            // 데이터 초기화
            Kiyeno.Data.wallData = [];
            Kiyeno.Data.lastWallId = 0;
            
            // 새 데이터 추가
            data.forEach(wallData => {
                Kiyeno.Data.addWall(wallData);
            });
            
            // 테이블 렌더링
            if (typeof renderTable === 'function') {
                renderTable();
            }
            
            showToast(`${data.length}개 벽체 데이터를 가져왔습니다.`, 'success');
            
        } catch (error) {
            // 오류 시 백업 복원
            Kiyeno.Data.wallData = backup;
            throw error;
        }
    },
    
    // 날짜 문자열 생성
    getDateString() {
        const now = new Date();
        return now.getFullYear() + 
               String(now.getMonth() + 1).padStart(2, '0') + 
               String(now.getDate()).padStart(2, '0') + '_' +
               String(now.getHours()).padStart(2, '0') + 
               String(now.getMinutes()).padStart(2, '0');
    }
};

// =============================================================================
// 데이터 관리 UI
// =============================================================================

function showDataManagementModal() {
    const content = `
        <div style="min-width: 400px;">
            <h4 style="margin-bottom: 16px;">📊 데이터 관리</h4>
            
            <div style="margin-bottom: 24px;">
                <h5>📤 내보내기</h5>
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                    <button onclick="Kiyeno.ExportService.exportToJSON()" class="btn btn-primary">
                        JSON 형식
                    </button>
                    <button onclick="Kiyeno.ExportService.exportToCSV()" class="btn btn-primary">
                        CSV 형식
                    </button>
                </div>
            </div>
            
            <div style="margin-bottom: 24px;">
                <h5>📥 가져오기</h5>
                <input type="file" 
                       id="importFileInput" 
                       accept=".json,.csv" 
                       style="margin-top: 8px;" />
                <button onclick="handleFileImport()" 
                        class="btn btn-primary" 
                        style="margin-top: 8px; display: block;">
                    파일 가져오기
                </button>
            </div>
            
            <div style="margin-bottom: 16px;">
                <h5 style="color: #dc2626;">🗑️ 데이터 삭제</h5>
                <button onclick="confirmDataClear()" 
                        class="btn btn-danger" 
                        style="margin-top: 8px; background: #dc2626; color: white;">
                    모든 데이터 삭제
                </button>
            </div>
        </div>
    `;
    
    createModal('데이터 관리', content);
}

function handleFileImport() {
    const fileInput = document.getElementById('importFileInput');
    const file = fileInput.files[0];
    
    if (!file) {
        showToast('파일을 선택해주세요.', 'warning');
        return;
    }
    
    Kiyeno.ExportService.importFromFile(file);
    
    // 모달 닫기
    const modal = document.querySelector('.modal-overlay');
    if (modal) modal.remove();
}

function confirmDataClear() {
    if (confirm('정말로 모든 벽체 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
        Kiyeno.Storage.clearAllData();
        showToast('모든 데이터가 삭제되었습니다.', 'info');
        
        // 모달 닫기
        const modal = document.querySelector('.modal-overlay');
        if (modal) modal.remove();
    }
}

// =============================================================================
// 자재 관리 UI (간소화)
// =============================================================================

function showMaterialManagementModal() {
    // 디버깅을 위한 로그
    console.log('🔍 window.priceDB 상태:', window.priceDB);
    console.log('🔍 window.priceDatabase 상태:', window.priceDatabase);
    
    // priceDB가 초기화되지 않은 경우 대기
    if (!window.priceDB || !window.priceDB.loadSavedState) {
        console.warn('⚠️ priceDB가 아직 초기화되지 않았습니다.');
        
        // 최대 5초 동안 0.1초마다 확인
        let attempts = 0;
        const maxAttempts = 50;
        
        const checkPriceDB = () => {
            attempts++;
            if (window.priceDB && window.priceDB.loadSavedState) {
                console.log('✅ priceDB 초기화 완료, 모달 표시');
                showMaterialManagementModal();
                return;
            }
            
            if (attempts < maxAttempts) {
                setTimeout(checkPriceDB, 100);
            } else {
                console.error('❌ priceDB 초기화 타임아웃');
                showToast('데이터베이스 초기화에 실패했습니다. 페이지를 새로고침해 주세요.', 'error');
            }
        };
        
        showToast('데이터베이스 초기화 중...', 'info');
        setTimeout(checkPriceDB, 100);
        return;
    }
    
    // 저장된 상태 불러오기
    try {
        window.priceDB.loadSavedState();
    } catch (error) {
        console.error('loadSavedState 오류:', error);
    }
    
    const dataStatus = window.priceDB.getDataStatus();
    
    const content = `
        <div style="min-width: 1000px; max-height: 80vh;">
            <div class="material-modal-header" style="margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h4><i class="fas fa-database"></i> 자재 관리</h4>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <span style="font-size: 12px; color: #6b7280;">상태: ${dataStatus.status}</span>
                    </div>
                </div>
                
                
                <div style="display: flex; gap: 10px; margin-top: 15px; align-items: center; justify-content: space-between;">
                    <!-- 자재 유형 선택 탭 -->
                    <div style="display: flex; gap: 5px; align-items: center;">
                        <button onclick="showLightweightMaterials()" id="lightweightTab" class="btn btn-primary btn-sm material-tab active">
                            <i class="fas fa-tools"></i> 벽체 경량 자재
                        </button>
                        <button onclick="showGypsumBoards()" id="gypsumTab" class="btn btn-outline-primary btn-sm material-tab">
                            <i class="fas fa-square"></i> 석고보드
                        </button>
                        <div style="margin-left: 15px; display: flex; gap: 5px;">
                            <button onclick="addCurrentMaterial()" id="addMaterialBtn" class="btn btn-success btn-sm" style="padding: 6px 12px;">
                                <i class="fas fa-plus"></i> 자재 추가
                            </button>
                        </div>
                    </div>
                    
                    <!-- 데이터 관리 드롭다운 -->
                    <div class="dropdown" style="position: relative;">
                        <button class="btn btn-sm btn-secondary dropdown-toggle" onclick="toggleDataManagementDropdown()" style="font-size: 12px;">
                            📊 데이터 관리 ▼
                        </button>
                        <div id="dataManagementDropdown" class="dropdown-menu" style="display: none; position: absolute; right: 0; top: 100%; z-index: 1000; background: white; border: 1px solid #ddd; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); min-width: 200px;">
                            <div class="dropdown-item" onclick="saveCurrentState()" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee; font-size: 12px;">
                                💾 현재 상태 저장
                            </div>
                            <div class="dropdown-item" onclick="exportAllData()" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee; font-size: 12px;">
                                📤 전체 데이터 내보내기
                            </div>
                            <div class="dropdown-item" onclick="importAllData()" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee; font-size: 12px;">
                                📥 전체 데이터 가져오기
                            </div>
                            <div class="dropdown-item" onclick="resetToOriginal()" style="padding: 8px 12px; cursor: pointer; color: #dc2626; font-size: 12px;">
                                🔄 원본으로 초기화
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            
            <!-- 자재 목록 테이블 컨테이너 -->
            <div id="materialTableContainer">
                <!-- 여기에 동적으로 테이블이 삽입됩니다 -->
            </div>
            
            <!-- 통계 정보 -->
            <div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 4px;">
                <div style="display: flex; justify-content: space-between; font-size: 12px;">
                    <span id="materialStats">자재 유형을 선택하세요</span>
                    <span id="materialTypeInfo">표준 자재 데이터베이스 관리</span>
                </div>
            </div>
        </div>
        
        <style>
            .material-tab {
                border: 1px solid #ddd;
                background: #f8f9fa;
                color: #6c757d;
                transition: all 0.2s;
            }
            .material-tab.active {
                background: #3b82f6;
                color: white;
                border-color: #3b82f6;
            }
            .material-tab:hover {
                background: #e9ecef;
            }
            .material-tab.active:hover {
                background: #2563eb;
            }
        </style>
    `;
    
    createModal('자재 관리', content, [
        { text: '닫기', class: 'btn-secondary', onClick: (modal) => modal.remove() }
    ]);
    
    // 기본으로 벽체 경량 자재 표시
    showLightweightMaterials();
}

async function loadStandardMaterials() {
    try {
        if (window.priceDB) {
            // priceDatabase.js 데이터가 이미 로드되어 있음을 확인
            const lightweightData = window.priceDB.getLightweightComponents();
            const gypsumData = window.priceDB.getGypsumBoards();
            
            if (lightweightData.items.length > 0 && gypsumData.items.length > 0) {
                showToast(`표준 자재가 이미 로드되어 있습니다. (경량부품: ${lightweightData.items.length}개, 석고보드: ${gypsumData.items.length}개)`, 'success');
                loadMaterialList(); // 자재 목록 새로고침
            } else {
                showToast('priceDatabase.js에서 자재 데이터를 찾을 수 없습니다.', 'error');
            }
        } else {
            showToast('priceDatabase.js가 로드되지 않았습니다.', 'error');
        }
    } catch (error) {
        console.error('표준 자재 확인 실패:', error);
        showToast('표준 자재 확인 실패', 'error');
    }
}

async function loadMaterialList() {
    try {
        // priceDatabase.js에서 모든 자재 데이터 가져오기
        let materials = [];
        
        // 1. priceDatabase.js에서 직접 가져오기 (우선순위)
        if (window.priceDB) {
            const lightweightComponents = window.priceDB.getLightweightComponents();
            const gypsumBoards = window.priceDB.getGypsumBoards();
            
            // 경량부품 변환
            lightweightComponents.items.forEach(item => {
                materials.push({
                    id: item.id,
                    name: item.name,
                    category: lightweightComponents.categories[item.category]?.name || item.category,
                    unit: item.unit,
                    materialPrice: item.price,
                    laborPrice: Math.round(item.price * 0.8), // 자재비의 80%
                    expensePrice: Math.round(item.price * 0.1), // 자재비의 10%
                    totalPrice: item.price + Math.round(item.price * 0.8) + Math.round(item.price * 0.1),
                    spec: item.spec,
                    note: item.note
                });
            });
            
            // 석고보드 변환
            gypsumBoards.items.forEach(item => {
                const price = item.priceChanged || item.priceOriginal;
                materials.push({
                    id: item.id,
                    name: `${item.name} ${item.w}x${item.h}x${item.t}`,
                    category: gypsumBoards.categories[item.category]?.name || item.category,
                    unit: item.unit,
                    materialPrice: price,
                    laborPrice: Math.round(price * 0.6), // 자재비의 60%
                    expensePrice: Math.round(price * 0.15), // 자재비의 15%
                    totalPrice: price + Math.round(price * 0.6) + Math.round(price * 0.15),
                    dimensions: `${item.w}x${item.h}x${item.t}`,
                    priceM2: item.priceM2,
                    note: item.note
                });
            });
        }
        
        // 기존 IndexedDB 데이터는 사용하지 않음 - priceDatabase.js만 사용
        
        // 표준자재로드에서 테이블 컬테이너 찾기
        const container = document.getElementById('materialTableContainer');
        const tableBody = document.getElementById('materialTableBody');
        const materialStats = document.getElementById('materialStats');
        
        if (container) {
            // 표준자재로드에서는 경량부품과 동일한 테이블 구조 사용
            const tableHTML = `
                <div class="material-table-container" style="max-height: 400px; overflow-y: auto; border: 1px solid #ddd;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                        <thead style="background: #f8f9fa; position: sticky; top: 0;">
                            <tr>
                                <th style="padding: 8px; border: 1px solid #ddd; min-width: 80px; text-align: center;">ID</th>
                                <th style="padding: 8px; border: 1px solid #ddd; min-width: 200px; text-align: center;">자재명</th>
                                <th style="padding: 8px; border: 1px solid #ddd; min-width: 120px; text-align: center;">카테고리</th>
                                <th style="padding: 8px; border: 1px solid #ddd; min-width: 50px; text-align: center;">단위</th>
                                <th style="padding: 8px; border: 1px solid #ddd; min-width: 120px; text-align: center;">규격</th>
                                <th style="padding: 8px; border: 1px solid #ddd; min-width: 80px; text-align: center;">단가</th>
                                <th style="padding: 8px; border: 1px solid #ddd; min-width: 80px; text-align: center;">비고</th>
                                <th style="padding: 8px; border: 1px solid #ddd; min-width: 150px; text-align: center;">작업</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${materials.length === 0 ? 
                                `<tr><td colspan="8" style="padding: 20px; text-align: center; color: #6b7280;">자재 데이터를 로드할 수 없습니다. priceDatabase.js를 확인해주세요.</td></tr>` :
                                materials.map(material => `
                                    <tr>
                                        <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${material.id || '-'}</td>
                                        <td style="padding: 6px; border: 1px solid #ddd; text-align: center;" title="${material.spec || material.dimensions || ''}">${material.name || '-'}</td>
                                        <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${material.category || '-'}</td>
                                        <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${material.unit || '-'}</td>
                                        <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${material.spec || material.dimensions || '-'}</td>
                                        <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">₩${(material.materialPrice || 0).toLocaleString()}</td>
                                        <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${material.note || '-'}</td>
                                        <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">
                                            <button onclick="editPriceMaterial('${material.id}')" class="btn btn-sm" style="padding: 2px 6px; margin-right: 2px;" title="가격 편집">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button onclick="viewMaterialDetail('${material.id}')" class="btn btn-sm" style="padding: 2px 6px; background: #059669; color: white;" title="상세 보기">
                                                <i class="fas fa-info"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')
                            }
                        </tbody>
                    </table>
                </div>
            `;
            container.innerHTML = tableHTML;
        } else if (tableBody) {
            // 기존 코드 (컴테이너가 없는 경우)
            if (materials.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="8" style="padding: 20px; text-align: center; color: #6b7280;">
                            자재 데이터를 로드할 수 없습니다. priceDatabase.js를 확인해주세요.
                        </td>
                    </tr>
                `;
            } else {
                tableBody.innerHTML = materials.map(material => `
                    <tr>
                        <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${material.id || '-'}</td>
                        <td style="padding: 6px; border: 1px solid #ddd; text-align: center;" title="${material.spec || material.dimensions || ''}">${material.name || '-'}</td>
                        <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${material.category || '-'}</td>
                        <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${material.unit || '-'}</td>
                        <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${material.spec || material.dimensions || '-'}</td>
                        <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">₩${(material.materialPrice || 0).toLocaleString()}</td>
                        <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${material.note || '-'}</td>
                        <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">
                            <button onclick="editPriceMaterial('${material.id}')" class="btn btn-sm" style="padding: 2px 6px; margin-right: 2px;" title="가격 편집">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="viewMaterialDetail('${material.id}')" class="btn btn-sm" style="padding: 2px 6px; background: #059669; color: white;" title="상세 보기">
                                <i class="fas fa-info"></i>
                            </button>
                        </td>
                    </tr>
                `).join('');
            }
        }
        
        if (materialStats) {
            materialStats.textContent = `총 ${materials.length}개 자재 (경량부품: ${materials.filter(m => m.id.startsWith('ST') || m.id.startsWith('RN') || m.id.startsWith('CH') || m.id.startsWith('BD')).length}, 석고보드: ${materials.filter(m => m.id.startsWith('G')).length})`;
        }
        
        console.log(`✅ 자재 목록 로드 완료: ${materials.length}개`);
        
    } catch (error) {
        console.error('자재 목록 로드 실패:', error);
        const tableBody = document.getElementById('materialTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="padding: 20px; text-align: center; color: #dc2626;">
                        자재 목록을 로드하는 중 오류가 발생했습니다: ${error.message}
                    </td>
                </tr>
            `;
        }
    }
}




function editMaterial(id) {
    showToast('자재 편집 기능은 개발 중입니다.', 'info');
}

async function deleteMaterial(id) {
    if (!confirm('이 자재를 삭제하시겠습니까?')) return;
    
    try {
        await Kiyeno.MaterialService.deleteMaterial(id);
        showToast('자재가 삭제되었습니다.', 'success');
        loadMaterialList();
    } catch (error) {
        console.error('자재 삭제 실패:', error);
        showToast('자재 삭제 중 오류가 발생했습니다.', 'error');
    }
}

function exportMaterials() {
    showToast('자재 내보내기 기능은 개발 중입니다.', 'info');
}

function importMaterials() {
    showToast('자재 가져오기 기능은 개발 중입니다.', 'info');
}

// =============================================================================
// Revit 연동 UI
// =============================================================================

function showRevitIntegrationModal() {
    const content = `
        <div style="min-width: 600px;">
            <h4>🏢 Revit 연동</h4>
            
            <div style="margin: 16px 0;">
                <h5>벽체 선택</h5>
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                    <button onclick="Kiyeno.RevitService.selectSingleWallFromRevit()" class="btn btn-primary">
                        단일 벽체 선택
                    </button>
                    <button onclick="Kiyeno.RevitService.selectMultipleWallsFromRevit()" class="btn btn-primary">
                        다중 벽체 선택
                    </button>
                </div>
            </div>
            
            <div id="revitDataContainer" style="margin-top: 20px;">
                <p style="text-align: center; color: #6b7280; padding: 20px;">
                    Revit에서 벽체를 선택해주세요.
                </p>
            </div>
        </div>
    `;
    
    createModal('Revit 연동', content);
    
    // 기존 Revit 데이터가 있으면 표시
    if (Kiyeno.RevitService.revitWallData.length > 0) {
        Kiyeno.RevitService.renderRevitDataSection();
    }
}

// =============================================================================
// 데이터 관리 함수들
// =============================================================================

// 데이터 관리 드롭다운 토글
function toggleDataManagementDropdown() {
    const dropdown = document.getElementById('dataManagementDropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    }
    
    // 외부 클릭 시 드롭다운 닫기
    document.addEventListener('click', function closeDropdown(e) {
        if (!e.target.closest('.dropdown')) {
            if (dropdown) dropdown.style.display = 'none';
            document.removeEventListener('click', closeDropdown);
        }
    });
}

// 현재 상태 저장
function saveCurrentState() {
    try {
        const savedState = window.priceDB.saveCurrentState();
        if (savedState) {
            showToast('현재 상태가 저장되었습니다.', 'success');
            
            // 자재 관리 모달 새로고침
            const modal = document.querySelector('.modal');
            if (modal) {
                modal.remove();
                showMaterialManagementModal();
            }
        } else {
            showToast('저장 중 오류가 발생했습니다.', 'error');
        }
    } catch (error) {
        console.error('상태 저장 실패:', error);
        showToast('저장 실패: ' + error.message, 'error');
    }
}

// 전체 데이터 내보내기
function exportAllData() {
    const content = `
        <div style="min-width: 500px;">
            <h4><i class="fas fa-download"></i> 전체 데이터 내보내기</h4>
            <div style="margin: 20px 0;">
                <div style="background: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                    <h5>📋 내보내기 정보</h5>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        <li>경량부품: ${window.priceDB.lightweightItemsCache ? window.priceDB.lightweightItemsCache.length : 0}개</li>
                        <li>석고보드: ${window.priceDB.gypsumItemsCache ? window.priceDB.gypsumItemsCache.length : 0}개</li>
                        <li>수정사항 추적 정보 포함</li>
                    </ul>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">파일명</label>
                        <input type="text" id="exportFileName" value="kiyeno_materials_${new Date().toISOString().slice(0, 10)}" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">파일 형식</label>
                        <select id="exportFormat" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="json">JSON (.json)</option>
                        </select>
                    </div>
                </div>
                
                <div style="background: #e7f3ff; padding: 15px; border-radius: 4px; border-left: 4px solid #3b82f6;">
                    <p style="margin: 0; font-size: 14px;">
                        <strong>ℹ️ 안내</strong><br>
                        브라우저의 기본 다운로드 폴더에 파일이 저장됩니다.<br>
                        파일을 다른 위치에 저장하려면 다운로드 완료 후 이동하세요.
                    </p>
                </div>
            </div>
        </div>
    `;

    createSubModal('전체 데이터 내보내기', content, [
        { text: '취소', class: 'btn-secondary', onClick: (modal) => closeSubModal(modal) },
        { text: '내보내기', class: 'btn-primary', onClick: (modal) => {
            performExportAllData(modal);
        }}
    ]);
}

// 전체 데이터 내보내기 실행
function performExportAllData(modal) {
    try {
        const fileName = document.getElementById('exportFileName')?.value.trim() || 'kiyeno_materials';
        const format = document.getElementById('exportFormat')?.value || 'json';
        
        // 파일명 유효성 검사
        if (!fileName) {
            showToast('파일명을 입력해주세요.', 'error');
            return;
        }
        
        // 전체 데이터 내보내기
        const allData = window.priceDB.exportAllData();
        const jsonString = JSON.stringify(allData, null, 2);
        
        // 파일 다운로드
        const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast(`전체 데이터가 ${fileName}.${format} 파일로 내보내졌습니다.`, 'success');
        
        // 서브 모달 닫기
        closeSubModal(modal);
        
    } catch (error) {
        console.error('전체 데이터 내보내기 실패:', error);
        showToast('내보내기 실패: ' + error.message, 'error');
    }
}

// 전체 데이터 가져오기
function importAllData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const importedData = JSON.parse(event.target.result);
                
                // 데이터 가져오기 확인 모달 표시
                showImportConfirmation(importedData, file.name);
                
            } catch (error) {
                console.error('파일 읽기 실패:', error);
                showToast('파일 형식이 올바르지 않습니다.', 'error');
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
}

// 가져오기 확인 모달
function showImportConfirmation(importedData, fileName) {
    const lightweightCount = importedData.lightweightComponents ? importedData.lightweightComponents.length : 0;
    const gypsumCount = importedData.gypsumBoards ? importedData.gypsumBoards.length : 0;
    const exportedAt = importedData.metadata ? importedData.metadata.exportedAt : '알 수 없음';
    
    const content = `
        <div style="min-width: 500px;">
            <h4><i class="fas fa-upload"></i> 전체 데이터 가져오기</h4>
            <div style="margin: 20px 0;">
                <div style="background: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                    <h5>📋 가져올 데이터 정보</h5>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        <li><strong>파일명:</strong> ${fileName}</li>
                        <li><strong>경량부품:</strong> ${lightweightCount}개</li>
                        <li><strong>석고보드:</strong> ${gypsumCount}개</li>
                        <li><strong>내보내기 날짜:</strong> ${new Date(exportedAt).toLocaleString('ko-KR')}</li>
                    </ul>
                </div>
                
                <div style="background: #fef3c7; padding: 15px; border-radius: 4px; border-left: 4px solid #f59e0b;">
                    <p style="margin: 0; font-size: 14px;">
                        <strong>⚠️ 주의사항</strong><br>
                        현재 작업 중인 데이터가 모두 대체됩니다.<br>
                        저장하지 않은 변경사항은 모두 사라집니다.
                    </p>
                </div>
            </div>
        </div>
    `;

    createSubModal('전체 데이터 가져오기', content, [
        { text: '취소', class: 'btn-secondary', onClick: (modal) => closeSubModal(modal) },
        { text: '가져오기', class: 'btn-primary', onClick: (modal) => {
            performImportAllData(importedData, modal);
        }}
    ]);
}

// 전체 데이터 가져오기 실행
function performImportAllData(importedData, modal) {
    try {
        const result = window.priceDB.importAllData(importedData);
        
        if (result.success) {
            showToast(`데이터 가져오기 완료: 경량부품 ${result.lightweightCount}개, 석고보드 ${result.gypsumCount}개`, 'success');
            
            // 서브 모달 닫기
            closeSubModal(modal);
            
            // 자재 관리 모달 새로고침
            const mainModal = document.querySelector('.modal');
            if (mainModal) {
                mainModal.remove();
                showMaterialManagementModal();
            }
        } else {
            showToast('데이터 가져오기 실패', 'error');
        }
        
    } catch (error) {
        console.error('데이터 가져오기 실패:', error);
        showToast('가져오기 실패: ' + error.message, 'error');
    }
}

// 변경사항 요약 보기
function showModificationsSummary() {
    const status = window.priceDB.getDataStatus();
    const summary = status.summary;
    
    const content = `
        <div style="min-width: 600px;">
            <h4>📋 변경사항 요약</h4>
            
            <div style="margin: 20px 0;">
                <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                    <h5>📊 전체 현황</h5>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 12px;">
                        <div style="text-align: center; padding: 12px; background: #dcfce7; border-radius: 6px;">
                            <div style="font-size: 24px; font-weight: bold; color: #059669;">${summary.lightweightComponents.added + summary.gypsumBoards.added}</div>
                            <div style="font-size: 12px; color: #065f46;">추가된 자재</div>
                        </div>
                        <div style="text-align: center; padding: 12px; background: #fef3c7; border-radius: 6px;">
                            <div style="font-size: 24px; font-weight: bold; color: #d97706;">${summary.lightweightComponents.modified + summary.gypsumBoards.modified}</div>
                            <div style="font-size: 12px; color: #92400e;">수정된 자재</div>
                        </div>
                        <div style="text-align: center; padding: 12px; background: #fecaca; border-radius: 6px;">
                            <div style="font-size: 24px; font-weight: bold; color: #dc2626;">${summary.lightweightComponents.deleted + summary.gypsumBoards.deleted}</div>
                            <div style="font-size: 12px; color: #991b1b;">삭제된 자재</div>
                        </div>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <!-- 경량부품 변경사항 -->
                    <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
                        <h6 style="margin-bottom: 12px; color: #374151;">🔧 벽체 경량 자재</h6>
                        <div style="font-size: 14px; line-height: 1.5;">
                            <div>✅ 추가: <strong>${summary.lightweightComponents.added}개</strong></div>
                            <div>✏️ 수정: <strong>${summary.lightweightComponents.modified}개</strong></div>
                            <div>❌ 삭제: <strong>${summary.lightweightComponents.deleted}개</strong></div>
                        </div>
                    </div>
                    
                    <!-- 석고보드 변경사항 -->
                    <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
                        <h6 style="margin-bottom: 12px; color: #374151;">🟦 석고보드</h6>
                        <div style="font-size: 14px; line-height: 1.5;">
                            <div>✅ 추가: <strong>${summary.gypsumBoards.added}개</strong></div>
                            <div>✏️ 수정: <strong>${summary.gypsumBoards.modified}개</strong></div>
                            <div>❌ 삭제: <strong>${summary.gypsumBoards.deleted}개</strong></div>
                        </div>
                    </div>
                </div>
                
                ${summary.total === 0 ? `
                    <div style="text-align: center; padding: 40px; color: #6b7280;">
                        📝 아직 변경사항이 없습니다.
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    createModal('변경사항 요약', content, [
        { text: '닫기', class: 'btn-primary', onClick: (modal) => modal.remove() }
    ]);
}

// 원본으로 초기화
function resetToOriginal() {
    const content = `
        <div style="text-align: center; padding: 20px;">
            <div style="font-size: 48px; color: #dc2626; margin-bottom: 16px;">
                ⚠️
            </div>
            <h3 style="margin-bottom: 16px; color: #1f2937;">원본 데이터로 초기화</h3>
            <p style="margin-bottom: 8px; color: #4b5563;">모든 수정사항을 삭제하고 원본 데이터로 되돌리시겠습니까?</p>
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px; margin: 16px 0;">
                <p style="color: #dc2626; font-size: 14px; margin: 0;">
                    <strong>주의:</strong> 이 작업은 되돌릴 수 없습니다.<br>
                    저장된 수정사항과 현재 세션의 모든 변경사항이 삭제됩니다.
                </p>
            </div>
        </div>
    `;
    
    createModal('원본으로 초기화', content, [
        { 
            text: '취소', 
            class: 'btn-secondary', 
            onClick: (modal) => modal.remove() 
        },
        { 
            text: '초기화', 
            class: 'btn-danger', 
            onClick: (modal) => {
                performReset();
                modal.remove();
            }
        }
    ]);
}

// 초기화 실행
function performReset() {
    try {
        const success = window.priceDB.resetToOriginal();
        if (success) {
            showToast('원본 데이터로 초기화되었습니다.', 'success');
            
            // 자재 관리 모달 새로고침
            const modal = document.querySelector('.modal');
            if (modal) {
                modal.remove();
                showMaterialManagementModal();
            }
        } else {
            showToast('초기화 실패', 'error');
        }
    } catch (error) {
        console.error('초기화 실패:', error);
        showToast('초기화 실패: ' + error.message, 'error');
    }
}

// =============================================================================
// 전역 함수 등록
// =============================================================================

// 데이터 관리 함수들
window.showDataManagementModal = showDataManagementModal;
window.handleFileImport = handleFileImport;
window.confirmDataClear = confirmDataClear;




// 벽체 경량 자재 표시 함수
function showLightweightMaterials() {
    // 탭 활성화 상태 변경
    const lightweightTab = document.getElementById('lightweightTab');
    const gypsumTab = document.getElementById('gypsumTab');
    
    if (lightweightTab && gypsumTab) {
        lightweightTab.className = 'btn btn-primary btn-sm material-tab active';
        gypsumTab.className = 'btn btn-outline-primary btn-sm material-tab';
    }
    
    if (!window.priceDB) {
        showToast('priceDatabase.js를 찾을 수 없습니다.', 'error');
        return;
    }
    
    const lightweightData = window.priceDB.getLightweightComponents();
    
    // 디버깅을 위한 로그
    console.log('🔍 getLightweightComponents 결과:', lightweightData);
    console.log('🔍 items 길이:', lightweightData?.items?.length);
    console.log('🔍 첫 번째 아이템:', lightweightData?.items?.[0]);
    
    const container = document.getElementById('materialTableContainer');
    const materialStats = document.getElementById('materialStats');
    const materialTypeInfo = document.getElementById('materialTypeInfo');
    
    if (!container) return;
    
    // 데이터가 없으면 오류 메시지 표시
    if (!lightweightData || !lightweightData.items || lightweightData.items.length === 0) {
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">경량자재 데이터가 없습니다.</div>';
        console.error('❌ 경량자재 데이터 로드 실패');
        return;
    }
    
    // 벽체 경량 자재 테이블 생성 (14개 컬럼)
    const tableHTML = `
        <div class="material-table-container" style="max-height: 400px; overflow-y: auto; border: 1px solid #ddd;">
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <thead style="background: #f8f9fa; position: sticky; top: 0;">
                    <tr>
                        <th style="padding: 6px; border: 1px solid #ddd; min-width: 60px; text-align: center;">ID</th>
                        <th style="padding: 6px; border: 1px solid #ddd; min-width: 100px; text-align: center;">품목</th>
                        <th style="padding: 6px; border: 1px solid #ddd; min-width: 150px; text-align: center;">자재명</th>
                        <th style="padding: 6px; border: 1px solid #ddd; min-width: 100px; text-align: center;">규격</th>
                        <th style="padding: 6px; border: 1px solid #ddd; min-width: 80px; text-align: center;">싸이즈</th>
                        <th style="padding: 6px; border: 1px solid #ddd; min-width: 50px; text-align: center;">단위</th>
                        <th style="padding: 6px; border: 1px solid #ddd; min-width: 80px; text-align: center;">자재비</th>
                        <th style="padding: 6px; border: 1px solid #ddd; min-width: 80px; text-align: center;">노무비</th>
                        <th style="padding: 6px; border: 1px solid #ddd; min-width: 100px; text-align: center;">노무비 생산성(기준)</th>
                        <th style="padding: 6px; border: 1px solid #ddd; min-width: 80px; text-align: center;">노무비 보할</th>
                        <th style="padding: 6px; border: 1px solid #ddd; min-width: 80px; text-align: center;">공종1</th>
                        <th style="padding: 6px; border: 1px solid #ddd; min-width: 80px; text-align: center;">공종2</th>
                        <th style="padding: 6px; border: 1px solid #ddd; min-width: 80px; text-align: center;">부위</th>
                        <th style="padding: 6px; border: 1px solid #ddd; min-width: 120px; text-align: center;">작업</th>
                    </tr>
                    <tr style="background: #ffffff;">
                        <th style="padding: 4px; border: 1px solid #ddd;">
                            <input type="text" id="filterLightweightId" placeholder="ID" 
                                   style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 3px; font-size: 10px; text-align: center;"
                                   onkeyup="filterLightweightMaterials()">
                        </th>
                        <th style="padding: 4px; border: 1px solid #ddd;">
                            <input type="text" id="filterLightweightCategory" placeholder="품목" 
                                   style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 3px; font-size: 10px; text-align: center;"
                                   onkeyup="filterLightweightMaterials()">
                        </th>
                        <th style="padding: 4px; border: 1px solid #ddd;">
                            <input type="text" id="filterLightweightName" placeholder="자재명" 
                                   style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 3px; font-size: 10px; text-align: center;"
                                   onkeyup="filterLightweightMaterials()">
                        </th>
                        <th style="padding: 4px; border: 1px solid #ddd;">
                            <input type="text" id="filterLightweightSpec" placeholder="규격" 
                                   style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 3px; font-size: 10px; text-align: center;"
                                   onkeyup="filterLightweightMaterials()">
                        </th>
                        <th style="padding: 4px; border: 1px solid #ddd;">
                            <input type="text" id="filterLightweightSize" placeholder="싸이즈" 
                                   style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 3px; font-size: 10px; text-align: center;"
                                   onkeyup="filterLightweightMaterials()">
                        </th>
                        <th style="padding: 4px; border: 1px solid #ddd;">
                            <input type="text" id="filterLightweightUnit" placeholder="단위" 
                                   style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 3px; font-size: 10px; text-align: center;"
                                   onkeyup="filterLightweightMaterials()">
                        </th>
                        <th style="padding: 4px; border: 1px solid #ddd;"></th>
                        <th style="padding: 4px; border: 1px solid #ddd;"></th>
                        <th style="padding: 4px; border: 1px solid #ddd;"></th>
                        <th style="padding: 4px; border: 1px solid #ddd;"></th>
                        <th style="padding: 4px; border: 1px solid #ddd;"></th>
                        <th style="padding: 4px; border: 1px solid #ddd;"></th>
                        <th style="padding: 4px; border: 1px solid #ddd;"></th>
                        <th style="padding: 4px; border: 1px solid #ddd;">
                            <button onclick="clearLightweightFilters()" style="width: 100%; padding: 4px; font-size: 10px; background: #dc2626; color: white; border: none; border-radius: 3px;" title="필터 초기화">
                                초기화
                            </button>
                        </th>
                    </tr>
                </thead>
                <tbody id="materialTableBody">
                    ${lightweightData.items.map(item => {
                        // 품목명 변경 로직 및 자재명 정리
                        let categoryDisplayName = '';
                        let newSpecification = '-';
                        let cleanedName = item.name;
                        const categoryName = lightweightData.categories[item.category]?.name || item.category;
                        
                        if (categoryName.includes('STUD')) {
                            categoryDisplayName = '스터드';
                            // 스터드 규격 추출 (예: "메탈 스터드 50형" → "50형")
                            const match = item.name.match(/(\d+형)/);
                            if (match) {
                                newSpecification = match[1];
                                // 자재명에서 규격 부분 제거 (예: "메탈 스터드 50형" → "메탈 스터드")
                                cleanedName = item.name.replace(/\s*\d+형/g, '');
                            }
                        } else if (categoryName.includes('RUNNER')) {
                            categoryDisplayName = '런너';
                            // 런너 규격 추출 (예: "메탈 런너 50형" → "50형")
                            const match = item.name.match(/(\d+형)/);
                            if (match) {
                                newSpecification = match[1];
                                // 자재명에서 규격 부분 제거 (예: "메탈 런너 50형" → "메탈 런너")
                                cleanedName = item.name.replace(/\s*\d+형/g, '');
                            }
                        } else if (item.name.includes('메거진피스')) {
                            categoryDisplayName = '피스';
                            // 피스 규격에 용도 포함 (note에서 추출)
                            if (item.note) {
                                newSpecification = item.note;
                            }
                            // 피스는 원본 자재명 그대로 사용 (note 제외)
                            cleanedName = item.name;
                        } else if (item.name.includes('타정총알')) {
                            categoryDisplayName = '타정총알';
                            // 타정총알 규격에 용도 포함 (note에서 추출)
                            if (item.note) {
                                newSpecification = item.note;
                            }
                            // 타정총알은 원본 자재명 그대로 사용 (note 제외)
                            cleanedName = item.name;
                        } else if (item.name.includes('용접봉')) {
                            categoryDisplayName = '용접봉';
                            // 용접봉 규격에 용도 포함 (note에서 추출)
                            if (item.note) {
                                newSpecification = item.note;
                            }
                        } else {
                            categoryDisplayName = categoryName;
                        }
                        
                        return `
                        <tr>
                            <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">${item.id}</td>
                            <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">${categoryDisplayName}</td>
                            <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">${
                                (item.name.includes('메거진피스') || item.name.includes('타정총알') || item.name.includes('용접봉')) 
                                    ? item.name 
                                    : item.name + (item.note ? ' ' + item.note : '')
                            }</td>
                            <td style="padding: 4px; border: 1px solid #ddd; text-align: center;" title="규격">${item.spec || ''}</td>
                            <td style="padding: 4px; border: 1px solid #ddd; text-align: center;" title="싸이즈">${item.size || ''}</td>
                            <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">${item.unit}</td>
                            <td style="padding: 4px; border: 1px solid #ddd; text-align: right;">₩${item.price.toLocaleString()}</td>
                            <td style="padding: 4px; border: 1px solid #ddd; text-align: right;">₩${(item.laborCost || 0).toLocaleString()}</td>
                            <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">${item.laborProductivity || 0}</td>
                            <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">
                                <input type="number" 
                                       value="${item.laborCompensation || 100}" 
                                       min="0" max="500" step="1"
                                       style="width: 50px; text-align: center; border: 1px solid #ccc; padding: 2px;"
                                       onchange="updateLaborCompensation('${item.id}', this.value)"
                                       title="노무비 보할 (%)" />%
                            </td>
                            <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">${item.workType1 || ''}</td>
                            <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">${item.workType2 || ''}</td>
                            <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">${item.location || ''}</td>
                            <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">${item.work || ''}</td>
                            <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">
                                <button onclick="editLightweightMaterial('${item.id}')" class="btn btn-sm" style="padding: 2px 4px; margin-right: 2px; background: #3b82f6; color: white; font-size: 10px;" title="자재 편집">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="deleteLightweightMaterial('${item.id}')" class="btn btn-sm" style="padding: 2px 4px; background: #dc2626; color: white; font-size: 10px;" title="자재 삭제">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = tableHTML;
    
    // 통계 업데이트
    if (materialStats) {
        materialStats.textContent = `벽체 경량 자재: ${lightweightData.items.length}개`;
    }
    if (materialTypeInfo) {
        materialTypeInfo.textContent = '벽체용 경량 철골 자재 데이터베이스';
    }
    
    console.log(`✅ 벽체 경량 자재 ${lightweightData.items.length}개 표시 완료`);
}

// 석고보드 표시 함수
function showGypsumBoards() {
    // 탭 활성화 상태 변경
    const lightweightTab = document.getElementById('lightweightTab');
    const gypsumTab = document.getElementById('gypsumTab');
    
    if (lightweightTab && gypsumTab) {
        lightweightTab.className = 'btn btn-outline-primary btn-sm material-tab';
        gypsumTab.className = 'btn btn-primary btn-sm material-tab active';
    }
    
    if (!window.priceDB) {
        showToast('priceDatabase.js를 찾을 수 없습니다.', 'error');
        return;
    }
    
    console.log('🔍 석고보드 데이터 로드 시작');
    
    // ES6 모듈에서 실제 priceDatabase 인스턴스 가져오기
    let gypsumData;
    if (window.priceDatabase && typeof window.priceDatabase.getGypsumBoards === 'function') {
        console.log('📦 ES6 모듈에서 석고보드 데이터 로드');
        gypsumData = window.priceDatabase.getGypsumBoards();
    } else if (window.priceDB && typeof window.priceDB.getGypsumBoards === 'function') {
        console.log('📦 window.priceDB에서 석고보드 데이터 로드');
        gypsumData = window.priceDB.getGypsumBoards();
    } else {
        console.error('❌ priceDatabase를 찾을 수 없습니다.');
        showToast('석고보드 데이터를 로드할 수 없습니다.', 'error');
        return;
    }
    
    const container = document.getElementById('materialTableContainer');
    const materialStats = document.getElementById('materialStats');
    const materialTypeInfo = document.getElementById('materialTypeInfo');
    
    console.log('container:', container);
    
    if (!container) {
        console.error('❌ materialTableContainer 요소를 찾을 수 없습니다.');
        return;
    }
    
    // 석고보드 테이블 생성 (석고보드.txt 헤더 구조 참조)
    const tableHTML = `
        <div class="material-table-container" style="max-height: 400px; overflow-y: auto; border: 1px solid #ddd;">
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <thead style="background: #f8f9fa; position: sticky; top: 0;">
                    <tr>
                        <th rowspan="2" style="padding: 8px; border: 1px solid #ddd; min-width: 60px; text-align: center;">ID</th>
                        <th rowspan="2" style="padding: 8px; border: 1px solid #ddd; min-width: 180px; text-align: center;">품명</th>
                        <th colspan="3" style="padding: 8px; border: 1px solid #ddd; background: #e3f2fd; text-align: center;">치수</th>
                        <th rowspan="2" style="padding: 8px; border: 1px solid #ddd; min-width: 50px; text-align: center;">단위</th>
                        <th rowspan="2" style="padding: 8px; border: 1px solid #ddd; min-width: 50px; text-align: center;">수량</th>
                        <th colspan="2" style="padding: 8px; border: 1px solid #ddd; background: #fff3e0; text-align: center;">단가</th>
                        <th rowspan="2" style="padding: 8px; border: 1px solid #ddd; min-width: 80px; text-align: center;">M2 단가</th>
                        <th rowspan="2" style="padding: 8px; border: 1px solid #ddd; min-width: 80px; text-align: center;">비고</th>
                        <th rowspan="2" style="padding: 8px; border: 1px solid #ddd; min-width: 80px; text-align: center;">작업</th>
                    </tr>
                    <tr>
                        <th style="padding: 4px; border: 1px solid #ddd; min-width: 50px; background: #e3f2fd; text-align: center;">W</th>
                        <th style="padding: 4px; border: 1px solid #ddd; min-width: 50px; background: #e3f2fd; text-align: center;">H</th>
                        <th style="padding: 4px; border: 1px solid #ddd; min-width: 40px; background: #e3f2fd; text-align: center;">T</th>
                        <th style="padding: 4px; border: 1px solid #ddd; min-width: 70px; background: #fff3e0; text-align: center;">당초</th>
                        <th style="padding: 4px; border: 1px solid #ddd; min-width: 70px; background: #fff3e0; text-align: center;">변경</th>
                    </tr>
                    <tr style="background: #ffffff;">
                        <th style="padding: 4px; border: 1px solid #ddd;">
                            <input type="text" id="filterGypsumId" placeholder="ID" 
                                   style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 2px; font-size: 10px; text-align: center;"
                                   onkeyup="filterGypsumBoards()">
                        </th>
                        <th style="padding: 4px; border: 1px solid #ddd;">
                            <input type="text" id="filterGypsumName" placeholder="품명" 
                                   style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 2px; font-size: 10px; text-align: center;"
                                   onkeyup="filterGypsumBoards()">
                        </th>
                        <th style="padding: 4px; border: 1px solid #ddd;">
                            <input type="text" id="filterGypsumW" placeholder="W" 
                                   style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 2px; font-size: 10px; text-align: center;"
                                   onkeyup="filterGypsumBoards()">
                        </th>
                        <th style="padding: 4px; border: 1px solid #ddd;">
                            <input type="text" id="filterGypsumH" placeholder="H" 
                                   style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 2px; font-size: 10px; text-align: center;"
                                   onkeyup="filterGypsumBoards()">
                        </th>
                        <th style="padding: 4px; border: 1px solid #ddd;">
                            <input type="text" id="filterGypsumT" placeholder="T" 
                                   style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 2px; font-size: 10px; text-align: center;"
                                   onkeyup="filterGypsumBoards()">
                        </th>
                        <th style="padding: 4px; border: 1px solid #ddd;"></th>
                        <th style="padding: 4px; border: 1px solid #ddd;"></th>
                        <th style="padding: 4px; border: 1px solid #ddd;"></th>
                        <th style="padding: 4px; border: 1px solid #ddd;"></th>
                        <th style="padding: 4px; border: 1px solid #ddd;"></th>
                        <th style="padding: 4px; border: 1px solid #ddd;"></th>
                        <th style="padding: 4px; border: 1px solid #ddd;">
                            <button onclick="clearGypsumFilters()" style="width: 100%; padding: 4px; font-size: 10px; background: #dc2626; color: white; border: none; border-radius: 2px;" title="필터 초기화">
                                초기화
                            </button>
                        </th>
                    </tr>
                </thead>
                <tbody id="materialTableBody">
                    ${gypsumData.items && gypsumData.items.length > 0 ? gypsumData.items.map(item => {
                        // M2 단가 계산: 변경단가 또는 당초단가를 면적으로 나눔
                        const unitPrice = (item.priceChanged || item.priceOriginal || 0);
                        const areaM2 = ((item.w || 0) / 1000) * ((item.h || 0) / 1000);
                        const pricePerM2 = areaM2 > 0 ? Math.round(unitPrice / areaM2) : 0;
                        
                        return `
                        <tr>
                            <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">${item.id}</td>
                            <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">${item.name}</td>
                            <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">${item.w}</td>
                            <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">${item.h}</td>
                            <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">${item.t}</td>
                            <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">${item.unit}</td>
                            <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">${item.qty.toFixed(2)}</td>
                            <td style="padding: 4px; border: 1px solid #ddd; text-align: right;">₩${item.priceOriginal.toLocaleString()}</td>
                            <td style="padding: 4px; border: 1px solid #ddd; text-align: right; ${item.priceChanged !== item.priceOriginal ? 'background: #fef3c7; font-weight: bold;' : ''}">₩${item.priceChanged.toLocaleString()}</td>
                            <td style="padding: 4px; border: 1px solid #ddd; text-align: right;">₩${pricePerM2.toLocaleString()}</td>
                            <td style="padding: 4px; border: 1px solid #ddd; font-size: 10px; text-align: center;">${item.note || '-'}</td>
                            <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">
                                <button onclick="editGypsumBoard('${item.id}')" class="btn btn-sm" style="padding: 2px 6px; margin-right: 2px; background: #3b82f6; color: white;" title="석고보드 편집">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="deleteGypsumBoard('${item.id}')" class="btn btn-sm" style="padding: 2px 6px; background: #dc2626; color: white;" title="석고보드 삭제">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                        `;
                    }).join('') : '<tr><td colspan="12" style="text-align: center; padding: 20px; color: #666;">석고보드 데이터가 없습니다.</td></tr>'}
                </tbody>
            </table>
        </div>
    `;
    
    console.log('🔧 테이블 HTML 생성 완료, container에 삽입 중...');
    container.innerHTML = tableHTML;
    
    // 통계 업데이트
    const itemCount = gypsumData.items ? gypsumData.items.length : 0;
    if (materialStats) {
        materialStats.textContent = `석고보드: ${itemCount}개`;
    }
    if (materialTypeInfo) {
        materialTypeInfo.textContent = '석고보드 및 단열재 데이터베이스';
    }
    
    console.log(`✅ 석고보드 ${itemCount}개 표시 완료`);
}


// =============================================================================
// 경량부품 관리 함수들
// =============================================================================

// 경량부품 추가 (14개 컬럼 구조)
function addLightweightMaterial() {
    const content = `
        <div style="min-width: 900px; max-height: 80vh; overflow-y: auto;">
            <h4><i class="fas fa-plus"></i> 경량부품 추가</h4>
            <div style="margin: 20px 0;">
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2563eb;">자재명 *</label>
                        <input type="text" id="addMaterialName" placeholder="예: 메탈 스터드 250형" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2563eb;">품목 (카테고리) *</label>
                        <select id="addMaterialCategory" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="">카테고리 선택</option>
                            <option value="STUD_KS">STUD - KS형</option>
                            <option value="RUNNER_KS">RUNNER - KS형</option>
                            <option value="STUD_BS">STUD - BS형</option>
                            <option value="RUNNER_BS">RUNNER - BS형</option>
                            <option value="CH_STUD_J_RUNNER">CH-STUD / J런너</option>
                            <option value="BEADS">비드류</option>
                            <option value="FASTENERS">체결부품</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #6b7280;">규격 (자동생성)</label>
                        <input type="text" id="addMaterialNewSpec" placeholder="자동 생성됨" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; background: #f3f4f6;" readonly>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2563eb;">싸이즈 *</label>
                        <input type="text" id="addMaterialSpec" placeholder="예: 0.8T*250*45, 3*21, DN22" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2563eb;">단위 *</label>
                        <select id="addMaterialUnit" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="M">M (미터)</option>
                            <option value="EA">EA (개)</option>
                            <option value="KG">KG (킬로그램)</option>
                            <option value="T">T (톤)</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #dc2626;">자재비 (원) *</label>
                        <input type="number" id="addMaterialPrice" placeholder="예: 2500" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #6b7280;">노무비 생산성</label>
                        <input type="text" value="기준" readonly
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; background: #f3f4f6;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #dc2626;">노무비 보할 (%)</label>
                        <input type="number" id="addMaterialLaborComp" value="100" min="0" max="500" step="1"
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #059669;">공종1</label>
                        <input type="text" value="경량" readonly
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; background: #f3f4f6;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #059669;">공종2</label>
                        <input type="text" value="경량" readonly
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; background: #f3f4f6;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #059669;">부위</label>
                        <input type="text" value="벽체" readonly
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; background: #f3f4f6;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">비고/용도</label>
                        <input type="text" id="addMaterialNote" placeholder="예: ㉿, 구조틀용, 석고취부용" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                </div>
            </div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 4px; margin-top: 15px;">
                <p style="margin: 0; font-size: 14px; color: #6b7280;">
                    <strong>ℹ️ 안내</strong><br>
                    • <span style="color: #2563eb;">파란색</span>: 필수 입력 필드<br>
                    • <span style="color: #dc2626;">빨간색</span>: 가격/노무 관련 필드<br>
                    • <span style="color: #059669;">초록색</span>: 자동 설정 필드<br>
                    • <span style="color: #6b7280;">회색</span>: 자동 생성 필드<br>
                    • 규격은 자재명과 비고를 기반으로 자동 생성됩니다.
                </p>
            </div>
        </div>
    `;

    createSubModal('경량부품 추가', content, [
        { text: '취소', class: 'btn-secondary', onClick: (modal) => closeSubModal(modal) },
        { text: '추가', class: 'btn-primary', onClick: (modal) => {
            saveLightweightMaterial(modal);
        }}
    ]);
}

// 경량부품 편집
function editLightweightMaterial(materialId) {
    const material = window.priceDB.findLightweightComponentById(materialId);
    if (!material) {
        showToast('자재를 찾을 수 없습니다.', 'error');
        return;
    }

    const content = `
        <div style="min-width: 900px;">
            <h4><i class="fas fa-edit"></i> 경량부품 편집: ${material.name}</h4>
            <div style="margin: 20px 0;">
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                    <!-- Row 1: 기본 정보 (파란색) -->
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #1e40af;">ID *</label>
                        <input type="text" id="editMaterialId" value="${material.id}" disabled 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; background: #f3f4f6; color: #6b7280;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #1e40af;">품목 *</label>
                        <select id="editMaterialCategory" style="width: 100%; padding: 8px; border: 1px solid #1e40af; border-radius: 4px; background: #dbeafe;">
                            <option value="STUD_KS" ${material.category === 'STUD_KS' ? 'selected' : ''}>STUD - KS형</option>
                            <option value="RUNNER_KS" ${material.category === 'RUNNER_KS' ? 'selected' : ''}>RUNNER - KS형</option>
                            <option value="STUD_BS" ${material.category === 'STUD_BS' ? 'selected' : ''}>STUD - BS형</option>
                            <option value="RUNNER_BS" ${material.category === 'RUNNER_BS' ? 'selected' : ''}>RUNNER - BS형</option>
                            <option value="CH_STUD_J_RUNNER" ${material.category === 'CH_STUD_J_RUNNER' ? 'selected' : ''}>CH-STUD / J런너</option>
                            <option value="BEADS" ${material.category === 'BEADS' ? 'selected' : ''}>비드류</option>
                            <option value="FASTENERS" ${material.category === 'FASTENERS' ? 'selected' : ''}>체결부품</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #1e40af;">자재명 *</label>
                        <input type="text" id="editMaterialName" value="${material.name}" 
                               style="width: 100%; padding: 8px; border: 1px solid #1e40af; border-radius: 4px; background: #dbeafe;">
                    </div>
                    
                    <!-- Row 2: 규격/사이즈 (자동 생성/회색) -->
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #6b7280;">규격</label>
                        <input type="text" id="editMaterialSpec" value="${material.spec}" disabled
                               style="width: 100%; padding: 8px; border: 1px solid #9ca3af; border-radius: 4px; background: #f9fafb; color: #6b7280;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #1e40af;">사이즈 *</label>
                        <input type="text" id="editMaterialSize" value="${material.size || ''}" 
                               style="width: 100%; padding: 8px; border: 1px solid #1e40af; border-radius: 4px; background: #dbeafe;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #1e40af;">단위 *</label>
                        <select id="editMaterialUnit" style="width: 100%; padding: 8px; border: 1px solid #1e40af; border-radius: 4px; background: #dbeafe;">
                            <option value="M" ${material.unit === 'M' ? 'selected' : ''}>M (미터)</option>
                            <option value="EA" ${material.unit === 'EA' ? 'selected' : ''}>EA (개)</option>
                            <option value="KG" ${material.unit === 'KG' ? 'selected' : ''}>KG (킬로그램)</option>
                            <option value="T" ${material.unit === 'T' ? 'selected' : ''}>T (톤)</option>
                        </select>
                    </div>
                    
                    <!-- Row 3: 가격 정보 (빨간색) -->
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #dc2626;">자재비 (원) *</label>
                        <input type="number" id="editMaterialPrice" value="${material.price}" 
                               style="width: 100%; padding: 8px; border: 1px solid #dc2626; border-radius: 4px; background: #fef2f2;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #dc2626;">노무비 (원)</label>
                        <input type="number" id="editMaterialLaborCost" value="${material.laborCost || 0}" 
                               style="width: 100%; padding: 8px; border: 1px solid #dc2626; border-radius: 4px; background: #fef2f2;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #dc2626;">노무비 생산성(기준)</label>
                        <input type="number" id="editMaterialLaborProductivity" value="${material.laborProductivity || 0}" step="0.001"
                               style="width: 100%; padding: 8px; border: 1px solid #dc2626; border-radius: 4px; background: #fef2f2;">
                    </div>
                    
                    <!-- Row 4: 노무비 보할, 공종 (빨간색/녹색) -->
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #dc2626;">노무비 보할 (%)</label>
                        <input type="number" id="editMaterialLaborCompensation" value="${material.laborCompensation || 100}" min="0" max="500" step="1"
                               style="width: 100%; padding: 8px; border: 1px solid #dc2626; border-radius: 4px; background: #fef2f2;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #16a34a;">공종1</label>
                        <input type="text" id="editMaterialWorkType1" value="경량" disabled
                               style="width: 100%; padding: 8px; border: 1px solid #16a34a; border-radius: 4px; background: #f0fdf4; color: #16a34a;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #16a34a;">공종2</label>
                        <input type="text" id="editMaterialWorkType2" value="경량" disabled
                               style="width: 100%; padding: 8px; border: 1px solid #16a34a; border-radius: 4px; background: #f0fdf4; color: #16a34a;">
                    </div>
                    
                    <!-- Row 5: 부위, 작업, 비고 -->
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #16a34a;">부위</label>
                        <input type="text" id="editMaterialLocation" value="${material.location || ''}" 
                               style="width: 100%; padding: 8px; border: 1px solid #16a34a; border-radius: 4px; background: #f0fdf4;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #1e40af;">작업</label>
                        <input type="text" id="editMaterialWork" value="${material.work || ''}" 
                               style="width: 100%; padding: 8px; border: 1px solid #1e40af; border-radius: 4px; background: #dbeafe;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #6b7280;">비고</label>
                        <input type="text" id="editMaterialNote" value="${material.note || ''}" 
                               style="width: 100%; padding: 8px; border: 1px solid #9ca3af; border-radius: 4px;">
                    </div>
                </div>
            </div>
            <div style="background: linear-gradient(90deg, #dbeafe 0%, #fef2f2 50%, #f0fdf4 100%); padding: 15px; border-radius: 4px; margin-top: 15px;">
                <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.4;">
                    <strong>색상 구분:</strong> 
                    <span style="color: #1e40af;">🔵 기본정보</span> | 
                    <span style="color: #dc2626;">🔴 가격/노무비</span> | 
                    <span style="color: #16a34a;">🟢 공종/부위</span> | 
                    <span style="color: #6b7280;">⚪ 자동생성</span>
                    <br><strong>*</strong> 필수 입력 항목 | 규격은 자재명에서 자동 추출됩니다.
                </p>
            </div>
        </div>
    `;

    createSubModal('경량부품 편집', content, [
        { text: '취소', class: 'btn-secondary', onClick: (modal) => closeSubModal(modal) },
        { text: '저장', class: 'btn-primary', onClick: (modal) => {
            updateLightweightMaterial(materialId, modal);
        }}
    ]);
}

// 경량부품 삭제
function deleteLightweightMaterial(materialId) {
    const material = window.priceDB.findLightweightComponentById(materialId);
    if (!material) {
        showToast('자재를 찾을 수 없습니다.', 'error');
        return;
    }

    const content = `
        <div style="text-align: center; padding: 20px;">
            <div style="font-size: 48px; color: #dc2626; margin-bottom: 16px;">
                ⚠️
            </div>
            <h3 style="margin-bottom: 16px; color: #1f2937;">경량부품 삭제 확인</h3>
            <p style="margin-bottom: 8px; color: #4b5563;">다음 자재를 삭제하시겠습니까?</p>
            <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; margin: 16px 0;">
                <strong style="color: #1f2937;">${material.name}</strong>
                <br>
                <span style="color: #6b7280; font-size: 14px;">ID: ${material.id} | 규격: ${material.spec} | 단가: ₩${material.price.toLocaleString()}</span>
            </div>
            <p style="color: #dc2626; font-size: 14px; margin-top: 16px;">
                <strong>주의:</strong> 삭제된 데이터는 복구할 수 없습니다.
            </p>
        </div>
    `;

    createSubModal('경량부품 삭제', content, [
        { 
            text: '취소', 
            class: 'btn-secondary', 
            onClick: (modal) => closeSubModal(modal)
        },
        { 
            text: '삭제', 
            class: 'btn-danger', 
            onClick: (modal) => {
                performLightweightDeletion(materialId);
                closeSubModal(modal);
            }
        }
    ]);
}

// 경량부품 저장 (추가)
function saveLightweightMaterial(modal = null) {
    try {
        const materialData = {
            name: document.getElementById('addMaterialName')?.value.trim() || '',
            category: document.getElementById('addMaterialCategory')?.value || '',
            spec: document.getElementById('addMaterialSpec')?.value.trim() || '',
            unit: document.getElementById('addMaterialUnit')?.value || 'M',
            price: parseInt(document.getElementById('addMaterialPrice')?.value) || 0,
            note: document.getElementById('addMaterialNote')?.value.trim() || ''
        };

        // 유효성 검사
        if (!materialData.name) {
            throw new Error('자재명을 입력해주세요.');
        }
        if (!materialData.category) {
            throw new Error('카테고리를 선택해주세요.');
        }
        if (!materialData.spec) {
            throw new Error('규격을 입력해주세요.');
        }
        if (!materialData.price || materialData.price <= 0) {
            throw new Error('올바른 단가를 입력해주세요.');
        }

        // 데이터베이스에 추가
        const newMaterial = window.priceDB.addLightweightComponent(materialData);
        
        // UI 새로고침
        showLightweightMaterials();
        
        // 성공 메시지
        showToast(`경량부품이 추가되었습니다: ${newMaterial.name} (${newMaterial.id})`, 'success');
        
        // 서브 모달 닫기
        if (modal) {
            closeSubModal(modal);
        }

    } catch (error) {
        console.error('❌ 경량부품 추가 실패:', error);
        showToast(`추가 실패: ${error.message}`, 'error');
    }
}

// 경량부품 업데이트 (편집)
function updateLightweightMaterial(materialId, modal = null) {
    try {
        const updateData = {
            name: document.getElementById('editMaterialName')?.value.trim() || '',
            category: document.getElementById('editMaterialCategory')?.value || '',
            size: document.getElementById('editMaterialSize')?.value.trim() || '',
            unit: document.getElementById('editMaterialUnit')?.value || 'M',
            price: parseInt(document.getElementById('editMaterialPrice')?.value) || 0,
            laborCost: parseInt(document.getElementById('editMaterialLaborCost')?.value) || 0,
            laborProductivity: parseFloat(document.getElementById('editMaterialLaborProductivity')?.value) || 0,
            laborCompensation: parseInt(document.getElementById('editMaterialLaborCompensation')?.value) || 100,
            location: document.getElementById('editMaterialLocation')?.value.trim() || '',
            work: document.getElementById('editMaterialWork')?.value.trim() || '',
            note: document.getElementById('editMaterialNote')?.value.trim() || ''
        };

        // 규격 자동 추출 (스터드/런너에서 ○형 패턴 추출)
        const categoryName = updateData.category || '';
        if (categoryName.includes('STUD') || categoryName.includes('RUNNER')) {
            const match = updateData.name.match(/(\d+형)/);
            updateData.spec = match ? match[1] : '-';
        } else if (updateData.category === 'FASTENERS') {
            // 체결부품의 경우 용도 정보를 규격으로 사용
            const material = window.priceDB.findLightweightComponentById(materialId);
            if (material && material.note) {
                updateData.spec = material.note;
            }
        } else {
            updateData.spec = updateData.size || '-';
        }

        // 유효성 검사
        if (!updateData.name) {
            throw new Error('자재명을 입력해주세요.');
        }
        if (!updateData.category) {
            throw new Error('카테고리를 선택해주세요.');
        }
        if (!updateData.price || updateData.price <= 0) {
            throw new Error('올바른 자재비를 입력해주세요.');
        }
        if (updateData.laborCompensation < 0 || updateData.laborCompensation > 500) {
            throw new Error('노무비 보할은 0-500% 범위내에서 입력해주세요.');
        }

        // 데이터베이스 업데이트
        const success = window.priceDB.updateLightweightComponent(materialId, updateData);
        
        if (success) {
            // UI 새로고침
            showLightweightMaterials();
            
            // 성공 메시지
            showToast(`경량부품이 수정되었습니다: ${updateData.name} (${materialId})`, 'success');
            
            // 서브 모달 닫기
            if (modal) {
                closeSubModal(modal);
            }
        } else {
            throw new Error('자재를 찾을 수 없습니다.');
        }

    } catch (error) {
        console.error('❌ 경량부품 수정 실패:', error);
        showToast(`수정 실패: ${error.message}`, 'error');
    }
}

// 경량부품 삭제 실행
function performLightweightDeletion(materialId) {
    try {
        const success = window.priceDB.deleteLightweightComponent(materialId);
        
        if (success) {
            // UI 새로고침
            showLightweightMaterials();
            
            // 성공 메시지
            showToast(`경량부품이 삭제되었습니다 (${materialId})`, 'success');
        } else {
            throw new Error('자재를 찾을 수 없습니다.');
        }

    } catch (error) {
        console.error('❌ 경량부품 삭제 실패:', error);
        showToast(`삭제 실패: ${error.message}`, 'error');
    }
}

// =============================================================================
// 석고보드 관리 함수들
// =============================================================================

// 석고보드 추가
function addGypsumBoard() {
    const content = `
        <div style="min-width: 600px;">
            <h4><i class="fas fa-plus"></i> 석고보드 추가</h4>
            <div style="margin: 20px 0;">
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                    <div style="grid-column: 1 / -1;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">품명 *</label>
                        <input type="text" id="addGypsumName" placeholder="예: 일반석고보드" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">폭(W) *</label>
                        <input type="number" id="addGypsumW" value="900" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">높이(H) *</label>
                        <input type="number" id="addGypsumH" value="1800" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">두께(T) *</label>
                        <input type="number" id="addGypsumT" value="9.5" step="0.1" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">카테고리 *</label>
                        <select id="addGypsumCategory" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="">카테고리 선택</option>
                            <option value="STANDARD">일반석고보드</option>
                            <option value="MOISTURE">방수석고보드</option>
                            <option value="FIRE">방화석고보드</option>
                            <option value="FIRE_MOISTURE">방화방수석고보드</option>
                            <option value="SOUND">차음석고보드</option>
                            <option value="ANTIBACTERIAL">방균석고보드</option>
                            <option value="INSULATION">그라스울</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">단위 *</label>
                        <select id="addGypsumUnit" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="매">매</option>
                            <option value="M2">M2</option>
                            <option value="EA">EA</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">수량</label>
                        <input type="number" id="addGypsumQty" value="1.00" step="0.01" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">당초 단가 (원) *</label>
                        <input type="number" id="addGypsumPriceOriginal" placeholder="예: 3350" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">변경 단가 (원) *</label>
                        <input type="number" id="addGypsumPriceChanged" placeholder="예: 3650" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">M2 단가 (원)</label>
                        <input type="number" id="addGypsumPriceM2" placeholder="예: 2253" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div style="grid-column: 1 / -1;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">비고</label>
                        <input type="text" id="addGypsumNote" placeholder="예: 1매 - (1.62m2)" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                </div>
            </div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 4px; margin-top: 15px;">
                <p style="margin: 0; font-size: 14px; color: #6b7280;">
                    <strong>*</strong> 필수 입력 항목입니다.
                </p>
            </div>
        </div>
    `;

    createSubModal('석고보드 추가', content, [
        { text: '취소', class: 'btn-secondary', onClick: (modal) => closeSubModal(modal) },
        { text: '추가', class: 'btn-primary', onClick: (modal) => {
            saveGypsumBoard(modal);
        }}
    ]);
}

// 석고보드 편집
function editGypsumBoard(materialId) {
    const material = window.priceDB.findGypsumBoardById(materialId);
    if (!material) {
        showToast('석고보드를 찾을 수 없습니다.', 'error');
        return;
    }

    const content = `
        <div style="min-width: 600px;">
            <h4><i class="fas fa-edit"></i> 석고보드 편집: ${material.name}</h4>
            <div style="margin: 20px 0;">
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                    <div style="grid-column: 1 / -1;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">품명 *</label>
                        <input type="text" id="editGypsumName" value="${material.name}" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">폭(W) *</label>
                        <input type="number" id="editGypsumW" value="${material.w}" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">높이(H) *</label>
                        <input type="number" id="editGypsumH" value="${material.h}" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">두께(T) *</label>
                        <input type="number" id="editGypsumT" value="${material.t}" step="0.1" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">카테고리 *</label>
                        <select id="editGypsumCategory" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="STANDARD" ${material.category === 'STANDARD' ? 'selected' : ''}>일반석고보드</option>
                            <option value="MOISTURE" ${material.category === 'MOISTURE' ? 'selected' : ''}>방수석고보드</option>
                            <option value="FIRE" ${material.category === 'FIRE' ? 'selected' : ''}>방화석고보드</option>
                            <option value="FIRE_MOISTURE" ${material.category === 'FIRE_MOISTURE' ? 'selected' : ''}>방화방수석고보드</option>
                            <option value="SOUND" ${material.category === 'SOUND' ? 'selected' : ''}>차음석고보드</option>
                            <option value="ANTIBACTERIAL" ${material.category === 'ANTIBACTERIAL' ? 'selected' : ''}>방균석고보드</option>
                            <option value="INSULATION" ${material.category === 'INSULATION' ? 'selected' : ''}>그라스울</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">단위 *</label>
                        <select id="editGypsumUnit" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="매" ${material.unit === '매' ? 'selected' : ''}>매</option>
                            <option value="M2" ${material.unit === 'M2' ? 'selected' : ''}>M2</option>
                            <option value="EA" ${material.unit === 'EA' ? 'selected' : ''}>EA</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">수량</label>
                        <input type="number" id="editGypsumQty" value="${material.qty}" step="0.01" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">당초 단가 (원) *</label>
                        <input type="number" id="editGypsumPriceOriginal" value="${material.priceOriginal}" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">변경 단가 (원) *</label>
                        <input type="number" id="editGypsumPriceChanged" value="${material.priceChanged}" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">M2 단가 (원)</label>
                        <input type="number" id="editGypsumPriceM2" value="${material.priceM2 || ''}" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div style="grid-column: 1 / -1;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">비고</label>
                        <input type="text" id="editGypsumNote" value="${material.note || ''}" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                </div>
            </div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 4px; margin-top: 15px;">
                <p style="margin: 0; font-size: 14px; color: #6b7280;">
                    <strong>ID:</strong> ${material.id} | <strong>*</strong> 필수 입력 항목입니다.
                </p>
            </div>
        </div>
    `;

    createSubModal('석고보드 편집', content, [
        { text: '취소', class: 'btn-secondary', onClick: (modal) => closeSubModal(modal) },
        { text: '저장', class: 'btn-primary', onClick: (modal) => {
            updateGypsumBoard(materialId, modal);
        }}
    ]);
}

// 석고보드 삭제
function deleteGypsumBoard(materialId) {
    const material = window.priceDB.findGypsumBoardById(materialId);
    if (!material) {
        showToast('석고보드를 찾을 수 없습니다.', 'error');
        return;
    }

    const content = `
        <div style="text-align: center; padding: 20px;">
            <div style="font-size: 48px; color: #dc2626; margin-bottom: 16px;">
                ⚠️
            </div>
            <h3 style="margin-bottom: 16px; color: #1f2937;">석고보드 삭제 확인</h3>
            <p style="margin-bottom: 8px; color: #4b5563;">다음 석고보드를 삭제하시겠습니까?</p>
            <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; margin: 16px 0;">
                <strong style="color: #1f2937;">${material.name}</strong>
                <br>
                <span style="color: #6b7280; font-size: 14px;">ID: ${material.id} | 규격: ${material.w}x${material.h}x${material.t} | 변경단가: ₩${material.priceChanged.toLocaleString()}</span>
            </div>
            <p style="color: #dc2626; font-size: 14px; margin-top: 16px;">
                <strong>주의:</strong> 삭제된 데이터는 복구할 수 없습니다.
            </p>
        </div>
    `;

    createSubModal('석고보드 삭제', content, [
        { 
            text: '취소', 
            class: 'btn-secondary', 
            onClick: (modal) => closeSubModal(modal)
        },
        { 
            text: '삭제', 
            class: 'btn-danger', 
            onClick: (modal) => {
                performGypsumDeletion(materialId);
                closeSubModal(modal);
            }
        }
    ]);
}

// 석고보드 저장 (추가)
function saveGypsumBoard(modal = null) {
    try {
        const materialData = {
            name: document.getElementById('addGypsumName')?.value.trim() || '',
            w: parseInt(document.getElementById('addGypsumW')?.value) || 900,
            h: parseInt(document.getElementById('addGypsumH')?.value) || 1800,
            t: parseFloat(document.getElementById('addGypsumT')?.value) || 9.5,
            category: document.getElementById('addGypsumCategory')?.value || '',
            unit: document.getElementById('addGypsumUnit')?.value || '매',
            qty: parseFloat(document.getElementById('addGypsumQty')?.value) || 1.00,
            priceOriginal: parseInt(document.getElementById('addGypsumPriceOriginal')?.value) || 0,
            priceChanged: parseInt(document.getElementById('addGypsumPriceChanged')?.value) || 0,
            unitPriceM2: parseInt(document.getElementById('addGypsumPriceM2')?.value) || null,
            note: document.getElementById('addGypsumNote')?.value.trim() || ''
        };

        // 유효성 검사
        if (!materialData.name) {
            throw new Error('품명을 입력해주세요.');
        }
        if (!materialData.category) {
            throw new Error('카테고리를 선택해주세요.');
        }
        if (!materialData.priceOriginal || materialData.priceOriginal <= 0) {
            throw new Error('올바른 당초 단가를 입력해주세요.');
        }
        if (!materialData.priceChanged || materialData.priceChanged <= 0) {
            throw new Error('올바른 변경 단가를 입력해주세요.');
        }

        // 데이터베이스에 추가
        const newMaterial = window.priceDB.addGypsumBoard(materialData);
        
        // UI 새로고침
        showGypsumBoards();
        
        // 성공 메시지
        showToast(`석고보드가 추가되었습니다: ${newMaterial.name} (${newMaterial.id})`, 'success');
        
        // 서브 모달 닫기
        if (modal) {
            closeSubModal(modal);
        }

    } catch (error) {
        console.error('석고보드 추가 실패:', error);
        showToast('추가 실패: ' + error.message, 'error');
    }
}

// 석고보드 업데이트 (편집)
function updateGypsumBoard(materialId, modal = null) {
    try {
        const materialData = {
            name: document.getElementById('editGypsumName')?.value.trim() || '',
            w: parseInt(document.getElementById('editGypsumW')?.value) || 900,
            h: parseInt(document.getElementById('editGypsumH')?.value) || 1800,
            t: parseFloat(document.getElementById('editGypsumT')?.value) || 9.5,
            category: document.getElementById('editGypsumCategory')?.value || '',
            unit: document.getElementById('editGypsumUnit')?.value || '매',
            qty: parseFloat(document.getElementById('editGypsumQty')?.value) || 1.00,
            priceOriginal: parseInt(document.getElementById('editGypsumPriceOriginal')?.value) || 0,
            priceChanged: parseInt(document.getElementById('editGypsumPriceChanged')?.value) || 0,
            unitPriceM2: parseInt(document.getElementById('editGypsumPriceM2')?.value) || null,
            note: document.getElementById('editGypsumNote')?.value.trim() || ''
        };

        // 유효성 검사
        if (!materialData.name) {
            throw new Error('품명을 입력해주세요.');
        }
        if (!materialData.category) {
            throw new Error('카테고리를 선택해주세요.');
        }
        if (!materialData.priceOriginal || materialData.priceOriginal <= 0) {
            throw new Error('올바른 당초 단가를 입력해주세요.');
        }
        if (!materialData.priceChanged || materialData.priceChanged <= 0) {
            throw new Error('올바른 변경 단가를 입력해주세요.');
        }

        // 데이터베이스 업데이트
        const success = window.priceDB.updateGypsumBoard(materialId, materialData);
        
        if (success) {
            // UI 새로고침
            showGypsumBoards();
            
            // 성공 메시지
            showToast(`석고보드가 수정되었습니다: ${materialData.name} (${materialId})`, 'success');
        } else {
            throw new Error('석고보드를 찾을 수 없습니다.');
        }
        
        // 서브 모달 닫기
        if (modal) {
            closeSubModal(modal);
        }

    } catch (error) {
        console.error('석고보드 편집 실패:', error);
        showToast('편집 실패: ' + error.message, 'error');
    }
}

// 석고보드 삭제 실행
function performGypsumDeletion(materialId) {
    try {
        const success = window.priceDB.deleteGypsumBoard(materialId);
        
        if (success) {
            // UI 새로고침
            showGypsumBoards();
            
            // 성공 메시지
            showToast(`석고보드가 삭제되었습니다: ${materialId}`, 'success');
        } else {
            throw new Error('석고보드를 찾을 수 없습니다.');
        }

    } catch (error) {
        console.error('석고보드 삭제 실패:', error);
        showToast('삭제 실패: ' + error.message, 'error');
    }
}

// 자재 관리 함수들
window.showMaterialManagementModal = showMaterialManagementModal;
window.loadStandardMaterials = loadStandardMaterials;
window.loadMaterialList = loadMaterialList;
window.editMaterial = editMaterial;
window.showLightweightMaterials = showLightweightMaterials;
window.showGypsumBoards = showGypsumBoards;
window.deleteMaterial = deleteMaterial;
window.exportMaterials = exportMaterials;
window.importMaterials = importMaterials;

// 경량부품 관리 함수들
window.addLightweightMaterial = addLightweightMaterial;
window.editLightweightMaterial = editLightweightMaterial;
window.deleteLightweightMaterial = deleteLightweightMaterial;

// 석고보드 관리 함수들
window.addGypsumBoard = addGypsumBoard;
window.editGypsumBoard = editGypsumBoard;
window.deleteGypsumBoard = deleteGypsumBoard;

// 자재 필터 함수들
window.filterLightweightMaterials = filterLightweightMaterials;
window.clearLightweightFilters = clearLightweightFilters;
window.filterGypsumBoards = filterGypsumBoards;
window.clearGypsumFilters = clearGypsumFilters;

// 통합 자재 추가 함수
function addCurrentMaterial() {
    const lightweightTab = document.getElementById('lightweightTab');
    const isLightweight = lightweightTab && lightweightTab.classList.contains('active');
    
    if (isLightweight) {
        addLightweightMaterial();
    } else {
        addGypsumBoard();
    }
}

// 통합 자재 추가 함수 전역 등록
window.addCurrentMaterial = addCurrentMaterial;

// 데이터 관리 함수들
window.toggleDataManagementDropdown = toggleDataManagementDropdown;
window.saveCurrentState = saveCurrentState;
window.exportAllData = exportAllData;
window.importAllData = importAllData;
window.performExportAllData = performExportAllData;
window.performImportAllData = performImportAllData;
window.showModificationsSummary = showModificationsSummary;
window.resetToOriginal = resetToOriginal;
window.createSubModal = createSubModal;
window.closeSubModal = closeSubModal;

// 노무비 보할 업데이트 함수
function updateLaborCompensation(materialId, value) {
    try {
        const compensation = parseFloat(value) || 100;
        
        if (!window.priceDB) {
            showToast('데이터베이스를 찾을 수 없습니다.', 'error');
            return;
        }
        
        // 메모리 캐시에서 자재 찾기
        const lightweightData = window.priceDB.getLightweightComponents();
        const materialIndex = lightweightData.items.findIndex(item => item.id === materialId);
        
        if (materialIndex === -1) {
            showToast('자재를 찾을 수 없습니다.', 'error');
            return;
        }
        
        // 노무비 보할 업데이트
        lightweightData.items[materialIndex].laborCompensation = compensation;
        
        // 성공 메시지 (선택적)
        console.log(`노무비 보할 업데이트: ${materialId} = ${compensation}%`);
        
    } catch (error) {
        console.error('노무비 보할 업데이트 실패:', error);
        showToast('노무비 보할 업데이트 실패', 'error');
    }
}

window.updateLaborCompensation = updateLaborCompensation;

// Revit 연동 함수들
window.showRevitIntegrationModal = showRevitIntegrationModal;
window.selectSingleWallFromRevit = () => Kiyeno.RevitService.selectSingleWallFromRevit();
window.selectMultipleWallsFromRevit = () => Kiyeno.RevitService.selectMultipleWallsFromRevit();
window.toggleRevitSelection = (elementId) => Kiyeno.RevitService.toggleRevitSelection(elementId);
window.toggleAllRevitSelection = () => Kiyeno.RevitService.toggleAllRevitSelection();
window.addSelectedRevitWalls = () => Kiyeno.RevitService.addSelectedRevitWalls();
window.clearRevitData = () => Kiyeno.RevitService.clearRevitData();
window.createWallTypesInRevit = createWallTypesInRevit;
window.toggleRevitDataSection = toggleRevitDataSection;

// 누락된 Revit 관련 함수들 추가
function createWallTypesInRevit() {
    try {
        const selectedWalls = Kiyeno.Data.getSelectedWalls();
        if (selectedWalls.length === 0) {
            showToast('WallType을 생성할 벽체를 선택해주세요.', 'warning');
            return;
        }
        
        // WebSocket을 통한 Revit 통신
        if (window.socketService && window.socketService.isConnected()) {
            window.socketService.sendRevitCommand('CREATE_WALL_TYPES', {
                wallData: selectedWalls,
                isSimple: false
            });
        } else {
            console.log('WallType 생성 시뮬레이션:', selectedWalls);
            showToast(`${selectedWalls.length}개 벽체의 WallType 생성을 요청했습니다.`, 'info');
        }
    } catch (error) {
        console.error('WallType 생성 요청 실패:', error);
        showToast('WallType 생성 요청 중 오류가 발생했습니다.', 'error');
    }
}

function toggleRevitDataSection() {
    const revitSection = document.getElementById('revitDataSection');
    const toggleBtn = document.getElementById('revitToggleBtn');
    
    if (revitSection) {
        const isVisible = revitSection.style.display !== 'none';
        revitSection.style.display = isVisible ? 'none' : 'block';
        
        if (toggleBtn) {
            const icon = toggleBtn.querySelector('i');
            const text = toggleBtn.lastChild;
            if (isVisible) {
                icon.className = 'fas fa-table';
                text.textContent = ' Revit 데이터 열기';
            } else {
                icon.className = 'fas fa-eye-slash';
                text.textContent = ' Revit 데이터 닫기';
            }
        }
        
        showToast(`Revit 데이터 섹션을 ${isVisible ? '숨김' : '표시'}했습니다.`, 'info');
    } else {
        showToast('Revit 데이터 섹션을 찾을 수 없습니다.', 'warning');
    }
}

// WebSocket 메시지 핸들러는 socketService.js와 revitService.js에서 처리됩니다.

// =============================================================================
// 자재 필터 함수들
// =============================================================================

// 경량부품 필터링 함수
function filterLightweightMaterials() {
    if (!window.priceDB) return;
    
    const filters = {
        id: document.getElementById('filterLightweightId')?.value.toLowerCase() || '',
        name: document.getElementById('filterLightweightName')?.value.toLowerCase() || '',
        category: document.getElementById('filterLightweightCategory')?.value.toLowerCase() || '',
        unit: document.getElementById('filterLightweightUnit')?.value.toLowerCase() || '',
        spec: document.getElementById('filterLightweightSpec')?.value.toLowerCase() || '',
        size: document.getElementById('filterLightweightSize')?.value.toLowerCase() || ''
    };
    
    const lightweightData = window.priceDB.getLightweightComponents();
    const filtered = lightweightData.items.filter(item => {
        const categoryName = lightweightData.categories[item.category]?.name || item.category;
        
        return (
            (filters.id === '' || item.id.toLowerCase().includes(filters.id)) &&
            (filters.name === '' || item.name.toLowerCase().includes(filters.name)) &&
            (filters.category === '' || categoryName.toLowerCase().includes(filters.category)) &&
            (filters.unit === '' || item.unit.toLowerCase().includes(filters.unit)) &&
            (filters.spec === '' || item.spec.toLowerCase().includes(filters.spec)) &&
            (filters.size === '' || item.spec.toLowerCase().includes(filters.size))
        );
    });
    
    // 테이블 바디 업데이트 (14개 컬럼)
    const tableBody = document.getElementById('materialTableBody');
    if (tableBody) {
        tableBody.innerHTML = filtered.map(item => {
            // 품목명 변경 로직 및 자재명 정리
            let categoryDisplayName = '';
            let newSpecification = '-';
            let cleanedName = item.name;
            const categoryName = lightweightData.categories[item.category]?.name || item.category;
            
            if (categoryName.includes('STUD')) {
                categoryDisplayName = '스터드';
                // 스터드 규격 추출 (예: "메탈 스터드 50형" → "50형")
                const match = item.name.match(/(\d+형)/);
                if (match) {
                    newSpecification = match[1];
                    // 자재명에서 규격 부분 제거 (예: "메탈 스터드 50형" → "메탈 스터드")
                    cleanedName = item.name.replace(/\s*\d+형/g, '');
                }
            } else if (categoryName.includes('RUNNER')) {
                categoryDisplayName = '런너';
                // 런너 규격 추출 (예: "메탈 런너 50형" → "50형")
                const match = item.name.match(/(\d+형)/);
                if (match) {
                    newSpecification = match[1];
                    // 자재명에서 규격 부분 제거 (예: "메탈 런너 50형" → "메탈 런너")
                    cleanedName = item.name.replace(/\s*\d+형/g, '');
                }
            } else if (item.name.includes('메거진피스')) {
                categoryDisplayName = '피스';
                // 피스 규격에 용도 포함 (note에서 추출)
                if (item.note) {
                    newSpecification = item.note;
                }
                // 피스는 원본 자재명 그대로 사용 (note 제외)
                cleanedName = item.name;
            } else if (item.name.includes('타정총알')) {
                categoryDisplayName = '타정총알';
                // 타정총알 규격에 용도 포함 (note에서 추출)
                if (item.note) {
                    newSpecification = item.note;
                }
                // 타정총알은 원본 자재명 그대로 사용 (note 제외)
                cleanedName = item.name;
            } else if (item.name.includes('용접봉')) {
                categoryDisplayName = '용접봉';
                // 용접봉 규격에 용도 포함 (note에서 추출)
                if (item.note) {
                    newSpecification = item.note;
                }
            } else {
                categoryDisplayName = categoryName;
            }
            
            return `
            <tr>
                <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">${item.id}</td>
                <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">${categoryDisplayName}</td>
                <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">${
                    (item.name.includes('메거진피스') || item.name.includes('타정총알') || item.name.includes('용접봉')) 
                        ? item.name 
                        : item.name + (item.note ? ' ' + item.note : '')
                }</td>
                <td style="padding: 4px; border: 1px solid #ddd; text-align: center;" title="추출된 규격">${newSpecification}</td>
                <td style="padding: 4px; border: 1px solid #ddd; text-align: center;" title="${item.spec}">${item.spec}</td>
                <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">${item.unit}</td>
                <td style="padding: 4px; border: 1px solid #ddd; text-align: right;">₩${item.price.toLocaleString()}</td>
                <td style="padding: 4px; border: 1px solid #ddd; text-align: right;">₩${Math.round(item.price * 0.8).toLocaleString()}</td>
                <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">기준</td>
                <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">
                    <input type="number" 
                           value="${item.laborCompensation || 100}" 
                           min="0" max="500" step="1"
                           style="width: 50px; text-align: center; border: 1px solid #ccc; padding: 2px;"
                           onchange="updateLaborCompensation('${item.id}', this.value)"
                           title="노무비 보할 (%)" />%
                </td>
                <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">경량</td>
                <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">경량</td>
                <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">벽체</td>
                <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">
                    <button onclick="editLightweightMaterial('${item.id}')" class="btn btn-sm" style="padding: 2px 4px; margin-right: 2px; background: #3b82f6; color: white; font-size: 10px;" title="자재 편집">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteLightweightMaterial('${item.id}')" class="btn btn-sm" style="padding: 2px 4px; background: #dc2626; color: white; font-size: 10px;" title="자재 삭제">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
            `;
        }).join('');
    }
    
    // 통계 업데이트
    const materialStats = document.getElementById('materialStats');
    if (materialStats) {
        materialStats.textContent = `경량부품: ${filtered.length}개 (${lightweightData.items.length}개 중)`;
    }
}

// 경량부품 필터 초기화
function clearLightweightFilters() {
    document.getElementById('filterLightweightId').value = '';
    document.getElementById('filterLightweightName').value = '';
    document.getElementById('filterLightweightCategory').value = '';
    document.getElementById('filterLightweightUnit').value = '';
    document.getElementById('filterLightweightSpec').value = '';
    document.getElementById('filterLightweightSize').value = '';
    
    // 전체 목록 다시 표시
    showLightweightMaterials();
}

// 석고보드 필터링 함수
function filterGypsumBoards() {
    if (!window.priceDB) return;
    
    const filters = {
        id: document.getElementById('filterGypsumId')?.value.toLowerCase() || '',
        name: document.getElementById('filterGypsumName')?.value.toLowerCase() || '',
        w: document.getElementById('filterGypsumW')?.value || '',
        h: document.getElementById('filterGypsumH')?.value || '',
        t: document.getElementById('filterGypsumT')?.value || ''
    };
    
    const gypsumData = window.priceDB.getGypsumBoards();
    const filtered = gypsumData.items.filter(item => {
        return (
            (filters.id === '' || item.id.toLowerCase().includes(filters.id)) &&
            (filters.name === '' || item.name.toLowerCase().includes(filters.name)) &&
            (filters.w === '' || item.w.toString().includes(filters.w)) &&
            (filters.h === '' || item.h.toString().includes(filters.h)) &&
            (filters.t === '' || item.t.toString().includes(filters.t))
        );
    });
    
    // 테이블 바디 업데이트
    const tableBody = document.getElementById('materialTableBody');
    if (tableBody) {
        tableBody.innerHTML = filtered.map(item => {
            // M2 단가 계산: 변경단가 또는 당초단가를 면적으로 나눔
            const unitPrice = item.priceChanged || item.priceOriginal;
            const areaM2 = (item.w / 1000) * (item.h / 1000);
            const pricePerM2 = areaM2 > 0 ? Math.round(unitPrice / areaM2) : 0;
            
            return `
            <tr>
                <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">${item.id}</td>
                <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">${item.name}</td>
                <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">${item.w}</td>
                <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">${item.h}</td>
                <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">${item.t}</td>
                <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">${item.unit}</td>
                <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">${(item.qty || 0).toFixed(2)}</td>
                <td style="padding: 4px; border: 1px solid #ddd; text-align: right;">₩${(item.priceOriginal || 0).toLocaleString()}</td>
                <td style="padding: 4px; border: 1px solid #ddd; text-align: right; ${item.priceChanged !== item.priceOriginal ? 'background: #fef3c7; font-weight: bold;' : ''}">₩${(item.priceChanged || 0).toLocaleString()}</td>
                <td style="padding: 4px; border: 1px solid #ddd; text-align: right;">₩${(pricePerM2 || 0).toLocaleString()}</td>
                <td style="padding: 4px; border: 1px solid #ddd; font-size: 10px; text-align: center;">${item.note || '-'}</td>
                <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">
                    <button onclick="addGypsumBoard()" class="btn btn-sm" style="padding: 2px 6px; margin-right: 2px; background: #059669; color: white;" title="석고보드 추가">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button onclick="editGypsumBoard('${item.id}')" class="btn btn-sm" style="padding: 2px 6px; margin-right: 2px;" title="석고보드 편집">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteGypsumBoard('${item.id}')" class="btn btn-sm" style="padding: 2px 6px; background: #dc2626; color: white;" title="석고보드 삭제">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
            `;
        }).join('');
    }
    
    // 통계 업데이트
    const materialStats = document.getElementById('materialStats');
    if (materialStats) {
        materialStats.textContent = `석고보드: ${filtered.length}개 (${gypsumData.items.length}개 중)`;
    }
}

// 석고보드 필터 초기화
function clearGypsumFilters() {
    document.getElementById('filterGypsumId').value = '';
    document.getElementById('filterGypsumName').value = '';
    document.getElementById('filterGypsumW').value = '';
    document.getElementById('filterGypsumH').value = '';
    document.getElementById('filterGypsumT').value = '';
    
    // 전체 목록 다시 표시
    showGypsumBoards();
}

console.log('🚀 서비스 모듈 로드 완료');