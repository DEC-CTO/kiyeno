using Autodesk.Revit.ApplicationServices;
using Autodesk.Revit.Attributes;
using Autodesk.Revit.DB;
using Autodesk.Revit.UI;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;
using System.Windows.Media;
using System.Windows.Media.Imaging;

namespace QTO
{
    internal class App : IExternalApplication
    {
        internal static App thisApp = null;
        private QTOForm m_MyForm;

        public static UIControlledApplication UIControlApp = null;
        static string AddInPath = typeof(App).Assembly.Location;
        static string ButtonIconsFolder = Path.GetDirectoryName(AddInPath);
        public static string AppName = Path.GetFileNameWithoutExtension(AddInPath);

        public Result OnStartup(UIControlledApplication app)
        {
            m_MyForm = null;
            thisApp = this;
            UIControlApp = app;

            try
            {
                string tabname = "KIYENO";
                try { app.CreateRibbonTab(tabname); } catch { }

                RibbonPanel ribbonPanel = null;
                List<RibbonPanel> listRibbonPanel = app.GetRibbonPanels();

                if (listRibbonPanel.Count > 0)
                {
                    foreach (RibbonPanel rp in listRibbonPanel)
                    {
                        if (rp.Name == "KIYENO System")
                        {
                            ribbonPanel = rp;
                            break;
                        }
                    }
                }

                if (ribbonPanel == null)
                    ribbonPanel = app.CreateRibbonPanel(tabname, "KIYENO");

                if (ribbonPanel != null)
                {
                    {
                        bool bFound = false;

                        foreach (RibbonItem item in ribbonPanel.GetItems())
                        {
                            if (item.Name == "KIYENO")
                                bFound = true;
                        }
                        if (!bFound)
                        {
                            PushButton pushBotton = ribbonPanel.AddItem(new PushButtonData("Wall Manager", "Wall Manager", AddInPath, "QTO.Command")) as PushButton;
                            pushBotton.ToolTip = "Create Model";
                            pushBotton.LargeImage = GetBitmapSource(QTO.Properties.Resources.Logo);
                            pushBotton.Image = GetBitmapSource(QTO.Properties.Resources.Logo);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.ToString());
            }

            return Result.Succeeded;
        }

        public void ShowForm(UIApplication uiapp)
        {
            WindowHandle owner_window_handle = new WindowHandle(uiapp.MainWindowHandle);

            if (m_MyForm == null || m_MyForm.IsDisposed)
            {
                // 먼저 Form을 생성
                m_MyForm = new QTOForm();
                // 그 다음에 Handler와 ExternalEvent 생성
                CustomEventHandler handler = new CustomEventHandler(m_MyForm);
                ExternalEvent exEvent = ExternalEvent.Create(handler);

                // Form에 Handler와 ExternalEvent 설정
                m_MyForm.SetExternalEvent(exEvent, handler);
                m_MyForm.Show(owner_window_handle);
            }
        }

        public void WakeFormUp()
        {
            if (m_MyForm != null)
            {
                m_MyForm.WakeUp();
            }
        }

        public Result OnShutdown(UIControlledApplication a)
        {
            return Result.Succeeded;
        }

        private System.Windows.Media.Imaging.BitmapSource GetBitmapSource(System.Drawing.Bitmap _image)
        {
            System.Drawing.Bitmap bitmap = _image;
            BitmapSource bitmapSource = System.Windows.Interop.Imaging.CreateBitmapSourceFromHBitmap(
                                            bitmap.GetHbitmap(),
                                            System.IntPtr.Zero,
                                            System.Windows.Int32Rect.Empty,
                                            System.Windows.Media.Imaging.BitmapSizeOptions.FromEmptyOptions());

            return bitmapSource;
        }
        public class WindowHandle : IWin32Window
        {
            IntPtr _hwnd;

            public WindowHandle(IntPtr h)
            {
                Debug.Assert(IntPtr.Zero != h, "expected non-null window handle");
                _hwnd = h;
            }

            public IntPtr Handle
            {
                get
                {
                    return _hwnd;
                }
            }
        }
    }
}