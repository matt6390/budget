# Quick Start: PDF Purchase Import

## What's New
A complete PDF import system for receipts and invoices with intelligent extraction, auto-categorization, and category suggestions.

## Try It Out

### 1. Start the app
```bash
cd /Users/mrmattstone/Projects/budget
./start.sh
```

### 2. Log in
- Go to http://localhost:5173
- Create an account or log in

### 3. Import a purchase
- Click **"📄 Import PDF"** in the sidebar
- Drag & drop a PDF (receipt, invoice, bank statement)
- OR click to browse and select a PDF
- (Optional) Specify page numbers (e.g., "1,3" for pages 1 and 3)
- Click **"Upload & Extract"**

### 4. Review & confirm
- Table shows extracted data: Date, Merchant, Amount
- Category suggestions marked with ✓ (based on your purchase history)
- Edit merchant names or amounts if needed
- Select categories (can use suggested ones)
- Click **"Save X Purchases"**

### 5. Done!
- Success screen shows purchase count
- PDFs stored for future reference
- Merchant lookup table updated for next import

## Supported PDF Types
- 📄 Receipts (text PDFs)
- 📰 Invoices (searchable)
- 🏦 Bank statements
- 📸 Scanned documents (requires Tesseract)

## What Gets Extracted
- **Date**: Various formats supported (01/15/2024, 2024-01-15, Jan 15, 2024, etc.)
- **Merchant**: Store/vendor name
- **Amount**: Total purchase amount

## Category Suggestions
- Automatic suggestions based on merchant name
- Only applies to merchants you've purchased from before
- Full control to assign/change categories before saving
- Updates merchant lookup for next time

## File Storage
- PDFs saved at: `media/pdf_imports/YYYY/MM/DD/`
- Links to purchases for audit trail
- Can be accessed later for reference

## Features
✅ Offline processing (no external APIs)
✅ Text extraction (fast)
✅ OCR fallback (for scanned PDFs)
✅ Drag-and-drop upload
✅ Page selection
✅ Category suggestions
✅ Bulk import
✅ PDF storage for audit trail
✅ Per-user merchant lookup

## Troubleshooting

**"Failed to extract text from PDF"**
- Try a different PDF to verify system works
- Corrupted PDFs may need re-scanning

**"No text found" (OCR falls back)**
- System will use OCR automatically
- Requires Tesseract: `brew install tesseract` (macOS)
- System slows down for OCR (5-30 seconds)

**No purchases extracted**
- PDF may not contain recognizable purchase data
- Verify PDF has dates, amounts, merchant names

## For Developers

### API Endpoints
```
POST /api/purchases/import/upload/
GET /api/purchases/import/{session_id}/
POST /api/purchases/import/{session_id}/confirm/
GET /api/purchases/import/suggest-category/
```

### Extraction Logic
- `apps/pdf_import/extraction.py`: PDF processing + parsing
- Tests in `apps/pdf_import/test_extraction.py`

### Frontend Code
- `src/pages/PdfImportPage.tsx`: Full workflow
- `src/components/PdfUpload.tsx`: Upload UI
- `src/components/PurchaseConfirmation.tsx`: Review table
- `src/api/pdfImport.ts`: API client

### Models
- `PdfImportSession`: Upload tracking
- `MerchantCategory`: Merchant → Category mapping (per-user)

## Next Steps
- ✅ Batch import multiple PDFs
- ✅ Email receipt forwarding
- ✅ Receipt image preview
- ✅ Duplicate detection
- ✅ Merchant name normalization

---

**Feature Ready!** All components working, tested, and integrated.
