using Autodesk.AutoCAD.ApplicationServices;
using Autodesk.AutoCAD.DatabaseServices;
using Autodesk.AutoCAD.EditorInput;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Windows.Forms;

using CadApp = Autodesk.AutoCAD.ApplicationServices.Application;
using System.Runtime.InteropServices;
using DataHub;
//using System.Text.Json.Serialization;
using Newtonsoft.Json;
using System.Diagnostics;
using System.IO;
//using Autodesk.AutoCAD.Interop.Common;
using System.Linq;
using System.Runtime.Remoting;
using ColorControl;

namespace Kiyeno
{
    public partial class KiyenoMain : Form
    {
        public static string L_botLevel = "";
        public static string L_topLevel = "";
        public static string L_CeilingLevel = "";
        public static string m_BottomOffset = "0";
        public static string m_TopOffset = "0";
        public static bool m_IsCeilingLevel = true;

        public static List<string> m_getLinedatas = new List<string>();

        public KiyenoMain()
        {
            InitializeComponent();
        }

        private void KiyenoMain_Load(object sender, EventArgs e)
        {
            this.DoubleBuffered = true;
            checkBox1.Checked = false;
            Top_Level.Enabled = false;
            m_IsCeilingLevel = false;

            // static 변수 초기화 (폼 재오픈 시 이전 값 잔존 방지)
            L_botLevel = "";
            L_topLevel = "";
            L_CeilingLevel = "";
            m_BottomOffset = "0";
            m_TopOffset = "0";
            DataHubList dh = new DataHubList();
            dh.Title = "get_level_inforCAD";
            string Tojsonstring = JsonConvert.SerializeObject(dh);
            sendmessagetorevit_datahub(Tojsonstring);
        }

        public const int WM_USER = 0x400;
        public const int WM_COPYDATA = 0x4A;
        public static bool isExecuting = false;

        [DllImport("User32.dll")]
        public static extern IntPtr FindWindow(String lpClassName, String lpWindowName);

        [DllImport("user32.dll")]
        public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, ref COPYDATASTRUCT lParam);

        public struct COPYDATASTRUCT
        {
            public IntPtr dwData;
            public int cbData;
            [MarshalAs(UnmanagedType.LPStr)]
            public string lpData;
        }
        protected override void WndProc(ref Message m)
        {
            try
            {
                switch (m.Msg)
                {
                    case WM_COPYDATA:
                        COPYDATASTRUCT cds = (COPYDATASTRUCT)m.GetLParam(typeof(COPYDATASTRUCT));
                        byte[] buff = System.Text.Encoding.UTF8.GetBytes(cds.lpData);

                        COPYDATASTRUCT cs = new COPYDATASTRUCT();
                        cs.dwData = new IntPtr(0);
                        cs.cbData = buff.Length;
                        cs.lpData = cds.lpData;

                        string s = cs.lpData;
                        getinforfromrevit(s);
                        break;

                    default:
                        base.WndProc(ref m);
                        break;
                }
            }
            catch (System.Exception ex)
            {
                MessageBox.Show(ex.Message);
            }
        }
        public static void sendmessagetorevit(List<string> strs)
        {
            try
            {
                isExecuting = false;
                Process[] process = Process.GetProcesses();
                foreach (Process proc in process)
                {
                    if (proc.ProcessName.Equals("Revit"))
                    {
                        isExecuting = true;
                        break;
                    }
                }

                if (isExecuting)
                {
                    IntPtr hwnd = FindWindow(null, "kiyeno System ");
                    if (hwnd == IntPtr.Zero)
                    {
                        MessageBox.Show("Revit의 kiyeno System 창을 찾을 수 없습니다.");
                        return;
                    }
                    foreach (string s in strs)
                    {
                        byte[] buff = System.Text.Encoding.UTF8.GetBytes(s);
                        COPYDATASTRUCT cds = new COPYDATASTRUCT();
                        cds.dwData = new IntPtr(1001);
                        cds.cbData = buff.Length + 1;
                        cds.lpData = s;
                        SendMessage(hwnd, WM_COPYDATA, IntPtr.Zero, ref cds);
                    }
                }
            }

            catch (System.Exception ex)
            {
                MessageBox.Show(ex.Message);
            }
        }
        public static void sendmessagetorevit_datahub(string str)
        {
            try
            {
                isExecuting = false;
                Process[] process = Process.GetProcesses();
                foreach (Process proc in process)
                {
                    if (proc.ProcessName.Equals("Revit"))
                    {
                        isExecuting = true;
                        break;
                    }
                }

                if (isExecuting)
                {
                    IntPtr hwnd = FindWindow(null, "kiyeno System ");
                    if (hwnd == IntPtr.Zero)
                    {
                        MessageBox.Show("Revit의 kiyeno System 창을 찾을 수 없습니다.");
                        return;
                    }
                    byte[] buff = System.Text.Encoding.UTF8.GetBytes(str);
                    COPYDATASTRUCT cds = new COPYDATASTRUCT();
                    cds.dwData = new IntPtr(1001);
                    cds.cbData = buff.Length + 1;
                    cds.lpData = str;
                    SendMessage(hwnd, WM_COPYDATA, IntPtr.Zero, ref cds);
                }
            }

            catch (System.Exception ex)
            {
                MessageBox.Show(ex.Message);
            }
        }
        private void getinforfromrevit(string s)
        {
            try
            {
                var data = JsonConvert.DeserializeObject<DataHubList>(s);

                if (data.Title == "LevelNames")
                {
                    Top_Level.Items.Clear();
                    Ceiling_Level.Items.Clear();
                    Bot_Level.Items.Clear();

                    for (int i = 0; i < data.m_LevelNameData.Count; i++)
                    {
                        if (!data.m_LevelNameData[i].Contains("CH"))
                        {
                            Bot_Level.Items.Add(data.m_LevelNameData[i]);
                            Top_Level.Items.Add(data.m_LevelNameData[i]);
                        }
                        else
                        {
                            Ceiling_Level.Items.Add(data.m_LevelNameData[i]);
                        }
                    }
                }
            }

            catch (System.Exception ex)
            {
                MessageBox.Show(ex.Message);
                return;
            }
        }

