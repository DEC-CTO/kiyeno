const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
        ShadingType, VerticalAlign, PageNumber, LevelFormat } = require('docx');

const BLUE = "003366";
const LIGHT_BLUE = "D6E4F0";
const LIGHT_GRAY = "F2F2F2";
const WHITE = "FFFFFF";
const BLACK = "000000";

const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: "999999" };
const cellBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

function headerCell(text, width) {
  return new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: BLUE, type: ShadingType.CLEAR },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 40, after: 40 },
      children: [new TextRun({ text, bold: true, color: WHITE, size: 20, font: "Arial" })]
    })]
  });
}

function dataCell(text, width, opts = {}) {
  return new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    shading: opts.shading ? { fill: opts.shading, type: ShadingType.CLEAR } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { before: 30, after: 30 },
      children: [new TextRun({ text, size: 20, font: "Arial", bold: opts.bold || false, color: opts.color || BLACK })]
    })]
  });
}

// Summary table data
const summaryData = [
  ["1", "QTO - CADLineWallData.cs", "\uBCBD\uCCB4 \uC704\uCE58\uC120\uC744 Wall Centerline\uC73C\uB85C \uC124\uC815", "\uAE30\uB2A5 \uCD94\uAC00"],
  ["2", "Kiyeno - KiyenoMain.cs", "Ceiling \uB808\uBCA8 \uBAA8\uB4DC \uAC80\uC99D \uC870\uAC74 \uC218\uC815", "\uBC84\uADF8 \uC218\uC815"],
  ["3", "Kiyeno - KiyenoMain.cs", "\uD3FC \uB85C\uB4DC \uC2DC static \uBCC0\uC218 \uCD08\uAE30\uD654", "\uBC84\uADF8 \uC218\uC815"],
  ["4", "Kiyeno - KiyenoMain.cs", "FindWindow \uCC3D \uC81C\uBAA9 \uBD88\uC77C\uCE58 \uD1B5\uC77C", "\uBC84\uADF8 \uC218\uC815"],
  ["5", "Kiyeno - KiyenoMain.cs", "FindWindow \uBC18\uD658\uAC12 \uAC80\uC99D \uCD94\uAC00", "\uC548\uC815\uC131 \uAC1C\uC120"],
  ["6", "Kiyeno - KiyenoMain.cs", "Revit \uD504\uB85C\uC138\uC2A4 \uD655\uC778 \uB85C\uC9C1 \uC218\uC815", "\uBC84\uADF8 \uC218\uC815"],
  ["7", "Kiyeno - KiyenoMain.cs", "\uB808\uBCA8 \uAC80\uC99D\uC744 \uD560\uB2F9 \uC804\uC73C\uB85C \uC774\uB3D9", "\uBC84\uADF8 \uC218\uC815"],
  ["8", "Kiyeno - KiyenoMain.cs", "\uC778\uCF54\uB529 UTF-8 \uD1B5\uC77C", "\uC548\uC815\uC131 \uAC1C\uC120"],
  ["9", "QTO - CADLineWallData.cs", "\uC0DD\uC131\uC790 Null/\uBE48 \uB9AC\uC2A4\uD2B8 \uAC80\uC99D, \uC548\uC804\uD55C \uD30C\uC2F1", "\uC548\uC815\uC131 \uAC1C\uC120"],
  ["10", "QTO - CADLineWallData.cs", "WallType \uAC80\uC0C9 \uB8E8\uD504 \uBC16\uC73C\uB85C \uC774\uB3D9", "\uC131\uB2A5 \uAC1C\uC120"],
  ["11", "QTO - CADLineWallData.cs", "Null \uCEE4\uBE0C \uAC74\uB108\uB6F0\uAE30 \uCD94\uAC00", "\uC548\uC815\uC131 \uAC1C\uC120"],
  ["12", "DataHub - DataHubList.cs", "RLine \uCD95 \uBCF4\uC815\uC744 \uAC01\uB3C4 \uAE30\uBC18(0.2\u00B0)\uC73C\uB85C \uBCC0\uACBD", "\uBC84\uADF8 \uC218\uC815"],
  ["13", "QTO - CADLineWallData.cs", "\uBCBD\uCCB4 \uC0DD\uC131 \uC21C\uC11C\uB97C \uC9E7\uC740 \uBCBD\uBD80\uD130 (\uC790\uB3D9\uACB0\uD569 \uD761\uC218 \uBC29\uC9C0)", "\uAE30\uB2A5 \uAC1C\uC120"],
  ["14", "QTO - CADLineWallData.cs", "\uBCBD \uD30C\uB77C\uBBF8\uD130 \uC124\uC815 \uC2DC Null \uCCB4\uD06C (NullReferenceException \uBC29\uC9C0)", "\uBC84\uADF8 \uC218\uC815"],
  ["15", "QTO - CADLineWallData.cs", "MyFailureHandler \uD655\uC7A5 (\uACBD\uACE0 \uC5B5\uC81C + \uC624\uB958 \uC790\uB3D9 \uD574\uACB0)", "\uC548\uC815\uC131 \uAC1C\uC120"],
  ["16", "QTO - CADLineWallData.cs", "\uC911\uBCF5 \uCEE4\uBE0C \uC81C\uAC70 \uBC0F \uCD5C\uC18C \uAE38\uC774 \uD544\uD130 \uCD94\uAC00", "\uC548\uC815\uC131 \uAC1C\uC120"],
  ["17", "QTO - CADLineWallData.cs", "\uB450 \uBC88\uC9F8 \uD2B8\uB79C\uC7AD\uC158\uC5D0 FailureHandler \uC801\uC6A9", "\uC548\uC815\uC131 \uAC1C\uC120"],
  ["18", "QTO - CADLineWallData.cs", "\uBCBD\uCCB4 \uC0DD\uC131 \uACB0\uACFC \uB85C\uADF8 MessageBox \uD45C\uC2DC", "\uAE30\uB2A5 \uCD94\uAC00"],
];

