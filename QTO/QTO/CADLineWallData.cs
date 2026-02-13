using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Windows.Forms;
using System.Diagnostics;
using System.IO;

//............................

using Autodesk.Revit;
using Autodesk.Revit.DB;
using Autodesk.Revit.UI;
using Autodesk.Revit.ApplicationServices;
using Autodesk.Revit.DB.Structure;

using DataHub;
using Newtonsoft;

using System.Text.RegularExpressions;
using Newtonsoft.Json;
using System.Security.Cryptography;

namespace QTO
{
    public class CADLineWallData
    {
        public const double MM2F = 304.8;
        private string m_Typename = "";
        Document m_doc = null;
        UIDocument m_uidoc = null;

        private Level m_BottomLevel = null;
        private Level m_TopLevel = null;

        private double Base_H = 0;
        private double Top_H = 0;

        double m_bottomoffset = 0;
        double m_Topoffset = 0;

        List<WallCurveData> m_Walldata = new List<WallCurveData>();
        List<ElementId> idx = new List<ElementId>();

        // 커브 길이 계산 (mm 단위)
        private double GetCurveLength(WallCurveData data)
        {
            if (data.m_Rlines != null)
            {
                double dx = data.m_Rlines.m_ep.m_x - data.m_Rlines.m_sp.m_x;
                double dy = data.m_Rlines.m_ep.m_y - data.m_Rlines.m_sp.m_y;
                return Math.Sqrt(dx * dx + dy * dy);
            }
            else if (data.m_Rarcs != null)
            {
                double dx = data.m_Rarcs.m_ep.m_x - data.m_Rarcs.m_sp.m_x;
                double dy = data.m_Rarcs.m_ep.m_y - data.m_Rarcs.m_sp.m_y;
                return Math.Sqrt(dx * dx + dy * dy);
            }
            return 0.0;
        }

        // 중복 커브 제거 및 최소 길이 필터
        private List<WallCurveData> FilterWallData(List<WallCurveData> sortedData)
        {
            const double MIN_LENGTH = 1.0;     // 최소 1mm (Revit 최소 벽 길이)
            const double DUPLICATE_TOL = 1.0;   // 중복 판정 허용 오차 1mm

            var result = new List<WallCurveData>();

            foreach (var data in sortedData)
            {
                // 최소 길이 미달 건너뛰기
                if (GetCurveLength(data) < MIN_LENGTH) continue;

                // 중복 커브 검사
                bool isDuplicate = false;
                foreach (var existing in result)
                {
                    if (IsDuplicateCurve(data, existing, DUPLICATE_TOL))
                    {
                        isDuplicate = true;
                        break;
                    }
                }

                if (!isDuplicate) result.Add(data);
            }

            return result;
        }

        // 두 커브가 동일한지 판정 (시작점/끝점 양방향 비교)
        private bool IsDuplicateCurve(WallCurveData a, WallCurveData b, double tol)
        {
            if (a.m_Rlines != null && b.m_Rlines != null)
            {
                return (PointDistance(a.m_Rlines.m_sp, b.m_Rlines.m_sp) < tol && PointDistance(a.m_Rlines.m_ep, b.m_Rlines.m_ep) < tol) ||
                       (PointDistance(a.m_Rlines.m_sp, b.m_Rlines.m_ep) < tol && PointDistance(a.m_Rlines.m_ep, b.m_Rlines.m_sp) < tol);
            }
            if (a.m_Rarcs != null && b.m_Rarcs != null)
            {
                return PointDistance(a.m_Rarcs.m_sp, b.m_Rarcs.m_sp) < tol &&
                       PointDistance(a.m_Rarcs.m_mid, b.m_Rarcs.m_mid) < tol &&
                       PointDistance(a.m_Rarcs.m_ep, b.m_Rarcs.m_ep) < tol;
            }
            return false;
        }

        // 두 점 사이 거리 (mm 단위)
        private double PointDistance(RXYZ a, RXYZ b)
        {
            double dx = a.m_x - b.m_x;
            double dy = a.m_y - b.m_y;
            return Math.Sqrt(dx * dx + dy * dy);
        }

