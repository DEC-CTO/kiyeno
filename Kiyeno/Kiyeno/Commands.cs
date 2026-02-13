using Autodesk.AutoCAD.ApplicationServices;
using Autodesk.AutoCAD.DatabaseServices;
using Autodesk.AutoCAD.EditorInput;
using Autodesk.AutoCAD.Geometry;
using Autodesk.AutoCAD.Runtime;
using System.Windows.Forms;
using System;
using System.Windows.Media.Imaging;
using System.IO;
using System.Reflection;
using Autodesk.Windows;

using System.Collections.Generic;
using System.Linq;
using System.Text;

using CadApp = Autodesk.AutoCAD.ApplicationServices.Application;
using Application = Autodesk.AutoCAD.ApplicationServices.Application;


[assembly: ExtensionApplication(typeof(Kiyeno.MyPlugin))]
[assembly: CommandClass(typeof(Kiyeno.Commands))]

namespace Kiyeno
{
    public class MyPlugin : IExtensionApplication
    {
        public void Initialize()
        {
            // Autocad가 로드될 때 리본 탭 생성
            CreateRibbonTab();
        }

        public void Terminate()
        {
            // 플러그인 종료 시 실행될 코드
        }

        private void CreateRibbonTab()
        {
            // Autocad 리본에 접근
            RibbonControl ribbon = ComponentManager.Ribbon;
            if (ribbon != null)
            {
                // 새 리본 탭 생성
                RibbonTab rtab = new RibbonTab();
                rtab.Title = "KIYENO";
                rtab.Id = "Kiyeno-CAD";

                // 리본 패널 생성
                RibbonPanelSource rps = new RibbonPanelSource();
                rps.Title = "Kiyeno-CAD";
                RibbonPanel rp = new RibbonPanel();
                rp.Source = rps;

                // 버튼을 위한 RibbonButton 생성
                RibbonButton myButton = new RibbonButton();
                myButton.Text = "";
                myButton.ShowText = true;
                myButton.CommandHandler = new CommandHandler();
                myButton.Size = RibbonItemSize.Large;
                myButton.Orientation = System.Windows.Controls.Orientation.Vertical;

                // 버튼에 이미지 추가 (선택 사항)
                try
                {
                    // 리소스에서 이미지 로드
                    System.Drawing.Bitmap bitmap = Properties.Resources.Logo;

                    // BitmapImage로 변환
                    BitmapImage bitmapImage = new BitmapImage();
                    using (MemoryStream stream = new MemoryStream())
                    {
                        bitmap.Save(stream, System.Drawing.Imaging.ImageFormat.Png);
                        stream.Position = 0;

                        bitmapImage.BeginInit();
                        bitmapImage.CacheOption = BitmapCacheOption.OnLoad;
                        bitmapImage.StreamSource = stream;
                        bitmapImage.EndInit();
                        bitmapImage.Freeze(); // UI 스레드 외부에서 사용할 수 있도록
                    }

                    myButton.LargeImage = bitmapImage;
                    //string assemblyPath = Assembly.GetExecutingAssembly().Location;
                    //string imagePath = Path.Combine(Path.GetDirectoryName(assemblyPath), "button_icon.png");
                    //if (File.Exists(imagePath))
                    //{
                    //    BitmapImage bmp = new BitmapImage(new Uri(imagePath));
                    //    myButton.LargeImage = bmp;
                    //}
                }

                catch { /* 이미지 로드 실패 시 무시 */ }
                // 리본 패널에 버튼 추가
                rps.Items.Add(myButton);
                // 리본 탭에 패널 추가
                rtab.Panels.Add(rp);
                // 리본에 새 탭 추가
                ribbon.Tabs.Add(rtab);
            }
        }
    }
    public class CommandHandler : System.Windows.Input.ICommand
    {
        public event EventHandler CanExecuteChanged;

        public bool CanExecute(object parameter)
        {
            return true;
        }

        public void Execute(object parameter)
        {
            // 버튼 클릭 시 AutoCAD 명령 실행
            Application.DocumentManager.MdiActiveDocument.SendStringToExecute("Kiyeno", true, false, true);
        }
    }

    public class Commands
    {
        [CommandMethod("Kiyeno", CommandFlags.Session)]
        public static void Test()
        {
            CadApp.ShowModelessDialog(new KiyenoMain());
        }
    }
}
