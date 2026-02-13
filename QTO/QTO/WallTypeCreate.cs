using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using Autodesk.Revit.DB;
using Autodesk.Revit.UI;

namespace QTO
{
    /// <summary>
    /// WallType 생성을 담당하는 클래스
    /// </summary>
    public class WallTypeCreate
    {
        private Document doc;

        public WallTypeCreate(Document document)
        {
            doc = document;
        }

        /// <summary>
        /// 웹에서 받은 데이터로 벽체 타입 생성 (메인 public 메서드)
        /// </summary>
        public WallTypeCreationResult CreateWallType(WallTypeCreationData data)
        {
            var result = new WallTypeCreationResult
            {
                WallTypeName = data.WallTypeName,
                Success = false,
                Message = ""
            };

            try
            {
                // 1. 벽체 타입 이름 검증
                if (string.IsNullOrWhiteSpace(data.WallTypeName))
                {
                    result.Message = "벽체 타입 이름이 비어있습니다.";
                    return result;
                }

                // 2. 중복 확인
                if (IsWallTypeExists(data.WallTypeName))
                {
                    result.Message = $"'{data.WallTypeName}' 이름의 벽체 타입이 이미 존재합니다.";
                    return result;
                }

                // 3. 레이어 데이터가 있는지 확인
                if (data.Layers == null || data.Layers.Count == 0)
                {
                    result.Message = "레이어 데이터가 없습니다.";
                    return result;
                }

                // 4. 기본 WallType 찾기
                WallType baseWallType = FindSimpleBaseWallType();
                if (baseWallType == null)
                {
                    result.Message = "기본 WallType을 찾을 수 없습니다.";
                    return result;
                }

                // 5. 새 WallType 복제
                WallType newWallType = baseWallType.Duplicate(data.WallTypeName) as WallType;
                if (newWallType == null)
                {
                    result.Message = "WallType 복제에 실패했습니다.";
                    return result;
                }

                // 6. 웹 레이어 데이터로 복합 구조 생성
                var layers = CreateLayersFromWebData(data.Layers);

                if (layers.Count == 0)
                {
                    result.Message = "유효한 레이어를 생성할 수 없습니다.";
                    return result;
                }

                // 7. 복합 구조 적용
                ModifyToComplexStructure(newWallType, layers);

                // 8. 추가 속성 설정
                SetWallTypeProperties(newWallType, data);

                // 9. 성공
                result.Success = true;
                result.Message = $"'{data.WallTypeName}' 벽체 타입이 성공적으로 생성되었습니다. (레이어 {layers.Count}개, 두께 {data.TotalThickness}mm)";

                return result;
            }
            catch (Exception ex)
            {
                result.Success = false;
                result.Message = $"생성 중 오류 발생: {ex.Message}";
                return result;
            }
        }

        /// <summary>
        /// 웹에서 받은 레이어 데이터를 Revit CompoundStructureLayer 리스트로 변환
        /// </summary>
        private List<CompoundStructureLayer> CreateLayersFromWebData(List<LayerInfo> webLayers)
        {
            var layers = new List<CompoundStructureLayer>();

            try
            {
                foreach (var webLayer in webLayers)
                {
                    // 두께가 0 이하인 레이어는 무시
                    if (webLayer.Thickness <= 0)
                        continue;

                    // 재료 생성 또는 찾기
                    string materialName = string.IsNullOrWhiteSpace(webLayer.MaterialName)
                        ? "기본 재료"
                        : webLayer.MaterialName;

                    Material material = GetOrCreateMaterial(materialName);

                    // Function 할당 (위치 기반)
                    MaterialFunctionAssignment function = GetMaterialFunction(webLayer.Position);

                    // mm를 Revit 내부 단위(feet)로 변환
                    double thicknessInFeet = UnitUtils.ConvertToInternalUnits(
                        webLayer.Thickness,
                        UnitTypeId.Millimeters
                    );

                    // CompoundStructureLayer 생성
                    var layer = new CompoundStructureLayer(thicknessInFeet, function, material.Id);
                    layers.Add(layer);
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"웹 레이어 데이터 변환 실패: {ex.Message}");
            }

            return layers;
        }

