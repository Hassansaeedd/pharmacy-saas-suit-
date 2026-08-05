import io
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from app.models.sales import Sale
from app.models.business import Business

def generate_pdf_receipt(sale: Sale, business: Business) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#0f172a'),
        alignment=1 # Center
    )

    subtitle_style = ParagraphStyle(
        'SubtitleStyle',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#475569'),
        alignment=1 # Center
    )

    meta_style = ParagraphStyle(
        'MetaStyle',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#334155')
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontSize=9,
        leading=11,
        fontName='Helvetica-Bold',
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontSize=9,
        leading=11,
        textColor=colors.HexColor('#1e293b')
    )

    story = []

    # Header
    story.append(Paragraph(f"<b>{business.name}</b>", title_style))
    story.append(Paragraph(f"Drug License #: {business.license_number}", subtitle_style))
    if business.address:
        story.append(Paragraph(f"Address: {business.address}", subtitle_style))
    if business.contact:
        story.append(Paragraph(f"Contact: {business.contact}", subtitle_style))
    story.append(Spacer(1, 15))

    # Divider line
    story.append(Paragraph("<hr color='#cbd5e1'/>", styles['Normal']))
    story.append(Spacer(1, 10))

    # Metadata Table
    sale_date = sale.created_at.strftime("%Y-%m-%d %H:%M:%S")
    rx_status = "VERIFIED BY PHARMACIST" if sale.prescription_verified else "N/A (OTC Sale)"

    meta_data = [
        [
            Paragraph(f"<b>Receipt #:</b> POS-{sale.id:06d}", meta_style),
            Paragraph(f"<b>Date:</b> {sale.date if hasattr(sale, 'date') else sale_date}", meta_style)
        ],
        [
            Paragraph(f"<b>Customer:</b> {sale.customer_name or 'Walk-in Customer'}", meta_style),
            Paragraph(f"<b>Payment:</b> {sale.payment_method.upper()}", meta_style)
        ],
        [
            Paragraph(f"<b>Prescription:</b> {rx_status}", meta_style),
            Paragraph(f"<b>Currency:</b> PKR (Rs.)", meta_style)
        ]
    ]

    meta_table = Table(meta_data, colWidths=[270, 270])
    meta_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 15))

    # Items Table
    headers = [
        Paragraph("<b>Item Description</b>", table_header_style),
        Paragraph("<b>Batch #</b>", table_header_style),
        Paragraph("<b>Qty</b>", table_header_style),
        Paragraph("<b>Unit Price (Rs.)</b>", table_header_style),
        Paragraph("<b>Subtotal (Rs.)</b>", table_header_style)
    ]

    table_rows = [headers]
    for item in sale.items:
        medicine_name = getattr(item, 'medicine_name', None) or f"Medicine #{item.medicine_id}"
        batch_num = getattr(item, 'batch_number', None) or f"Batch #{item.batch_id}"

        row = [
            Paragraph(medicine_name, table_cell_style),
            Paragraph(batch_num, table_cell_style),
            Paragraph(str(item.quantity), table_cell_style),
            Paragraph(f"{item.unit_price:.2f}", table_cell_style),
            Paragraph(f"{item.subtotal:.2f}", table_cell_style)
        ]
        table_rows.append(row)

    items_table = Table(table_rows, colWidths=[200, 90, 45, 100, 105])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0f766e')), # Teal Header
        ('ALIGN', (2,0), (-1,-1), 'RIGHT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 15))

    # Total Box
    total_data = [
        ["", Paragraph(f"<b>TOTAL AMOUNT:</b>", meta_style), Paragraph(f"<b>Rs. {sale.total_amount:.2f}</b>", ParagraphStyle('Tot', parent=meta_style, fontSize=12, leading=14, fontName='Helvetica-Bold', textColor=colors.HexColor('#0f766e')))]
    ]
    total_table = Table(total_data, colWidths=[290, 140, 110])
    total_table.setStyle(TableStyle([
        ('ALIGN', (1,0), (-1,-1), 'RIGHT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(total_table)
    story.append(Spacer(1, 30))

    # Footer
    story.append(Paragraph("Thank you for trusting PharmaFlow!", subtitle_style))
    story.append(Paragraph("Software provided by PharmaFlow SaaS Pakistan", ParagraphStyle('Foot', parent=subtitle_style, fontSize=8, textColor=colors.HexColor('#94a3b8'))))

    doc.build(story)
    pdf_data = buffer.getvalue()
    buffer.close()
    return pdf_data