        public CADLineWallData(List<WallCurveData> LinewallData, Document doc, UIDocument uidoc)
        {
            if (LinewallData == null || LinewallData.Count == 0)
            {
                MessageBox.Show("벽체 데이터가 없습니다.");
                return;
            }

            m_Walldata = LinewallData;
            m_doc = doc;
            m_uidoc = uidoc;
            m_BottomLevel = Util.GetLevelByName(doc, LinewallData[0].m_BottomLevel);
            m_TopLevel = Util.GetLevelByName(doc, LinewallData[0].m_TopLevel);

            double.TryParse(LinewallData[0].m_BottomOffset, out double botOffset);
            double.TryParse(LinewallData[0].m_TopOffset, out double topOffset);
            m_bottomoffset = botOffset / MM2F;
            m_Topoffset = topOffset / MM2F;
        }

        public void Create()
        {
            idx.Clear();

            if (m_BottomLevel == null || m_TopLevel == null)
            {
                MessageBox.Show("레벨이 셋팅되지 않았습니다. 레벨을 선택하세요~!");
                return;
            }

            Base_H = m_BottomLevel.ProjectElevation;
            Top_H = m_TopLevel.ProjectElevation;

            int totalInput = m_Walldata.Count();
            int n = totalInput;
            int filteredOut = 0;
            int successCount = 0;
            int failedCurve = 0;
            int failedCreate = 0;
            string ss = "{0} of " + n.ToString() + " Create Wall processed...";
            string caption = "Create Wall";

            try
            {
                // WallType 검색을 루프 밖에서 1회만 수행
                WallType s = new FilteredElementCollector(m_doc).OfCategory(BuiltInCategory.OST_Walls).OfClass(typeof(WallType)).FirstOrDefault(
                    q => q.Name == "Kiyeno-경량벽체") as WallType;

                if (s == null)
                {
                    MessageBox.Show("기본타입이 없습니다. 기본타입의 이름은 Kiyeno-경량벽체 입니다.");
                    return;
                }

                // 길이가 짧은 순서로 정렬하여 생성
                var sortedWallData = m_Walldata.OrderBy(data => GetCurveLength(data)).ToList();

                // 중복 커브 제거 및 최소 길이 필터
                var filteredWallData = FilterWallData(sortedWallData);
                filteredOut = totalInput - filteredWallData.Count;
                n = filteredWallData.Count;
                ss = "{0} of " + n.ToString() + " Create Wall processed...";

                using (ProgressForm pf = new ProgressForm(caption, ss, n))
                {
                    foreach (WallCurveData data in filteredWallData)
                    {
                        if (ProgressForm.m_abortFlag == true)
                        {
                            ProgressForm.m_abortFlag = false;
                            pf.Close();
                            return;
                        }

                        Curve c = Util.ConvertCurve(data.m_Rlines, data.m_Rarcs, true, Base_H);
                        if (c == null)
                        {
                            failedCurve++;
                            pf.Increment();
                            continue;
                        }

                        m_Typename = data.m_symbolName;
                        ElementId idxx = Create_Wall_basic(c, s);
                        if (idxx != ElementId.InvalidElementId)
                        {
                            idx.Add(idxx);
                            successCount++;
                        }
                        else
                        {
                            failedCreate++;
                        }
                        pf.Increment();
                    }
                }
            }

            catch (Exception ex)
            {
                MessageBox.Show(ex.Message);
            }

            finally
            {
                if (idx.Count != 0)
                {
                    m_uidoc.Selection.SetElementIds(idx);
                }
                ProgressForm.m_abortFlag = false;

                // 결과 로그 표시
                string log = $"벽체 생성 결과\n" +
                             $"──────────────\n" +
                             $"전체 입력: {totalInput}개\n" +
                             $"필터 제거: {filteredOut}개 (중복/최소길이)\n" +
                             $"생성 성공: {successCount}개\n" +
                             $"커브 변환 실패: {failedCurve}개\n" +
                             $"생성 실패: {failedCreate}개";
                MessageBox.Show(log, "Create Wall - 결과");
            }
        }