        /// <summary>
        /// 레이어 위치에 따라 MaterialFunction 결정
        /// </summary>
        private MaterialFunctionAssignment GetMaterialFunction(string position)
        {
            if (string.IsNullOrWhiteSpace(position))
                return MaterialFunctionAssignment.Structure;

            position = position.ToLower();

            // 구조체
            if (position.Contains("구조"))
                return MaterialFunctionAssignment.Structure;

            // 마감재
            if (position.Contains("layer3") || position.Contains("레이어3"))
                return MaterialFunctionAssignment.Finish1;

            if (position.Contains("layer2") || position.Contains("레이어2"))
                return MaterialFunctionAssignment.Finish2;

            if (position.Contains("layer1") || position.Contains("레이어1"))
                return MaterialFunctionAssignment.Substrate;

            // 기본값: 구조체
            return MaterialFunctionAssignment.Structure;
        }

        private WallType FindSimpleBaseWallType()
        {
            try
            {
                FilteredElementCollector collector = new FilteredElementCollector(doc);
                var wallTypes = collector.OfClass(typeof(WallType))
                    .Cast<WallType>()
                    .Where(wt => wt.Kind == WallKind.Basic)
                    .ToList();

                // 1. "Generic" 이름을 포함한 WallType 우선 찾기
                var genericWallType = wallTypes.FirstOrDefault(wt =>
                    wt.Name.ToLower().Contains("generic") ||
                    wt.Name.ToLower().Contains("일반") ||
                    wt.Name.ToLower().Contains("기본"));

                if (genericWallType != null)
                {
                    return genericWallType;
                }

                // 2. 단일 레이어를 가진 WallType 찾기
                foreach (var wallType in wallTypes)
                {
                    try
                    {
                        CompoundStructure structure = wallType.GetCompoundStructure();
                        if (structure != null && structure.GetLayers().Count == 1)
                        {
                            return wallType;
                        }
                    }
                    catch
                    {
                        // 복합 구조에 접근할 수 없는 경우 건너뛰기
                        continue;
                    }
                }

                // 3. 첫 번째 Basic WallType 반환
                return wallTypes.FirstOrDefault();
            }
            catch (Exception ex)
            {
                throw new Exception($"기본 WallType 찾기 실패: {ex.Message}");
            }
        }

        /// <summary>
        /// 단일 레이어 구조로 수정
        /// </summary>
        private void ModifyToSimpleStructure(WallType wallType, WallTypeCreationData data)
        {
            try
            {
                // 기본 재료 생성
                Material defaultMaterial = GetOrCreateMaterial("기본 벽체");

                // 단일 레이어 생성 (Revit 2021 - UnitTypeId 사용)
                double wallThickness = UnitUtils.ConvertToInternalUnits(data.Thickness, UnitTypeId.Millimeters);
                CompoundStructureLayer layer = new CompoundStructureLayer(
                    wallThickness,
                    MaterialFunctionAssignment.Structure,
                    defaultMaterial.Id);

                List<CompoundStructureLayer> layers = new List<CompoundStructureLayer> { layer };
                CompoundStructure compoundStructure = CompoundStructure.CreateSimpleCompoundStructure(layers);

                wallType.SetCompoundStructure(compoundStructure);
            }
            catch (Exception ex)
            {
                throw new Exception($"단일 구조 수정 실패: {ex.Message}");
            }
        }

        /// <summary>
        /// 복합 구조로 수정
        /// </summary>
        private void ModifyToComplexStructure(WallType wallType, List<CompoundStructureLayer> layers)
        {
            try
            {
                CompoundStructure compoundStructure = CompoundStructure.CreateSimpleCompoundStructure(layers);

                // 구조 코어 설정
                //SetStructuralCore(compoundStructure, layers.Count);

                wallType.SetCompoundStructure(compoundStructure);
            }
            catch (Exception ex)
            {
                throw new Exception($"복합 구조 수정 실패: {ex.Message}");
            }
        }

        /// <summary>
        /// 모듈게이지 문자열에서 두께 값 추출 (예: "150x35x22GA@406" → 150mm)
        /// </summary>
        private double ExtractThicknessFromColumn(string columnInfo, double defaultThickness)
        {
            if (string.IsNullOrWhiteSpace(columnInfo))
                return defaultThickness;

            try
            {
                // 정규표현식으로 첫 번째 숫자 추출 (150x35x22GA@406에서 150 추출)
                Match match = Regex.Match(columnInfo, @"(\d+)");
                if (match.Success)
                {
                    double extractedThickness = double.Parse(match.Groups[1].Value);
                    return Math.Max(extractedThickness, 50); // 최소 50mm
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"모듈게이지 두께 추출 실패: {ex.Message}");
            }

            return defaultThickness;
        }