// Detail items
const details = [
  {
    title: "2.1  \uBCBD\uCCB4 \uC911\uC2EC\uC120 \uAE30\uC900 \uC0DD\uC131 \uD30C\uB77C\uBBF8\uD130 \uCD94\uAC00",
    file: "QTO/QTO/CADLineWallData.cs",
    category: "\uAE30\uB2A5 \uCD94\uAC00",
    before: "\uBCBD\uCCB4 \uC0DD\uC131 \uC2DC \uC704\uCE58\uC120(WALL_KEY_REF_PARAM) \uD30C\uB77C\uBBF8\uD130\uB97C \uC124\uC815\uD558\uC9C0 \uC54A\uC544 Revit \uAE30\uBCF8\uAC12\uC73C\uB85C \uC0DD\uC131\uB428. CAD \uB77C\uC778 \uC704\uCE58\uC640 Revit \uBCBD\uCCB4 \uC704\uCE58\uAC00 \uC77C\uCE58\uD558\uC9C0 \uC54A\uB294 \uBB38\uC81C \uBC1C\uC0DD.",
    after: "\uBCBD\uCCB4 \uC911\uC2EC\uC120(Wall Centerline, \uAC12=0)\uC73C\uB85C \uBA85\uC2DC\uC801 \uC124\uC815\uD558\uC5EC CAD \uB77C\uC778\uACFC \uBCBD\uCCB4 \uC704\uCE58\uB97C \uC77C\uCE58\uC2DC\uD0B4."
  },
  {
    title: "2.2  Ceiling \uB808\uBCA8 \uBAA8\uB4DC \uAC80\uC99D \uB85C\uC9C1 \uC624\uB958 \uC218\uC815",
    file: "Kiyeno/Kiyeno/KiyenoMain.cs",
    category: "\uBC84\uADF8 \uC218\uC815",
    before: "Ceiling \uB808\uBCA8 \uBAA8\uB4DC\uC5D0\uC11C \uC2E4\uC81C \uC0AC\uC6A9 \uBCC0\uC218(L_CeilingLevel)\uAC00 \uC544\uB2CC L_topLevel\uC744 \uAC80\uC99D\uD558\uC5EC, \uC815\uC0C1 \uC120\uD0DD\uD574\uB3C4 \uACBD\uACE0 \uBC1C\uC0DD\uD558\uAC70\uB098 \uC774\uC804 \uC138\uC158 \uAC12\uC774 \uC794\uC874\uD558\uC5EC \uC798\uBABB\uB41C \uB808\uBCA8\uB85C \uBCBD\uCCB4 \uC0DD\uC131.",
    after: "\uD604\uC7AC \uBAA8\uB4DC\uC5D0 \uB530\uB77C \uC2E4\uC81C \uC0AC\uC6A9\uB418\uB294 \uB808\uBCA8 \uBCC0\uC218\uB97C \uAC80\uC99D\uD558\uB3C4\uB85D \uC218\uC815."
  },
  {
    title: "2.3  \uD3FC \uC7AC\uC624\uD508 \uC2DC static \uBCC0\uC218 \uCD08\uAE30\uD654 \uCD94\uAC00",
    file: "Kiyeno/Kiyeno/KiyenoMain.cs",
    category: "\uBC84\uADF8 \uC218\uC815",
    before: "\uB808\uBCA8/\uC624\uD504\uC14B \uAC12\uC774 static \uBCC0\uC218\uB85C \uC120\uC5B8\uB418\uC5B4 \uD3FC\uC744 \uB2EB\uC558\uB2E4 \uC5F4\uC5B4\uB3C4 \uC774\uC804 \uAC12 \uC794\uC874. UI \uCF64\uBCF4\uBC15\uC2A4\uB294 \uCD08\uAE30\uD654\uB418\uB098 \uB0B4\uBD80 \uBCC0\uC218\uB294 \uC720\uC9C0\uB418\uC5B4 \uBD88\uC77C\uCE58 \uBC1C\uC0DD.",
    after: "\uD3FC \uB85C\uB4DC \uC2DC \uBAA8\uB4E0 static \uBCC0\uC218\uB97C \uCD08\uAE30 \uC0C1\uD0DC\uB85C \uB9AC\uC14B\uD558\uC5EC UI\uC640 \uB0B4\uBD80 \uBCC0\uC218 \uC77C\uAD00\uC131 \uBCF4\uC7A5."
  },
  {
    title: "2.4  FindWindow \uCC3D \uC81C\uBAA9 \uBD88\uC77C\uCE58 \uC218\uC815",
    file: "Kiyeno/Kiyeno/KiyenoMain.cs",
    category: "\uBC84\uADF8 \uC218\uC815",
    before: "sendmessagetorevit()\uACFC sendmessagetorevit_datahub() \uB450 \uD568\uC218\uAC00 \uC11C\uB85C \uB2E4\uB978 \uCC3D \uC81C\uBAA9\uC73C\uB85C \uAC80\uC0C9\uD558\uC5EC Revit \uD1B5\uC2E0 \uC2E4\uD328 \uBC1C\uC0DD.",
    after: "\uB450 \uD568\uC218 \uBAA8\uB450 Revit \uD3FC \uC81C\uBAA9\uACFC \uC77C\uCE58\uD558\uB294 \uAC12\uC73C\uB85C \uD1B5\uC77C."
  },
  {
    title: "2.5  FindWindow \uBC18\uD658\uAC12 \uAC80\uC99D \uCD94\uAC00",
    file: "Kiyeno/Kiyeno/KiyenoMain.cs",
    category: "\uC548\uC815\uC131 \uAC1C\uC120",
    before: "FindWindow() \uBC18\uD658\uAC12\uC744 \uAC80\uC99D\uD558\uC9C0 \uC54A\uACE0 \uBC14\uB85C SendMessage() \uD638\uCD9C. \uCC3D\uC744 \uCC3E\uC9C0 \uBABB\uD574\uB3C4 \uC0AC\uC6A9\uC790\uC5D0\uAC8C \uC54C\uB9BC \uC5C6\uC74C.",
    after: "\uCC3D\uC744 \uCC3E\uC9C0 \uBABB\uD558\uBA74 \"\uCC3D\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4\" \uBA54\uC2DC\uC9C0 \uD45C\uC2DC."
  },
  {
    title: "2.6  Revit \uD504\uB85C\uC138\uC2A4 \uD655\uC778 \uB85C\uC9C1 \uC218\uC815",
    file: "Kiyeno/Kiyeno/KiyenoMain.cs",
    category: "\uBC84\uADF8 \uC218\uC815",
    before: "\uD504\uB85C\uC138\uC2A4 \uAC80\uC0C9 \uB8E8\uD504 \uB0B4 else \uBD84\uAE30\uC5D0\uC11C \uB9E4 \uBC18\uBCF5\uB9C8\uB2E4 isExecuting\uC744 false\uB85C \uB36E\uC5B4\uC50C\uC6CC, \uD504\uB85C\uC138\uC2A4 \uBAA9\uB85D \uC21C\uC11C\uC5D0 \uB530\uB77C Revit\uC744 \uCC3E\uC544\uB3C4 \uC774\uD6C4 \uB8E8\uD504\uC5D0\uC11C \uBB34\uD6A8\uD654\uB420 \uC704\uD5D8.",
    after: "\uB8E8\uD504 \uC804 \uCD08\uAE30\uD654 \uD6C4 Revit \uBC1C\uACAC \uC2DC break\uD558\uB294 \uBC29\uC2DD\uC73C\uB85C \uBCC0\uACBD."
  },
  {
    title: "2.7  \uB808\uBCA8 \uAC80\uC99D \uC21C\uC11C \uC218\uC815",
    file: "Kiyeno/Kiyeno/KiyenoMain.cs",
    category: "\uBC84\uADF8 \uC218\uC815",
    before: "\uB808\uBCA8\uAC12\uC744 \uBA3C\uC800 \uD560\uB2F9\uD55C \uD6C4 \uAC80\uC99D \uC218\uD589. \uAC80\uC99D \uC2E4\uD328 \uC2DC \uC774\uBBF8 \uCD94\uAC00\uB41C \uC798\uBABB\uB41C \uB370\uC774\uD130\uAC00 \uB9AC\uC2A4\uD2B8\uC5D0 \uC794\uC874.",
    after: "\uAC80\uC99D\uC744 \uD560\uB2F9 \uC804\uC73C\uB85C \uC774\uB3D9\uD558\uC5EC \uC798\uBABB\uB41C \uB370\uC774\uD130 \uC720\uC785 \uBC29\uC9C0."
  },
  {
    title: "2.8  \uC778\uCF54\uB529 UTF-8 \uD1B5\uC77C",
    file: "Kiyeno/Kiyeno/KiyenoMain.cs",
    category: "\uC548\uC815\uC131 \uAC1C\uC120",
    before: "Encoding.Default \uC0AC\uC6A9\uC73C\uB85C OS \uB85C\uCF00\uC77C\uC5D0 \uC758\uC874. JSON\uC5D0 \uD55C\uAE00 \uB808\uBCA8\uBA85 \uD3EC\uD568 \uC2DC \uC778\uCF54\uB529 \uBD88\uC77C\uCE58\uB85C Revit \uCE21 \uC5ED\uC9C1\uB82C\uD654 \uC2E4\uD328 \uAC00\uB2A5.",
    after: "\uBAA8\uB4E0 WM_COPYDATA \uD1B5\uC2E0\uC744 UTF-8\uB85C \uD1B5\uC77C\uD558\uC5EC \uD55C\uAE00 \uB370\uC774\uD130 \uC548\uC815\uC131 \uD655\uBCF4."
  },
  {
    title: "2.9  CADLineWallData \uC0DD\uC131\uC790 \uBCF4\uD638 \uCD94\uAC00",
    file: "QTO/QTO/CADLineWallData.cs",
    category: "\uC548\uC815\uC131 \uAC1C\uC120",
    before: "\uBE48 \uB9AC\uC2A4\uD2B8 \uC804\uB2EC \uC2DC IndexOutOfRangeException, \uC22B\uC790\uAC00 \uC544\uB2CC \uC624\uD504\uC14B \uBB38\uC790\uC5F4 \uC2DC FormatException \uBC1C\uC0DD.",
    after: "Null/\uBE48 \uB9AC\uC2A4\uD2B8 \uAC80\uC99D \uBC0F TryParse\uB97C \uC0AC\uC6A9\uD55C \uC548\uC804\uD55C \uC22B\uC790 \uD30C\uC2F1\uC73C\uB85C \uBCC0\uACBD."
  },
  {
    title: "2.10  WallType \uAC80\uC0C9 \uCD5C\uC801\uD654",
    file: "QTO/QTO/CADLineWallData.cs",
    category: "\uC131\uB2A5 \uAC1C\uC120",
    before: "\uBCBD \uC0DD\uC131 \uB8E8\uD504 \uB0B4\uC5D0\uC11C \uB9E4 \uBCBD\uB9C8\uB2E4 \uB3D9\uC77C\uD55C WallType\uC744 \uBC18\uBCF5 \uAC80\uC0C9. 100\uAC1C \uBCBD \uC0DD\uC131 \uC2DC 100\uBC88 \uC911\uBCF5 \uAC80\uC0C9\uC73C\uB85C \uC131\uB2A5 \uC800\uD558.",
    after: "WallType \uAC80\uC0C9\uC744 \uB8E8\uD504 \uBC16\uC5D0\uC11C 1\uD68C\uB9CC \uC218\uD589\uD558\uB3C4\uB85D \uC774\uB3D9."
  },
  {
    title: "2.11  Null \uCEE4\uBE0C \uCCB4\uD06C \uCD94\uAC00",
    file: "QTO/QTO/CADLineWallData.cs",
    category: "\uC548\uC815\uC131 \uAC1C\uC120",
    before: "Util.ConvertCurve()\uAC00 null\uC744 \uBC18\uD658\uD574\uB3C4 \uAC80\uC99D \uC5C6\uC774 Wall.Create()\uC5D0 \uC804\uB2EC\uD558\uC5EC \uC608\uC678 \uBC1C\uC0DD.",
    after: "null \uBC18\uD658 \uC2DC \uD574\uB2F9 \uCEE4\uBE0C\uB97C \uAC74\uB108\uB6F0\uACE0 \uB2E4\uC74C \uBCBD \uC0DD\uC131\uC73C\uB85C \uC9C4\uD589."
  },
  {
    title: "2.12  RLine \uCD95 \uBCF4\uC815 - \uAC01\uB3C4 \uAE30\uBC18\uC73C\uB85C \uBCC0\uACBD",
    file: "DataHub/DataHub/DataHubList.cs",
    category: "\uBC84\uADF8 \uC218\uC815",
    before: "\uAC70\uB9AC \uAE30\uBC18 1mm \uACE0\uC815 \uC784\uACC4\uAC12\uC73C\uB85C \uB055\uC810 \uBCF4\uC815. \uBCBD \uAE38\uC774\uC5D0 \uB530\uB77C \uAC19\uC740 \uC774\uACA9 \uAC70\uB9AC\uB77C\uB3C4 \uAC01\uB3C4\uAC00 \uB2EC\uB77C\uC9C0\uBBC0\uB85C Revit\uC758 \"\uBCBD\uC774 \uCD95\uC744 \uC57D\uAC04 \uBC97\uC5B4\uB0AC\uC2B5\uB2C8\uB2E4\" \uACBD\uACE0\uB97C \uBC29\uC9C0\uD558\uC9C0 \uBABB\uD568. \uC608\uB97C \uB4E4\uC5B4, 5m \uBCBD\uC5D0\uC11C 0.2\uB3C4 \uD3B8\uCC28\uB294 17.5mm \uC774\uACA9\uC5D0 \uD574\uB2F9\uD558\uC5EC 1mm \uC784\uACC4\uAC12\uC73C\uB85C\uB294 \uBCF4\uC815 \uBD88\uAC00.",
    after: "\uAC01\uB3C4 \uAE30\uBC18(0.2\uB3C4) \uBCF4\uC815\uC73C\uB85C \uBCC0\uACBD. 8\uAC1C \uCD95(0\uB3C4, 45\uB3C4, 90\uB3C4, 135\uB3C4, 180\uB3C4, 225\uB3C4, 270\uB3C4, 315\uB3C4) \uAE30\uC900\uC73C\uB85C 0.2\uB3C4 \uC774\uB0B4 \uD3B8\uCC28\uB9CC \uC790\uB3D9 \uBCF4\uC815. \uCE74\uB514\uB110 \uCD95\uC740 \uC9C1\uC811 \uC88C\uD45C \uBCF4\uC815, \uB300\uAC01\uC120 \uCD95\uC740 \uC0BC\uAC01\uD568\uC218\uB85C \uBCF4\uC815\uD558\uC5EC \uBCBD \uAE38\uC774 \uC720\uC9C0. 33\uB3C4, 60\uB3C4 \uB4F1 \uBE44\uD45C\uC900 \uAC01\uB3C4 \uBCBD\uC740 \uC758\uB3C4\uC801 \uB300\uAC01\uC120\uC73C\uB85C \uD310\uB2E8\uD558\uC5EC \uBCF4\uC815\uD558\uC9C0 \uC54A\uC74C."
  },
  {
    title: "2.13  \uBCBD\uCCB4 \uC0DD\uC131 \uC21C\uC11C - \uC9E7\uC740 \uBCBD\uBD80\uD130 \uC0DD\uC131",
    file: "QTO/QTO/CADLineWallData.cs",
    category: "\uAE30\uB2A5 \uAC1C\uC120",
    before: "CAD\uC5D0\uC11C \uC804\uC1A1\uB41C \uC21C\uC11C\uB300\uB85C \uBCBD\uCCB4 \uC0DD\uC131. \uAE34 \uBCBD\uC774 \uBA3C\uC800 \uC0DD\uC131\uB418\uBA74 \uADFC\uC811 \uC704\uCE58\uC758 \uBCBD\uACFC \uC790\uB3D9 \uACB0\uD569(Wall Join)\uB418\uC5B4, \uC774\uD6C4 \uC0DD\uC131\uB418\uB294 \uC9E7\uC740 \uBCBD\uC774 \uAE34 \uBCBD\uC5D0 \uD3EC\uD568/\uD761\uC218\uB418\uBA74\uC11C \uACBD\uACE0 \uBC1C\uC0DD.",
    after: "\uCEE4\uBE0C \uAE38\uC774 \uAE30\uC900 \uC624\uB984\uCC28\uC21C \uC815\uB82C \uD6C4 \uC0DD\uC131. \uC9E7\uC740 \uBCBD\uC744 \uBA3C\uC800 \uC0DD\uC131\uD558\uC5EC \uAE34 \uBCBD\uC758 \uC790\uB3D9 \uACB0\uD569\uC5D0 \uC758\uD55C \uD761\uC218 \uBC29\uC9C0."
  },
  {
    title: "2.14  \uBCBD \uD30C\uB77C\uBBF8\uD130 \uC124\uC815 \uC2DC Null \uCCB4\uD06C \uCD94\uAC00",
    file: "QTO/QTO/CADLineWallData.cs",
    category: "\uBC84\uADF8 \uC218\uC815",
    before: "\uCCAB \uBC88\uC9F8 \uD2B8\uB79C\uC7AD\uC158 \uCEE4\uBC0B \uC2DC Revit\uC758 \uC790\uB3D9\uACB0\uD569(Wall Join)\uC774 \uBCBD\uC744 \uD761\uC218/\uBCD1\uD569\uD560 \uC218 \uC788\uC74C. \uC774\uD6C4 GetElement()\uC774 null\uC744 \uBC18\uD658\uD558\uC5EC \"Object reference not set to an instance of an object\" NullReferenceException \uBC1C\uC0DD.",
    after: "null \uCCB4\uD06C \uCD94\uAC00. \uBCBD\uC774 \uC790\uB3D9\uACB0\uD569\uC73C\uB85C \uD761\uC218\uB41C \uACBD\uC6B0 \uD2B8\uB79C\uC7AD\uC158\uC744 \uB864\uBC31\uD558\uACE0 \uC548\uC804\uD558\uAC8C \uBC18\uD658."
  },
  {
    title: "2.15  MyFailureHandler \uD655\uC7A5 - \uBCBD \uACB0\uD569 \uC624\uB958 \uBC0F \uACA9\uCE68 \uACBD\uACE0 \uC790\uB3D9 \uCC98\uB9AC",
    file: "QTO/QTO/CADLineWallData.cs",
    category: "\uC548\uC815\uC131 \uAC1C\uC120",
    before: "InaccurateBeamOrBrace \uACBD\uACE0\uB9CC \uCC98\uB9AC. \uBCBD \uC0DD\uC131 \uC2DC \uBC1C\uC0DD\uD558\uB294 3\uAC00\uC9C0 \uC8FC\uC694 \uBB38\uC81C\uB97C \uCC98\uB9AC\uD558\uC9C0 \uC54A\uC74C: (1) \"\uC694\uC18C\uB97C \uACB0\uD569\uB41C \uC0C1\uD0DC\uB85C \uC720\uC9C0\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4\" - \uC790\uB3D9\uACB0\uD569 \uC2DC \uC720\uD6A8\uD558\uC9C0 \uC54A\uC740 \uD615\uC0C1 \uC0DD\uC131, (2) \"\uD558\uC774\uB77C\uC774\uD2B8\uB41C \uBCBD\uC774 \uACA9\uCE69\uB2C8\uB2E4\" - \uB3D9\uC77C \uC704\uCE58\uC5D0 \uBCBD \uC911\uBCF5 \uC0DD\uC131, (3) \"\uBCBD\uC744 \uB9CC\uB4E4 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4\" - \uCEE4\uBE0C \uAE38\uC774 \uBD80\uC871 \uB610\uB294 \uC644\uC804 \uACA9\uCE68.",
    after: "\uBAA8\uB4E0 \uACBD\uACE0(Warning)\uB97C \uC790\uB3D9 \uC0AD\uC81C\uD558\uACE0, \uC624\uB958(Error)\uB294 Revit\uC774 \uC81C\uC548\uD558\uB294 \uD574\uACB0\uCC45(\uC694\uC18C \uACB0\uD569 \uD574\uC81C, \uC778\uC2A4\uD134\uC2A4 \uC0AD\uC81C \uB4F1)\uC744 \uC790\uB3D9 \uC801\uC6A9."
  },
  {
    title: "2.16  \uC911\uBCF5 \uCEE4\uBE0C \uC81C\uAC70 \uBC0F \uCD5C\uC18C \uAE38\uC774 \uD544\uD130 \uCD94\uAC00",
    file: "QTO/QTO/CADLineWallData.cs",
    category: "\uC548\uC815\uC131 \uAC1C\uC120",
    before: "CAD \uB370\uC774\uD130\uC5D0 \uC911\uBCF5 \uB77C\uC778\uC774 \uD3EC\uD568\uB418\uBA74 \uAC19\uC740 \uC704\uCE58\uC5D0 \uBCBD\uC774 \uC911\uBCF5 \uC0DD\uC131\uB418\uC5B4 \uACA9\uCE68 \uACBD\uACE0/\uC624\uB958 \uBC1C\uC0DD. \uADF9\uD788 \uC9E7\uC740 \uCEE4\uBE0C(1mm \uBBF8\uB9CC)\uB3C4 \uBCBD \uC0DD\uC131 \uC2DC\uB3C4\uD558\uC5EC \uC2E4\uD328.",
    after: "4\uAC1C \uD5EC\uD37C \uBA54\uC11C\uB4DC \uCD94\uAC00. \uCD5C\uC18C \uAE38\uC774(1mm) \uBBF8\uB2EC \uCEE4\uBE0C \uC81C\uAC70, \uC2DC\uC791\uC810/\uB055\uC810 \uC591\uBC29\uD5A5 \uBE44\uAD50(\uD5C8\uC6A9 \uC624\uCC28 1mm)\uB85C \uC911\uBCF5 \uCEE4\uBE0C \uC81C\uAC70. \uC9C1\uC120\uC740 \uBC29\uD5A5 \uBB34\uAD00 \uBE44\uAD50, \uD638\uB294 \uC2DC\uC791\uC810/\uC911\uAC04\uC810/\uB055\uC810 \uBAA8\uB450 \uC77C\uCE58 \uC2DC \uC911\uBCF5\uC73C\uB85C \uD310\uC815."
  },
  {
    title: "2.17  \uB450 \uBC88\uC9F8 \uD2B8\uB79C\uC7AD\uC158\uC5D0 FailureHandler \uCD94\uAC00",
    file: "QTO/QTO/CADLineWallData.cs",
    category: "\uC548\uC815\uC131 \uAC1C\uC120",
    before: "\uCCAB \uBC88\uC9F8 \uD2B8\uB79C\uC7AD\uC158(\uBCBD \uC0DD\uC131)\uC5D0\uB9CC FailureHandler \uC801\uC6A9. \uB450 \uBC88\uC9F8 \uD2B8\uB79C\uC7AD\uC158(\uD30C\uB77C\uBBF8\uD130 \uC124\uC815: \uB808\uBCA8, \uC624\uD504\uC14B, \uC911\uC2EC\uC120)\uC5D0\uC11C \uBC1C\uC0DD\uD558\uB294 \uACB0\uD569 \uC624\uB958\uAC00 \uCC98\uB9AC\uB418\uC9C0 \uC54A\uC74C.",
    after: "\uB450 \uBC88\uC9F8 \uD2B8\uB79C\uC7AD\uC158\uC5D0\uB3C4 \uB3D9\uC77C\uD55C MyFailureHandler \uC801\uC6A9\uD558\uC5EC \uD30C\uB77C\uBBF8\uD130 \uBCC0\uACBD \uC2DC \uBC1C\uC0DD\uD558\uB294 \uC624\uB958\uB3C4 \uC790\uB3D9 \uCC98\uB9AC."
  },
  {
    title: "2.18  \uBCBD\uCCB4 \uC0DD\uC131 \uACB0\uACFC \uB85C\uADF8 \uD45C\uC2DC",
    file: "QTO/QTO/CADLineWallData.cs",
    category: "\uAE30\uB2A5 \uCD94\uAC00",
    before: "\uBCBD\uCCB4 \uC0DD\uC131 \uC644\uB8CC \uD6C4 \uACB0\uACFC\uC5D0 \uB300\uD55C \uD53C\uB4DC\uBC31 \uC5C6\uC74C. \uC131\uACF5/\uC2E4\uD328 \uC5EC\uBD80 \uD655\uC778 \uBD88\uAC00.",
    after: "\uC0DD\uC131 \uC644\uB8CC \uD6C4 MessageBox\uB85C \uACB0\uACFC \uC694\uC57D \uD45C\uC2DC. \uD45C\uC2DC \uD56D\uBAA9: \uC804\uCCB4 \uC785\uB825 \uC218, \uD544\uD130 \uC81C\uAC70 \uC218(\uC911\uBCF5/\uCD5C\uC18C\uAE38\uC774), \uC0DD\uC131 \uC131\uACF5 \uC218, \uCEE4\uBE0C \uBCC0\uD658 \uC2E4\uD328 \uC218, \uC0DD\uC131 \uC2E4\uD328 \uC218."
  }
];

