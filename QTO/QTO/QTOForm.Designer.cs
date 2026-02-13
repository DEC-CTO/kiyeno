namespace QTO
{
    partial class QTOForm
    {
        /// <summary>
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            this.menuStrip1 = new System.Windows.Forms.MenuStrip();
            this.fileToolStripMenuItem = new System.Windows.Forms.ToolStripMenuItem();
            this.ExToolStripMenuItem = new System.Windows.Forms.ToolStripMenuItem();
            this.ExExToolStripMenuItem = new System.Windows.Forms.ToolStripMenuItem();
            this.serverstatus = new System.Windows.Forms.Label();
            this.panel1 = new System.Windows.Forms.Panel();
            this.button1 = new System.Windows.Forms.Button();
            this.menuStrip1.SuspendLayout();
            this.panel1.SuspendLayout();
            this.SuspendLayout();
            // 
            // menuStrip1
            // 
            this.menuStrip1.Items.AddRange(new System.Windows.Forms.ToolStripItem[] {
            this.fileToolStripMenuItem});
            this.menuStrip1.Location = new System.Drawing.Point(0, 0);
            this.menuStrip1.Name = "menuStrip1";
            this.menuStrip1.Size = new System.Drawing.Size(362, 24);
            this.menuStrip1.TabIndex = 1;
            this.menuStrip1.Text = "menuStrip1";
            // 
            // fileToolStripMenuItem
            // 
            this.fileToolStripMenuItem.DropDownItems.AddRange(new System.Windows.Forms.ToolStripItem[] {
            this.ExToolStripMenuItem,
            this.ExExToolStripMenuItem});
            this.fileToolStripMenuItem.Name = "fileToolStripMenuItem";
            this.fileToolStripMenuItem.Size = new System.Drawing.Size(37, 20);
            this.fileToolStripMenuItem.Text = "File";
            // 
            // ExToolStripMenuItem
            // 
            this.ExToolStripMenuItem.Name = "ExToolStripMenuItem";
            this.ExToolStripMenuItem.Size = new System.Drawing.Size(186, 22);
            this.ExToolStripMenuItem.Text = "서버연결";
            this.ExToolStripMenuItem.Click += new System.EventHandler(this.ExToolStripMenuItem_Click);
            // 
            // ExExToolStripMenuItem
            // 
            this.ExExToolStripMenuItem.Name = "ExExToolStripMenuItem";
            this.ExExToolStripMenuItem.Size = new System.Drawing.Size(186, 22);
            this.ExExToolStripMenuItem.Text = "벽체관리시스템 보기";
            this.ExExToolStripMenuItem.Click += new System.EventHandler(this.ExExToolStripMenuItem_Click);
            // 
            // serverstatus
            // 
            this.serverstatus.AutoSize = true;
            this.serverstatus.Font = new System.Drawing.Font("굴림", 9F, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, ((byte)(129)));
            this.serverstatus.Location = new System.Drawing.Point(12, 12);
            this.serverstatus.Name = "serverstatus";
            this.serverstatus.Size = new System.Drawing.Size(57, 12);
            this.serverstatus.TabIndex = 2;
            this.serverstatus.Text = "서버상태";
            // 
            // panel1
            // 
            this.panel1.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle;
            this.panel1.Controls.Add(this.serverstatus);
            this.panel1.Dock = System.Windows.Forms.DockStyle.Top;
            this.panel1.Location = new System.Drawing.Point(0, 24);
            this.panel1.Name = "panel1";
            this.panel1.Size = new System.Drawing.Size(362, 35);
            this.panel1.TabIndex = 3;
            // 
            // button1
            // 
            this.button1.Location = new System.Drawing.Point(0, 65);
            this.button1.Name = "button1";
            this.button1.Size = new System.Drawing.Size(103, 28);
            this.button1.TabIndex = 4;
            this.button1.Text = "벽체확인";
            this.button1.UseVisualStyleBackColor = true;
            this.button1.Click += new System.EventHandler(this.button1_Click);
            // 
            // QTOForm
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(7F, 12F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(362, 112);
            this.Controls.Add(this.button1);
            this.Controls.Add(this.panel1);
            this.Controls.Add(this.menuStrip1);
            this.MainMenuStrip = this.menuStrip1;
            this.Name = "QTOForm";
            this.Text = "kiyeno System ";
            this.FormClosed += new System.Windows.Forms.FormClosedEventHandler(this.QTOForm_FormClosed);
            this.Load += new System.EventHandler(this.QTOForm_Load);
            this.menuStrip1.ResumeLayout(false);
            this.menuStrip1.PerformLayout();
            this.panel1.ResumeLayout(false);
            this.panel1.PerformLayout();
            this.ResumeLayout(false);
            this.PerformLayout();

        }

        #endregion
        private System.Windows.Forms.MenuStrip menuStrip1;
        private System.Windows.Forms.ToolStripMenuItem fileToolStripMenuItem;
        private System.Windows.Forms.ToolStripMenuItem ExToolStripMenuItem;
        private System.Windows.Forms.ToolStripMenuItem ExExToolStripMenuItem;
        private System.Windows.Forms.Label serverstatus;
        private System.Windows.Forms.Panel panel1;
        private System.Windows.Forms.Button button1;
    }
}