        /// <summary>
        /// 복합 구조 레이어 생성
        /// </summary>
        private List<CompoundStructureLayer> CreateCompoundLayers(WallTypeCreationData data, double structuralThickness)
        {
            var layers = new List<CompoundStructureLayer>();
            double remainingThickness = data.Thickness;

            // 레이어 정보 수집 (외부에서 내부로)
            var layerInfos = new List<(string name, double thickness, MaterialFunctionAssignment function)>();

            // 외부 레이어들
            if (!string.IsNullOrWhiteSpace(data.Layer3_1))
                layerInfos.Add((data.Layer3_1, 12.7, MaterialFunctionAssignment.Finish1));
            if (!string.IsNullOrWhiteSpace(data.Layer2_1))
                layerInfos.Add((data.Layer2_1, 9.5, MaterialFunctionAssignment.Finish2));
            if (!string.IsNullOrWhiteSpace(data.Layer1_1))
                layerInfos.Add((data.Layer1_1, 15.9, MaterialFunctionAssignment.Substrate));

            // 중앙 구조재 (모듈게이지 두께 사용)
            double coreThickness = Math.Max(structuralThickness, remainingThickness - layerInfos.Sum(l => l.thickness) * 2);
            if (coreThickness > 0)
            {
                string coreMaterial = !string.IsNullOrWhiteSpace(data.Column1) ?
                    $"스틸 스터드 {data.Column1}" : "구조재";
                layerInfos.Add((coreMaterial, coreThickness, MaterialFunctionAssignment.Structure));
            }

            // 내부 레이어들
            if (!string.IsNullOrWhiteSpace(data.Layer1_2))
                layerInfos.Add((data.Layer1_2, 15.9, MaterialFunctionAssignment.Substrate));
            if (!string.IsNullOrWhiteSpace(data.Layer2_2))
                layerInfos.Add((data.Layer2_2, 9.5, MaterialFunctionAssignment.Finish2));
            if (!string.IsNullOrWhiteSpace(data.Layer3_2))
                layerInfos.Add((data.Layer3_2, 12.7, MaterialFunctionAssignment.Finish1));

            // 레이어들을 CompoundStructureLayer로 변환 (Revit 2021 - UnitTypeId 사용)
            foreach (var layerInfo in layerInfos)
            {
                var material = GetOrCreateMaterial(layerInfo.name);
                double thickness = UnitUtils.ConvertToInternalUnits(layerInfo.thickness, UnitTypeId.Millimeters);

                layers.Add(new CompoundStructureLayer(thickness, layerInfo.function, material.Id));
            }

            return layers;
        }

        /// <summary>
        /// 구조 코어 설정
        /// </summary>
        private void SetStructuralCore(CompoundStructure compoundStructure, int totalLayers)
        {
            if (totalLayers <= 1) return;

            try
            {
                // 중간 레이어를 구조 코어로 설정
                int coreIndex = totalLayers / 2;
                int exteriorShells = Math.Max(0, coreIndex - 1);
                int interiorShells = Math.Max(0, totalLayers - coreIndex - 1);

                compoundStructure.SetNumberOfShellLayers(ShellLayerType.Exterior, exteriorShells);
                compoundStructure.SetNumberOfShellLayers(ShellLayerType.Interior, interiorShells);
            }
            catch (Exception ex)
            {
                // 구조 코어 설정 실패는 무시 (선택사항)
                Console.WriteLine($"구조 코어 설정 실패: {ex.Message}");
            }
        }

        /// <summary>
        /// WallType 추가 속성 설정
        /// </summary>
        private void SetWallTypeProperties(WallType wallType, WallTypeCreationData data)
        {
            try
            {
                // 방화등급 설정
                if (!string.IsNullOrWhiteSpace(data.FireRating))
                {
                    var fireRatingParam = wallType.get_Parameter(BuiltInParameter.FIRE_RATING);
                    if (fireRatingParam != null && !fireRatingParam.IsReadOnly)
                    {
                        fireRatingParam.Set(data.FireRating);
                    }
                }

                // 설명 설정
                string description = $"웹에서 생성됨 - 두께: {data.Thickness}mm";
                if (!string.IsNullOrWhiteSpace(data.FireRating))
                    description += $", 방화등급: {data.FireRating}";
                if (!string.IsNullOrWhiteSpace(data.SoundTest))
                    description += $", 방음: {data.SoundTest}";

                SetWallTypeDescription(wallType, description);
            }
            catch (Exception ex)
            {
                // 속성 설정 실패는 무시
                Console.WriteLine($"WallType 속성 설정 실패: {ex.Message}");
            }
        }