// Category color mapping
function getCategoryColor(cat) {
  if (cat.includes("\uBC84\uADF8")) return "E2EFDA"; // green
  if (cat.includes("\uC548\uC815")) return "D6E4F0"; // blue
  if (cat.includes("\uAE30\uB2A5 \uCD94\uAC00")) return "FCE4D6"; // orange
  if (cat.includes("\uAE30\uB2A5 \uAC1C\uC120")) return "FFF2CC"; // yellow
  if (cat.includes("\uC131\uB2A5")) return "E2D9F3"; // purple
  return WHITE;
}

const children = [];

// Title
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 600, after: 200 },
  children: [new TextRun({ text: "CAD To Revit", size: 36, bold: true, color: BLUE, font: "Arial" })]
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 400 },
  children: [new TextRun({ text: "\uBCBD\uCCB4 \uC0DD\uC131 \uC2DC\uC2A4\uD15C \uC218\uC815 \uBCF4\uACE0\uC11C", size: 36, bold: true, color: BLUE, font: "Arial" })]
}));

// Document info
const infoData = [
  ["\uC791\uC131\uC77C", "2026-02-13"],
  ["\uB300\uC0C1 \uD504\uB85C\uC81D\uD2B8", "Kiyeno (AutoCAD \uC560\uB4DC\uC778), QTO (Revit \uC560\uB4DC\uC778), DataHub (\uACF5\uC720 \uB77C\uC774\uBE0C\uB7EC\uB9AC)"],
  ["\uC218\uC815 \uD30C\uC77C \uC218", "3\uAC1C (\uCD1D 18\uAC74 \uC218\uC815)"]
];
infoData.forEach(([label, value]) => {
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 40 },
    children: [
      new TextRun({ text: label + ":  ", bold: true, size: 22, font: "Arial", color: "333333" }),
      new TextRun({ text: value, size: 22, font: "Arial", color: "333333" })
    ]
  }));
});