        public ElementId Create_Wall_basic(Curve Curve, WallType s)
        {
            ElementId elemId = ElementId.InvalidElementId;

            try
            {
                using (Transaction trans = new Transaction(m_doc, "Start"))
                {
                    trans.Start();

                    FailureHandlingOptions failOpt = trans.GetFailureHandlingOptions();
                    failOpt.SetFailuresPreprocessor(new MyFailureHandler());
                    trans.SetFailureHandlingOptions(failOpt);

                    XYZ nomal = new XYZ(0, 0, 1);
                    Wall wall = Wall.Create(m_doc, Curve, s.Id, m_BottomLevel.Id, 3000 / 304.8, 0, true, false);
                    elemId = wall.Id;
                    trans.Commit();

                    if (elemId != ElementId.InvalidElementId)
                    {
                        trans.Start("Create2");

                        FailureHandlingOptions failOpt2 = trans.GetFailureHandlingOptions();
                        failOpt2.SetFailuresPreprocessor(new MyFailureHandler());
                        trans.SetFailureHandlingOptions(failOpt2);

                        Wall wall1 = m_doc.GetElement(elemId) as Wall;

                        if (wall1 == null)
                        {
                            // 자동결합으로 벽이 흡수된 경우
                            trans.RollBack();
                            return ElementId.InvalidElementId;
                        }

                        Parameter param2 = wall1.get_Parameter(BuiltInParameter.WALL_BASE_CONSTRAINT);
                        if (param2 != null && !param2.IsReadOnly) param2.Set(m_BottomLevel.Id);

                        Parameter param3 = wall1.get_Parameter(BuiltInParameter.WALL_HEIGHT_TYPE);
                        if (param3 != null && !param3.IsReadOnly) param3.Set(m_TopLevel.Id);

                        Parameter param10 = wall1.get_Parameter(BuiltInParameter.WALL_BASE_OFFSET);
                        if (param10 != null && !param10.IsReadOnly) param10.Set(m_bottomoffset);

                        Parameter param = wall1.get_Parameter(BuiltInParameter.WALL_TOP_OFFSET);
                        if (param != null && !param.IsReadOnly) param.Set(m_Topoffset);

                        Parameter param1 = wall1.get_Parameter(BuiltInParameter.STRUCTURAL_ANALYTICAL_MODEL);
                        if (param1 != null && !param1.IsReadOnly) param1.Set(0);

                        Parameter param4 = wall1.get_Parameter(BuiltInParameter.WALL_ATTR_ROOM_BOUNDING);
                        if (param4 != null && !param4.IsReadOnly) param4.Set(1);

                        // 벽체 중심선 기준으로 생성 (Wall Centerline = 0)
                        Parameter param5 = wall1.get_Parameter(BuiltInParameter.WALL_KEY_REF_PARAM);
                        if (param5 != null && !param5.IsReadOnly) param5.Set(0);

                        trans.Commit();
                    }
                }
            }

            catch (Exception ex)
            {
                MessageBox.Show(ex.Message);
            }

            return elemId;
        }
    }

    public class MyFailureHandler : IFailuresPreprocessor
    {
        public FailureProcessingResult PreprocessFailures(FailuresAccessor failureAccessor)
        {
            bool hasResolvedError = false;

            foreach (FailureMessageAccessor failure in failureAccessor.GetFailureMessages())
            {
                FailureSeverity severity = failure.GetSeverity();

                if (severity == FailureSeverity.Warning)
                {
                    // 모든 경고 억제 (축 벗어남, 벽 겹침 등)
                    failureAccessor.DeleteWarning(failure);
                }
                else if (severity == FailureSeverity.Error)
                {
                    // 오류: 해결 가능하면 자동 해결 (요소 결합 해제, 인스턴스 삭제 등)
                    if (failure.HasResolutions())
                    {
                        failureAccessor.ResolveFailure(failure);
                        hasResolvedError = true;
                    }
                }
            }

            if (hasResolvedError)
                return FailureProcessingResult.ProceedWithCommit;

            return FailureProcessingResult.Continue;
        }
    }
}
