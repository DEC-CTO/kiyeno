using Autodesk.Revit.DB;
using Autodesk.Revit.UI;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static QTO.QTOForm;
using System.Windows.Forms;
using System.Runtime.InteropServices;


using System.Data.OleDb;
using System.Reflection;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.IO;
using Microsoft.Win32;
using System.Runtime;
using System.Windows.Forms.Layout;
using System.ComponentModel.Design.Serialization;
using DataHub;


namespace QTO
{
    public class Util
    {
        public static List<Level> GetLevelListByElvation(Document m_doc)
        {
            List<Level> m_LevelList = new List<Level>();

            try
            {
                Autodesk.Revit.DB.FilteredElementCollector collector = new Autodesk.Revit.DB.FilteredElementCollector(m_doc);
                Autodesk.Revit.DB.ElementClassFilter classFilter = new Autodesk.Revit.DB.ElementClassFilter(typeof(Autodesk.Revit.DB.View));
                Autodesk.Revit.DB.FilteredElementIterator iter = collector.WherePasses(classFilter).GetElementIterator();

                //
                List<Level> Levels = new List<Level>();

                while (iter.MoveNext())
                {
                    Autodesk.Revit.DB.View view = iter.Current as Autodesk.Revit.DB.View;
                    if (view.GenLevel == null) continue;
                    if (view.ViewType != Autodesk.Revit.DB.ViewType.FloorPlan && view.ViewType != Autodesk.Revit.DB.ViewType.EngineeringPlan && view.ViewType != ViewType.CeilingPlan) continue;
                    Autodesk.Revit.DB.Level level = view.GenLevel;

                    Autodesk.Revit.DB.Level existLevel = Levels.Find(delegate (Autodesk.Revit.DB.Level p) { return p.Id == level.Id; });
                    if (existLevel == null)
                    {
                        Levels.Add(level);
                    }
                }

                Levels.Sort(delegate (Autodesk.Revit.DB.Level L1, Autodesk.Revit.DB.Level L2) { return (L1.Elevation > L2.Elevation) ? 1 : -1; });

                foreach (Autodesk.Revit.DB.Level le in Levels)
                {
                    m_LevelList.Add(le);
                }
            }
            catch (Exception ex)
            {
                TaskDialog.Show("경고", ex.Message);
            }

            return m_LevelList;
        }
        public static Level GetLevelByName(Document m_doc, string levelname)
        {
            Level level = new FilteredElementCollector(m_doc).OfClass(typeof(Level)).
                FirstOrDefault(q => q.Name == levelname) as Level;

            return level;
        }