        private void button1_Click(object sender, EventArgs e)
        {
            DataHubList dh = new DataHubList();
            dh.Title = "get_level_inforCAD";
            string Tojsonstring = JsonConvert.SerializeObject(dh);
            sendmessagetorevit_datahub(Tojsonstring);
        }

        private void Bot_Level_SelectedIndexChanged(object sender, EventArgs e)
        {
            L_botLevel = Bot_Level.Text;
        }

        private void Ceiling_Level_SelectedIndexChanged(object sender, EventArgs e)
        {
            L_CeilingLevel = Ceiling_Level.Text;
        }

        private void Top_Level_SelectedIndexChanged(object sender, EventArgs e)
        {
            L_topLevel = Top_Level.Text;
        }
        private void button2_Click(object sender, EventArgs e)
        {
            try
            {
                List<Curve> Curves = Util.GetCurveList();
                List<WallCurveData> curveData = new List<WallCurveData>();

                foreach (Curve c in Curves)
                {
                    if (Util.GetLength(c) < 1) continue;
                    RLine rline = null;
                    RArc rarc = null;
                    if (c.GetType() == typeof(Line))
                    {
                        rline = CADConvertData.ConvertRLine(c as Line);
                    }

                    else if (c.GetType() == typeof(Arc))
                    {
                        rarc = CADConvertData.ConvertRArc(c as Arc);
                    }

                    WallCurveData cd = new WallCurveData();
                    cd.m_symbolName = "";
                    //if (cd.m_symbolName == "") { MessageBox.Show("유형을 결정할 텍스트가 없습니다."); return; }
                    cd.m_Rlines = rline;
                    cd.m_Rarcs = rarc;
                    cd.m_prefix = "";
                    cd.m_ID = c.ObjectId.ToString().Trim('(', ')');
                    cd.m_RevitID = "";
                    // 레벨 검증 (할당 전에 수행)
                    string actualTopLevel = m_IsCeilingLevel ? L_topLevel : L_CeilingLevel;
                    if (L_botLevel == "" || actualTopLevel == "")
                    {
                        MessageBox.Show("레벨을 선택하고 실행하세요");
                        return;
                    }

                    cd.m_BottomLevel = L_botLevel;
                    cd.m_TopLevel = actualTopLevel;

                    cd.m_BottomOffset = m_BottomOffset;
                    cd.m_TopOffset = m_TopOffset;

                    curveData.Add(cd);
                }

                DataHubList dh = new DataHubList();
                dh.Title = "Create Wall CAD";
                dh.m_WallCurveData = curveData;
                string Tojsonstring = JsonConvert.SerializeObject(dh);
                sendmessagetorevit_datahub(Tojsonstring);
            }
            catch (System.Exception ex)
            {
                MessageBox.Show(ex.Message);
            }
        }

        private void textBox1_TextChanged(object sender, EventArgs e)
        {
            m_BottomOffset = textBox1.Text;
        }
        private void textBox2_TextChanged(object sender, EventArgs e)
        {
            m_TopOffset = textBox2.Text;
        }

        private void checkBox1_CheckedChanged(object sender, EventArgs e)
        {
            if(checkBox1.Checked)
            {
                m_IsCeilingLevel = true;
                Top_Level.Enabled = true;
                Ceiling_Level.Enabled = false;
            }
            else if(!checkBox1.Checked)
            {
                m_IsCeilingLevel = false;
                Top_Level.Enabled = false;
                Ceiling_Level.Enabled = true;
            }
        }
    }
}