children.push(new Paragraph({ spacing: { after: 300 }, children: [] }));

// Horizontal line
children.push(new Paragraph({
  spacing: { after: 200 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 8 } },
  children: []
}));

// Section 1: Summary
children.push(new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 300, after: 200 },
  children: [new TextRun({ text: "1.  \uC218\uC815 \uC694\uC57D", size: 28, bold: true, color: BLUE, font: "Arial" })]
}));

// Summary table
const colWidths = [600, 2800, 4200, 1200];
const summaryRows = [
  new TableRow({
    tableHeader: true,
    children: [
      headerCell("#", colWidths[0]),
      headerCell("\uD30C\uC77C", colWidths[1]),
      headerCell("\uC218\uC815 \uB0B4\uC6A9", colWidths[2]),
      headerCell("\uBD84\uB958", colWidths[3])
    ]
  }),
  ...summaryData.map((row, i) => new TableRow({
    children: [
      dataCell(row[0], colWidths[0], { center: true, shading: i % 2 === 1 ? LIGHT_GRAY : undefined }),
      dataCell(row[1], colWidths[1], { shading: i % 2 === 1 ? LIGHT_GRAY : undefined }),
      dataCell(row[2], colWidths[2], { shading: i % 2 === 1 ? LIGHT_GRAY : undefined }),
      dataCell(row[3], colWidths[3], { center: true, shading: getCategoryColor(row[3]) })
    ]
  }))
];