        public static XYZ ConverRXYZ(RXYZ p1)
        {
            double x = p1.m_x/304.8;
            double y = p1.m_y / 304.8;
            double z = p1.m_z / 304.8;
            return new XYZ(x, y, z);
        }
        public static XYZ ConverRXYZ_Zero(RXYZ p1, double H)
        {
            double x = p1.m_x / 304.8;
            double y = p1.m_y / 304.8;
            double z = p1.m_z / 304.8;

            return new XYZ(x, y, z + H);
        }
        public static Curve ConvertCurve(RLine r, RArc a, bool IszeroLevel, double H)
        {
            Curve c = null;

            try
            {
                if (r != null)
                {
                    if (IszeroLevel == false)
                    {
                        c = Line.CreateBound(ConverRXYZ(r.m_sp), ConverRXYZ(r.m_ep));
                    }
                    else if (IszeroLevel == true)
                    {
                        c = Line.CreateBound(ConverRXYZ_Zero(r.m_sp, H), ConverRXYZ_Zero(r.m_ep, H));
                    }
                }

                if (a != null)
                {
                    if (IszeroLevel == false)
                    {
                        c = Arc.Create(ConverRXYZ(a.m_sp), ConverRXYZ(a.m_ep), ConverRXYZ(a.m_mid));
                    }
                    else if (IszeroLevel == true)
                    {
                        c = Arc.Create(ConverRXYZ_Zero(a.m_sp, H), ConverRXYZ_Zero(a.m_ep, H), ConverRXYZ_Zero(a.m_mid, H));
                    }
                }

                //if(circle != null)
                //{
                //    XYZ normal = ConverRXYZ(circle.m_Vector) - ConverRXYZ(circle.m_Center);
                //    normal.Normalize();
                //    Plane plane = Plane.CreateByNormalAndOrigin(normal, ConverRXYZ(circle.m_Center));

                //    Arc arc1 = Arc.Create(plane, circle.m_Radius.MilliToFeet(), 0, Math.PI);
                //    Arc arc2 = Arc.Create(plane, circle.m_Radius.MilliToFeet(), Math.PI, Math.PI * 2);

                //    curves.Add(arc1);
                //    curves.Add(arc2);
                //}
            }

            catch (Exception e)
            {
                TaskDialog.Show("경고", e.Message);
            }

            return c;
        }
        public static List<Curve> ConvertCurve_poly(RLine r, RArc a, RCircle circle, bool IszeroLevel, double H)
        {
            List<Curve> c = new List<Curve>();

            try
            {
                if (r != null)
                {
                    if (IszeroLevel == false)
                    {
                        c.Add(Line.CreateBound(ConverRXYZ(r.m_sp), ConverRXYZ(r.m_ep)));
                    }
                    else if (IszeroLevel == true)
                    {
                        c.Add(Line.CreateBound(ConverRXYZ_Zero(r.m_sp, H), ConverRXYZ_Zero(r.m_ep, H)));
                    }
                }

                if (a != null)
                {
                    if (IszeroLevel == false)
                    {
                        c.Add(Arc.Create(ConverRXYZ(a.m_sp), ConverRXYZ(a.m_ep), ConverRXYZ(a.m_mid)));
                    }
                    else if (IszeroLevel == true)
                    {
                        c.Add(Arc.Create(ConverRXYZ_Zero(a.m_sp, H), ConverRXYZ_Zero(a.m_ep, H), ConverRXYZ_Zero(a.m_mid, H)));
                    }
                }

                if (circle != null)
                {
                    XYZ normal = ConverRXYZ(circle.m_Vector) - ConverRXYZ(circle.m_Center);
                    normal.Normalize();
                    Plane plane = Plane.CreateByNormalAndOrigin(normal, ConverRXYZ(circle.m_Center));

                    Arc arc1 = Arc.Create(plane, circle.m_Radius / 304.8, 0, Math.PI);
                    Arc arc2 = Arc.Create(plane, circle.m_Radius / 304.8, Math.PI, Math.PI * 2);

                    c.Add(arc1);
                    c.Add(arc2);
                }
            }

            catch (Exception e)
            {
                TaskDialog.Show("경고", e.Message);
            }

            return c;
        }
        public static Curve ConvertNurbsCurve(RNubsCurve r, bool IszeroLevel, double H)
        {
            Curve c = null;
            try
            {
                if (r != null)
                {
                    List<XYZ> ctrpts = new List<XYZ>();
                    List<double> weidouble = new List<double>();
                    List<double> knotdouble = new List<double>();
                    List<double> knotdouble1 = new List<double>();

                    if (IszeroLevel == false)
                    {
                        for (int i = 0; i < r.m_ctrpointlist.Count; i++)
                        {
                            XYZ rs = ConverRXYZ(r.m_ctrpointlist[i]);
                            ctrpts.Add(rs);
                        }
                        for (int i = 0; i < r.m_wtList.Count; i++)
                        {
                            double d = r.m_wtList[i]/304.8;
                            weidouble.Add(d);
                        }
                        for (int i = 0; i < r.m_knotlist.Count; i++)
                        {
                            double d = r.m_knotlist[i] / 304.8;
                            knotdouble.Add(d);
                        }
                    }

                    else if (IszeroLevel == true)
                    {
                        for (int i = 0; i < r.m_ctrpointlist.Count; i++)
                        {
                            XYZ rs = ConverRXYZ_Zero(r.m_ctrpointlist[i], H);
                            ctrpts.Add(rs);
                        }
                        for (int i = 0; i < r.m_wtList.Count; i++)
                        {
                            double d = r.m_wtList[i] / 304.8;
                            weidouble.Add(d);
                        }
                        for (int i = 0; i < r.m_knotlist.Count; i++)
                        {
                            double d = r.m_knotlist[i] / 304.8;
                            knotdouble.Add(d);
                        }
                    }

                    //knotdouble1.Add(knotdouble.First());
                    //knotdouble1.AddRange(knotdouble);
                    //knotdouble1.Add(knotdouble.Last());
                    //HermiteSpline.Create()
                    //c = NurbSpline.CreateCurve(3, knotdouble1, ctrpts, weidouble);
                    //c = NurbSpline.CreateCurve()
                    c = NurbSpline.CreateCurve(ctrpts, weidouble);

                    //c = NurbSpline.CreateCurve(3, knotdouble, ctrpts);
                }
            }

            catch (Exception e)
            {
                TaskDialog.Show("경고", e.Message);
            }

            return c;
        }
    }
}
