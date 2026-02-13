using Autodesk.Revit.ApplicationServices;
using Autodesk.Revit.Attributes;
using Autodesk.Revit.DB;
using Autodesk.Revit.UI;
using Autodesk.Revit.UI.Selection;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Windows.Forms;

namespace QTO
{
    [Transaction(TransactionMode.Manual)]
    public class Command : IExternalCommand
    {
        public static QTOForm f = null;
        public static ExternalCommandData m_commandData = null;

        public Result Execute(ExternalCommandData commandData,ref string message,ElementSet elements)
        {
            m_commandData = commandData;
            UIApplication uiapp = commandData.Application;
            UIDocument uidoc = uiapp.ActiveUIDocument;
            Autodesk.Revit.ApplicationServices.Application app = uiapp.Application;
            Document doc = uidoc.Document;

            try
            {
                App.thisApp.ShowForm(commandData.Application);
                return Result.Succeeded;
            }

            catch (Exception ex)
            {
                MessageBox.Show(ex.ToString());
                return Result.Failed;
            }
        }
    }
}