children.push(new Table({
  columnWidths: colWidths,
  rows: summaryRows
}));

// Category statistics
children.push(new Paragraph({
  spacing: { before: 400, after: 200 },
  children: [new TextRun({ text: "\uBD84\uB958\uBCC4 \uD1B5\uACC4", size: 24, bold: true, color: BLUE, font: "Arial" })]
}));

const statsData = [
  ["\uBC84\uADF8 \uC218\uC815", "8\uAC74"],
  ["\uC548\uC815\uC131 \uAC1C\uC120", "6\uAC74"],
  ["\uAE30\uB2A5 \uCD94\uAC00", "2\uAC74"],
  ["\uAE30\uB2A5 \uAC1C\uC120", "1\uAC74"],
  ["\uC131\uB2A5 \uAC1C\uC120", "1\uAC74"]
];

const statColWidths = [3000, 2000];
children.push(new Table({
  columnWidths: statColWidths,
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        headerCell("\uBD84\uB958", statColWidths[0]),
        headerCell("\uAC74\uC218", statColWidths[1])
      ]
    }),
    ...statsData.map((row) => new TableRow({
      children: [
        dataCell(row[0], statColWidths[0], { shading: getCategoryColor(row[0]) }),
        dataCell(row[1], statColWidths[1], { center: true })
      ]
    }))
  ]
}));

