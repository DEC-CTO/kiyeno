using Autodesk.AutoCAD.ApplicationServices;
using Autodesk.AutoCAD.DatabaseServices;
using Autodesk.AutoCAD.EditorInput;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using static System.Net.Mime.MediaTypeNames;

using CadApp = Autodesk.AutoCAD.ApplicationServices.Application;
using Autodesk.AutoCAD.Internal;
using Autodesk.AutoCAD.Windows.Data;
using Autodesk.AutoCAD.Geometry;
using DataHub;
using System.Windows.Controls;
using Autodesk.AutoCAD.ApplicationServices.Core;
using Application = Autodesk.AutoCAD.ApplicationServices.Application;
using System.Globalization;
using System.Numerics;
using System.IO;

using Autodesk.AutoCAD.Runtime;
using Exception = System.Exception;
using System.Windows.Shapes;
using Line = Autodesk.AutoCAD.DatabaseServices.Line;
using System.Diagnostics;
using Polyline = Autodesk.AutoCAD.DatabaseServices.Polyline;
using Region = Autodesk.AutoCAD.DatabaseServices.Region;
using System.Windows.Documents;
using System.Security.Cryptography;
using System.Windows.Media.Media3D;
using static System.Windows.Forms.LinkLabel;
using Autodesk.AutoCAD.Colors;

namespace Kiyeno
{
    public class Util
    {
        public static List<Curve> GetCurveList()
        {
            Document doc = CadApp.DocumentManager.MdiActiveDocument;
            Database db = doc.Database;
            Editor ed = doc.Editor;

            List<Curve> m_CurveList = new List<Curve>();

            try
            {
                using (DocumentLock docLock = doc.LockDocument())
                {
                    using (Transaction tr = doc.TransactionManager.StartTransaction())

                    using (tr)
                    {
                        Autodesk.AutoCAD.Internal.Utils.SetFocusToDwgView();
                        PromptSelectionResult result = Autodesk.AutoCAD.ApplicationServices.Application.DocumentManager.MdiActiveDocument.Editor.GetSelection();
                        if (result.Status == PromptStatus.OK)
                        {
                            SelectionSet acSSet = result.Value;

                            foreach (SelectedObject acSSObj in acSSet)
                            {
                                if (acSSObj != null)
                                {
                                    Entity acEnt = tr.GetObject(acSSObj.ObjectId, OpenMode.ForWrite) as Entity;

                                    if (acEnt.GetType() == typeof(Line) || acEnt.GetType() == typeof(Arc))
                                    {
                                        Curve curve = acEnt as Curve;
                                        m_CurveList.Add(curve);
                                    }
                                    else if(acEnt.GetType() == typeof(Polyline))
                                    {
                                        DBObjectCollection dc = new DBObjectCollection();
                                        acEnt.Explode(dc);

                                        foreach (DBObject item in dc)
                                        {
                                            Curve curve = item as Curve;
                                            m_CurveList.Add(curve);
                                        }
                                    }
                                }
                            }
                        }

                        else
                        {
                            MessageBox.Show("라인을 선택하세요");
                        }

                        tr.Commit();
                    }
                }
            }

            catch (System.Exception ex)
            {
                MessageBox.Show(ex.Message);
            }

            return m_CurveList;
        }
        public static double GetLength(Curve curve)
        {
            try
            {
                return Math.Abs(curve.GetDistanceAtParameter(curve.EndParam) - curve.GetDistanceAtParameter(curve.StartParam));
            }
            catch
            {
                return double.PositiveInfinity;
            }
        }

        public static int PolyClean_ReducePoints_repair(Polyline poly, double epsilon)
        {
            List<Point3d> points = new List<Point3d>();
            for (int i = 0; i < poly.NumberOfVertices; i++)
            {
                points.Add(poly.GetPoint3dAt(i));
            }

            var cleanList = new List<int>();
            int j = 0;
            for (int i = 1; i < points.Count; i++)
            {
                // 아크인지 확인
                if (poly.GetBulgeAt(i - 1) != 0)  // 아크는 Bulge 값이 0이 아님
                {
                    // 아크의 호 길이 계산
                    double bulge = poly.GetBulgeAt(i - 1);
                    double theta = 4 * Math.Atan(Math.Abs(bulge));  // 아크의 중심각 계산
                    double chordLength = points[i].DistanceTo(points[i - 1]);  // 두 점 사이의 직선 거리
                    double radius = chordLength / (2 * Math.Sin(theta / 2));  // 아크의 반지름
                    double arcLength = theta * radius;  // 호 길이 계산

                    if (arcLength < epsilon)
                    {
                        cleanList.Add(i);
                    }
                    else
                    {
                        j = i;
                    }
                }
                else
                {
                    // 직선일 경우 기존 거리 계산
                    if (points[i].DistanceTo(points[j]) < epsilon)
                    {
                        cleanList.Add(i);
                    }
                    else
                    {
                        j = i;
                    }
                }
            }

            cleanList.Reverse();
            cleanList.ForEach(index => poly.RemoveVertexAt(index));
            return cleanList.Count;
        }
    }
}
