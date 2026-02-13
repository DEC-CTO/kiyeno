using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using static System.Windows.Forms.VisualStyles.VisualStyleElement.Window;

namespace QTO
{
    public partial class ProgressForm : Form
    {
        public static bool m_abortFlag;
        string _format;

        public ProgressForm(string caption, string format, int max)
        {
            InitializeComponent();
            _format = format;
            Text = caption;
            label1.Text = (null == format) ? caption : string.Format(format, 0);
            progressBar1.Minimum = 0;
            progressBar1.Maximum = max;
            progressBar1.Value = 0;
            Show();
            Application.DoEvents();
        }

        public void Increment()
        {
            ++progressBar1.Value;
            if (null != _format)
            {
                label1.Text = string.Format(_format, progressBar1.Value);
            }
            Application.DoEvents();
        }
        public bool getAbortFlag()
        {
            return m_abortFlag;
        }
        protected override bool ProcessDialogKey(Keys keyData)
        {
            if (Form.ModifierKeys == Keys.None && keyData == Keys.Escape)
            {
                button1.Text = "Aborting...";
                m_abortFlag = true;
                return true;
            }
            return base.ProcessDialogKey(keyData);
        }

        private void button1_Click(object sender, EventArgs e)
        {
            button1.Text = "Aborting...";
            m_abortFlag = true;
        }
    }
}