// Page break before Section 2
children.push(new Paragraph({ spacing: { after: 0 }, children: [new (require('docx').PageBreak)()] }));

// Section 2: Details
children.push(new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 300, after: 200 },
  children: [new TextRun({ text: "2.  \uC138\uBD80 \uC218\uC815 \uB0B4\uC6A9", size: 28, bold: true, color: BLUE, font: "Arial" })]
}));

details.forEach((item, idx) => {
  // Subsection title
  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC", space: 4 } },
    children: [new TextRun({ text: item.title, size: 24, bold: true, color: BLUE, font: "Arial" })]
  }));

  // File + Category
  children.push(new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [
      new TextRun({ text: "\uD30C\uC77C:  ", bold: true, size: 20, font: "Arial", color: "555555" }),
      new TextRun({ text: item.file, size: 20, font: "Arial", color: "555555" }),
      new TextRun({ text: "    |    ", size: 20, font: "Arial", color: "CCCCCC" }),
      new TextRun({ text: "\uBD84\uB958:  ", bold: true, size: 20, font: "Arial", color: "555555" }),
      new TextRun({ text: item.category, size: 20, font: "Arial", color: "555555" })
    ]
  }));

  // Before
  children.push(new Paragraph({
    spacing: { before: 120, after: 40 },
    children: [new TextRun({ text: "\u25B6 \uC218\uC815 \uC804 \uBB38\uC81C", bold: true, size: 20, font: "Arial", color: "CC3333" })]
  }));
  children.push(new Paragraph({
    spacing: { after: 80 },
    indent: { left: 360 },
    children: [new TextRun({ text: item.before, size: 20, font: "Arial" })]
  }));

  // After
  children.push(new Paragraph({
    spacing: { before: 80, after: 40 },
    children: [new TextRun({ text: "\u25B6 \uC218\uC815 \uD6C4", bold: true, size: 20, font: "Arial", color: "336699" })]
  }));
  children.push(new Paragraph({
    spacing: { after: 120 },
    indent: { left: 360 },
    children: [new TextRun({ text: item.after, size: 20, font: "Arial" })]
  }));
});

