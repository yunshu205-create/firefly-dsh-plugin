using System;using System.Drawing;using System.Drawing.Drawing2D;using System.Windows.Forms;
internal static class TrayTheme {
 internal static ContextMenuStrip Create(Func<bool> day){var menu=new ContextMenuStrip{ShowImageMargin=false,ShowCheckMargin=false,Padding=new Padding(7),Font=new Font("Microsoft YaHei UI",10F),Renderer=new Renderer(day)};menu.Opening+=(s,e)=>{menu.BackColor=day()?Color.FromArgb(248,243,231):Color.FromArgb(16,41,35);menu.ForeColor=day()?Color.FromArgb(53,77,66):Color.FromArgb(238,231,212);foreach(ToolStripItem item in menu.Items){item.Padding=new Padding(10,6,10,6);item.Margin=new Padding(1,1,1,1);}};return menu;}
 sealed class Renderer:ToolStripProfessionalRenderer {
  readonly Func<bool> day;internal Renderer(Func<bool> current){day=current;RoundedEdges=false;}
  Color Paper{get{return day()?Color.FromArgb(248,243,231):Color.FromArgb(16,41,35);}}Color Ink{get{return day()?Color.FromArgb(53,77,66):Color.FromArgb(238,231,212);}}Color Line{get{return day()?Color.FromArgb(183,199,175):Color.FromArgb(128,115,77);}}
  protected override void OnRenderToolStripBackground(ToolStripRenderEventArgs e){e.Graphics.Clear(Paper);}
  protected override void OnRenderImageMargin(ToolStripRenderEventArgs e){}
  protected override void OnRenderToolStripBorder(ToolStripRenderEventArgs e){using(var p=new Pen(Line))e.Graphics.DrawRectangle(p,0,0,e.ToolStrip.Width-1,e.ToolStrip.Height-1);}
  protected override void OnRenderMenuItemBackground(ToolStripItemRenderEventArgs e){var r=new Rectangle(1,1,e.Item.Width-3,e.Item.Height-2);using(var b=new SolidBrush(e.Item.Selected?(day()?Color.FromArgb(231,238,220):Color.FromArgb(37,65,53)):Paper)){e.Graphics.FillRectangle(b,r);}if(e.Item.Selected){using(var p=new Pen(Line))e.Graphics.DrawRectangle(p,r);}}
  protected override void OnRenderItemText(ToolStripItemTextRenderEventArgs e){e.TextColor=e.Item.Enabled?Ink:Color.FromArgb(140,150,140);base.OnRenderItemText(e);}
  protected override void OnRenderSeparator(ToolStripSeparatorRenderEventArgs e){using(var p=new Pen(Line))e.Graphics.DrawLine(p,8,e.Item.Height/2,e.Item.Width-8,e.Item.Height/2);}
 }
}