        /// <summary>
        /// WallType 설명 설정
        /// </summary>
        private void SetWallTypeDescription(WallType wallType, string description)
        {
            try
            {
                var descParam = wallType.get_Parameter(BuiltInParameter.ALL_MODEL_DESCRIPTION);
                if (descParam != null && !descParam.IsReadOnly)
                {
                    descParam.Set(description);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"설명 설정 실패: {ex.Message}");
            }
        }

        /// <summary>
        /// WallType 중복 확인
        /// </summary>
        private bool IsWallTypeExists(string wallTypeName)
        {
            try
            {
                FilteredElementCollector collector = new FilteredElementCollector(doc);
                var existingWallTypes = collector.OfClass(typeof(WallType))
                    .Cast<WallType>()
                    .Any(wt => wt.Name.Equals(wallTypeName, StringComparison.OrdinalIgnoreCase));

                return existingWallTypes;
            }
            catch
            {
                return false;
            }
        }

        /// <summary>
        /// 재료 찾기 또는 생성
        /// </summary>
        private Material GetOrCreateMaterial(string materialName)
        {
            try
            {
                // 기존 재료 찾기
                FilteredElementCollector collector = new FilteredElementCollector(doc);
                var existingMaterial = collector.OfClass(typeof(Material))
                    .Cast<Material>()
                    .FirstOrDefault(m => m.Name.Equals(materialName, StringComparison.OrdinalIgnoreCase));

                if (existingMaterial != null)
                {
                    return existingMaterial;
                }

                // 새 재료 생성
                ElementId newMaterialId = Material.Create(doc, materialName);
                Material newMaterial = doc.GetElement(newMaterialId) as Material;

                // 회색(RGB 128, 128, 128) 설정
                Autodesk.Revit.DB.Color grayColor = new Autodesk.Revit.DB.Color(128, 128, 128);
                newMaterial.Color = grayColor;

                return newMaterial;
            }
            catch (Exception ex)
            {
                throw new Exception($"재료 생성/찾기 실패 ({materialName}): {ex.Message}");
            }
        }
    }

    /// <summary>
    /// WallType 생성용 데이터 클래스 (확장)
    /// </summary>
    public class WallTypeCreationData
    {
        public string WallTypeName { get; set; }
        public double Thickness { get; set; } // 두께 (mm 단위) - 구버전 호환
        public double TotalThickness { get; set; } // 총 두께 (mm 단위) - 신버전

        // 레이어 리스트 (신버전 - 웹에서 계산된 레이어 구조)
        public List<LayerInfo> Layers { get; set; }

        // 구버전 호환 필드들 (레거시)
        public string Layer3_1 { get; set; }
        public string Layer2_1 { get; set; }
        public string Layer1_1 { get; set; }
        public string Column1 { get; set; } // 모듈게이지 정보 (예: 150x35x22GA@406)
        public string Layer1_2 { get; set; }
        public string Layer2_2 { get; set; }
        public string Layer3_2 { get; set; }
        public string FireRating { get; set; }
        public string SoundTest { get; set; }

        // 추가 정보들 (사용하지 않지만 웹에서 전송될 수 있음)
        public string Column2 { get; set; }
        public string Channel { get; set; }
        public string Runner { get; set; }
        public string SteelPlate { get; set; }
        public string DuplicateTestType { get; set; }
    }

    /// <summary>
    /// 레이어 정보 클래스 (웹에서 받은 레이어 데이터)
    /// </summary>
    public class LayerInfo
    {
        public string Position { get; set; }          // 레이어 위치 (예: "좌측마감 Layer1")
        public string MaterialId { get; set; }        // 자재 ID
        public string MaterialName { get; set; }      // 자재 이름
        public string Specification { get; set; }     // 규격
        public double Thickness { get; set; }         // 두께 (mm)
        public bool IsUnitPrice { get; set; }         // 일위대가 여부
    }

    /// <summary>
    /// WallType 생성 결과 클래스
    /// </summary>
    public class WallTypeCreationResult
    {
        public string WallTypeName { get; set; }
        public bool Success { get; set; }
        public string Message { get; set; }
        public string RevitWallTypeId { get; set; }
    }
}