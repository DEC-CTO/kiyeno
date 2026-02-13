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
using Application = Autodesk.AutoCAD.ApplicationServices.Application;
using System.Diagnostics;
using ColorControl;

namespace Kiyeno
{
    public class CADConvertData
    {
        public static RXYZ ConvertRXYZ(Point3d p1)
        {
            return new RXYZ(p1.X, p1.Y, p1.Z);
        }

        public static RLine ConvertRLine(Line line)
        {
            RLine rl = null;
            try
            {
                rl = new RLine(ConvertRXYZ(line.StartPoint), ConvertRXYZ(line.EndPoint));
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message);
            }

            return rl;
        }

        public static RArc ConvertRArc(Arc arc)
        {
            RArc rl = null;
            try
            {
                Point3d sp = arc.StartPoint;
                Point3d mp = arc.GetPointAtDist(arc.Length / 2);
                Point3d ep = arc.EndPoint;

                rl = new RArc(ConvertRXYZ(sp), ConvertRXYZ(mp), ConvertRXYZ(ep));
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message);
            }

            return rl;
        }

        public static List<Rpoly> ConvertRpolys(List<Curve> objRefs)
        {
            List<Rpoly> rpolys = new List<Rpoly>();

            try
            {

                foreach (Curve item in objRefs)
                {
                    List<RCurve> Rcurves = new List<RCurve>();

                    if (item is Circle == false)
                    {
                        Util.PolyClean_ReducePoints_repair(item as Polyline, 1);
                        DBObjectCollection dBCol = new DBObjectCollection();
                        item.Explode(dBCol);

                        foreach (Curve ccc in dBCol)
                        {
                            if (ccc is Line)
                            {
                                RCurve c = new RCurve();
                                c.m_Rline = ConvertRLine(ccc as Line);
                                Rcurves.Add(c);
                            }

                            else if (ccc is Arc)
                            {
                                RCurve c1 = new RCurve();
                                c1.m_Rarc = ConvertRArc(ccc as Arc);
                                Rcurves.Add(c1);
                            }

                            else if (ccc is Circle)
                            {
                                Circle circle = ccc as Circle;
                                Arc arc1 = new Arc(circle.Center, circle.Radius, 0, Math.PI);
                                Arc arc2 = new Arc(circle.Center, circle.Radius, Math.PI, Math.PI * 2);

                                RCurve c1 = new RCurve();
                                c1.m_Rarc = ConvertRArc(arc1);
                                Rcurves.Add(c1);

                                RCurve c2 = new RCurve();
                                c2.m_Rarc = ConvertRArc(arc2);
                                Rcurves.Add(c2);
                            }
                        }
                    }

                    else
                    {
                        Circle circle = item as Circle;
                        Arc arc1 = new Arc(circle.Center, circle.Radius, 0, Math.PI);
                        Arc arc2 = new Arc(circle.Center, circle.Radius, Math.PI, Math.PI * 2);

                        RCurve c1 = new RCurve();
                        c1.m_Rarc = ConvertRArc(arc1);
                        Rcurves.Add(c1);

                        RCurve c2 = new RCurve();
                        c2.m_Rarc = ConvertRArc(arc2);
                        Rcurves.Add(c2);
                    }

                    Rpoly rp = new Rpoly(Rcurves);
                    rpolys.Add(rp);
                }
            }

            catch (Exception ex)
            {
                MessageBox.Show(ex.Message);
            }

            return rpolys;
        }

        public static List<Rpoly> ConvertRpolys2Dto3D(List<Curve> objRefs)
        {
            List<Rpoly> rpolys = new List<Rpoly>();

            try
            {
                Document doc = Application.DocumentManager.MdiActiveDocument;
                Editor ed = doc.Editor;

                PromptPointResult ppr1 = ed.GetPoint(new PromptPointOptions("Select src point 1"));
                PromptPointResult ppr2 = ed.GetPoint(new PromptPointOptions("Select src point 2"));
                Point3d sp1 = ppr1.Value;
                Point3d sp2 = ppr2.Value;
                Vector3d v1 = (sp2 - sp1).GetNormal();

                foreach (Curve item in objRefs)
                {
                    List<RCurve> Rcurves = new List<RCurve>();

                    if (item is Circle == false)
                    {
                        Curve tempCurve = item.Clone() as Curve; // 복사본 생성
                        Matrix3d rotMatrix = Matrix3d.Rotation(Math.PI / 2, v1, sp1);
                        tempCurve.TransformBy(rotMatrix);

                        Util.PolyClean_ReducePoints_repair(tempCurve as Polyline, 1);
                        DBObjectCollection dBCol = new DBObjectCollection();
                        tempCurve.Explode(dBCol);

                        foreach (Curve ccc in dBCol)
                        {
                            if (ccc is Line)
                            {
                                Debug.Print((ccc as Line).StartPoint.ToString());

                                RCurve c = new RCurve();
                                c.m_Rline = ConvertRLine(ccc as Line);
                                Rcurves.Add(c);
                            }

                            else if (ccc is Arc)
                            {
                                RCurve c1 = new RCurve();
                                c1.m_Rarc = ConvertRArc(ccc as Arc);
                                Rcurves.Add(c1);
                            }

                            else if (ccc is Circle)
                            {
                                Circle circle = ccc as Circle;
                                Arc arc1 = new Arc(circle.Center, circle.Radius, 0, Math.PI);
                                Arc arc2 = new Arc(circle.Center, circle.Radius, Math.PI, Math.PI * 2);

                                RCurve c1 = new RCurve();
                                c1.m_Rarc = ConvertRArc(arc1);
                                Rcurves.Add(c1);

                                RCurve c2 = new RCurve();
                                c2.m_Rarc = ConvertRArc(arc2);
                                Rcurves.Add(c2);
                            }
                        }
                    }

                    else
                    {
                        Curve tempCurve = item.Clone() as Curve; // 복사본 생성
                        Matrix3d rotMatrix = Matrix3d.Rotation(Math.PI / 2, v1, sp1);
                        tempCurve.TransformBy(rotMatrix);

                        Circle circle = tempCurve as Circle;

                        Arc arc1 = new Arc(circle.Center, circle.Radius, 0, Math.PI);
                        Arc arc2 = new Arc(circle.Center, circle.Radius, Math.PI, Math.PI * 2);

                        RCurve c1 = new RCurve();
                        c1.m_Rarc = ConvertRArc(arc1);
                        Rcurves.Add(c1);

                        RCurve c2 = new RCurve();
                        c2.m_Rarc = ConvertRArc(arc2);
                        Rcurves.Add(c2);
                    }

                    Rpoly rp = new Rpoly(Rcurves);
                    rpolys.Add(rp);
                }
            }

            catch (Exception ex)
            {
                MessageBox.Show(ex.Message);
            }

            return rpolys;
        }
        public static List<Curve> RCurveToRhinoCurve(List<ReturnCurves> curves)
        {
            List<Curve> rcurves = new List<Curve>();

            foreach (ReturnCurves item in curves)
            {
                foreach (RCurve curve in item.m_Path)
                {
                    Curve c = ConvertCurve(curve);
                    rcurves.Add(c);
                }
            }

            return rcurves;
        }

        public static Curve ConvertCurve(RCurve curve)
        {
            Curve c = null;
            if (curve.m_Rline != null)
            {
                Line line = new Line(ConvertPoint3d(curve.m_Rline.m_sp), ConvertPoint3d(curve.m_Rline.m_ep));
                c = line;
            }

            else if (curve.m_Rarc != null)
            {
                CircularArc3d arc = new CircularArc3d(ConvertPoint3d(curve.m_Rarc.m_sp), ConvertPoint3d(curve.m_Rarc.m_mid), ConvertPoint3d(curve.m_Rarc.m_ep));
                c = Curve.CreateFromGeCurve(arc);
            }
            return c;
        }

        public static Point3d ConvertPoint3d(RXYZ p1)
        {
            return new Point3d(p1.m_x, p1.m_y, p1.m_z);
        }
    }
}