// Page break before Section 3
children.push(new Paragraph({ spacing: { after: 0 }, children: [new (require('docx').PageBreak)()] }));

// Section 3: File list
children.push(new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 300, after: 200 },
  children: [new TextRun({ text: "3.  \uC218\uC815 \uD30C\uC77C \uBAA9\uB85D", size: 28, bold: true, color: BLUE, font: "Arial" })]
}));

const fileColWidths = [3200, 3200, 2400];
children.push(new Table({
  columnWidths: fileColWidths,
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        headerCell("\uD504\uB85C\uC81D\uD2B8", fileColWidths[0]),
        headerCell("\uD30C\uC77C", fileColWidths[1]),
        headerCell("\uC218\uC815 \uAC74\uC218", fileColWidths[2])
      ]
    }),
    new TableRow({
      children: [
        dataCell("Kiyeno (AutoCAD \uC560\uB4DC\uC778)", fileColWidths[0]),
        dataCell("KiyenoMain.cs", fileColWidths[1]),
        dataCell("7\uAC74 (#2~#8)", fileColWidths[2], { center: true })
      ]
    }),
    new TableRow({
      children: [
        dataCell("QTO (Revit \uC560\uB4DC\uC778)", fileColWidths[0], { shading: LIGHT_GRAY }),
        dataCell("CADLineWallData.cs", fileColWidths[1], { shading: LIGHT_GRAY }),
        dataCell("10\uAC74 (#1, #9~#11, #13~#18)", fileColWidths[2], { center: true, shading: LIGHT_GRAY })
      ]
    }),
    new TableRow({
      children: [
        dataCell("DataHub (\uACF5\uC720 \uB77C\uC774\uBE0C\uB7EC\uB9AC)", fileColWidths[0]),
        dataCell("DataHubList.cs", fileColWidths[1]),
        dataCell("1\uAC74 (#12)", fileColWidths[2], { center: true })
      ]
    })
  ]
}));

// Build document
const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, color: BLUE, font: "Arial" },
        paragraph: { spacing: { before: 300, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, color: BLUE, font: "Arial" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } }
    ]
  },
  sections: [{
    properties: {
      page: {
        margin: { top: 1200, right: 1200, bottom: 1200, left: 1200 },
        size: {}
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "CAD To Revit \uC218\uC815 \uBCF4\uACE0\uC11C", size: 16, color: "999999", font: "Arial", italics: true })]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "- ", size: 16, color: "999999", font: "Arial" }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "999999", font: "Arial" }),
            new TextRun({ text: " / ", size: 16, color: "999999", font: "Arial" }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: "999999", font: "Arial" }),
            new TextRun({ text: " -", size: 16, color: "999999", font: "Arial" })
          ]
        })]
      })
    },
    children
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("C:\\ClaudeProject\\ReReKiyeno\\docs\\CAD_To_Revit_\uC218\uC815\uBCF4\uACE0\uC11C.docx", buffer);
  console.log("Document created successfully!");
});
