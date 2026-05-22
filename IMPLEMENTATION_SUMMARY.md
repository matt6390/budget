# PDF Purchase Import Feature - Implementation Summary

## What Was Built

A complete PDF purchase import system that allows users to:
1. **Upload PDFs** (receipts, invoices, statements) with optional page selection
2. **Automatically extract** purchase data (dates, merchant names, amounts)
3. **Review & edit** extracted purchases before saving
4. **Auto-suggest categories** based on merchant history
5. **Save purchases** with PDF files stored for audit trail

## Architecture

### Backend (Django)
**New app**: `apps/pdf_import/`

**Models**:
- `PdfImportSession`: Tracks uploads, extraction status, and extracted data
- `MerchantCategory`: Per-user merchant→category mapping for suggestions

**Key modules**:
- `extraction.py`: PDF text extraction (text-first, OCR fallback) + purchase parsing
- `views.py`: REST API endpoints for upload, extraction, confirmation
- `serializers.py`: Data serialization for API responses

**API Endpoints**:
- `POST /api/purchases/import/upload/` - Upload & extract
- `GET /api/purchases/import/{id}/` - Retrieve session
- `POST /api/purchases/import/{id}/confirm/` - Save purchases
- `GET /api/purchases/import/suggest-category/` - Get category suggestion

### Frontend (React + TypeScript)
**New components**:
- `PdfUpload.tsx`: Drag-and-drop upload interface with page selection
- `PurchaseConfirmation.tsx`: Review table with category suggestions
- `PdfImportPage.tsx`: Full workflow orchestration

**New files**:
- `api/pdfImport.ts`: API client functions

**Integration**:
- Added `/import-pdf` route
- Added "📄 Import PDF" nav link in Layout

## Text Extraction Strategy

1. **Text Extraction**:
   - Try PyPDF2 first (works for searchable PDFs) - instant
   - Fall back to Tesseract OCR if no text found (for scanned PDFs) - 5-30s

2. **Purchase Parsing**:
   - Regex-based pattern matching (no external APIs, offline)
   - Date patterns: `MM/DD/YYYY`, `YYYY-MM-DD`, `Month DD, YYYY`, etc.
   - Amount patterns: `$123.45`, `$1,234.56`, `123.45`, etc.
   - Smart line correlation: finds dates + amounts within 3 lines of each other
   - Merchant extraction: cleans dates/amounts from surrounding text

3. **Merchant Lookup**:
   - Per-user table of `merchant_name → category` mappings
   - On import, suggests category for known merchants
   - On confirmation, updates lookup table for future imports

## File Structure

```
backend/
├── apps/pdf_import/
│   ├── models.py           # PdfImportSession, MerchantCategory
│   ├── views.py            # API endpoints
│   ├── serializers.py      # DRF serializers
│   ├── extraction.py       # PDF processing & purchase parsing
│   ├── urls.py             # Router configuration
│   └── migrations/         # Database migrations
│
frontend/
├── src/
│   ├── components/
│   │   ├── PdfUpload.tsx           # Upload interface
│   │   └── PurchaseConfirmation.tsx # Review table
│   ├── pages/
│   │   └── PdfImportPage.tsx       # Full workflow
│   └── api/
│       └── pdfImport.ts            # API client
```

## Dependencies Added

**Backend** (`requirements.txt`):
- `PyPDF2==3.0.1` - PDF text extraction
- `pytesseract==0.3.10` - OCR wrapper
- `pdf2image==1.16.3` - PDF to image conversion

**System**:
- Tesseract OCR (optional, for scanned PDFs)
  - macOS: `brew install tesseract`
  - Linux: `apt-get install tesseract-ocr`
  - Windows: Installer from GitHub

## Database Changes

**Migrations created**:
- `pdf_import/migrations/0001_initial.py`
  - Creates `pdf_import_pdfimportsession` table
  - Creates `pdf_import_merchantcategory` table

**Applied automatically** via `./start.sh` and `python manage.py migrate`

## Key Design Decisions

1. **Lightweight extraction**: Regex + heuristics, no ML models (keeps system simple & fast)
2. **Session-based workflow**: Upload → Extract → Review → Confirm (allows editing before save)
3. **Per-user merchant lookup**: Suggestions based on individual history, not global
4. **PDF storage**: Original files kept for audit trail & user reference
5. **Category suggestions at review time**: User has full control before saving
6. **Offline processing**: No external APIs needed (data stays private)

## Testing

**Extraction logic** tested with:
- Multiple date formats (MM/DD/YYYY, YYYY-MM-DD, "Month DD, YYYY")
- Various amount formats ($123.45, $1,234.56, 123.45)
- Multi-line extraction (date and amount on separate lines)
- No false positives (junk text ignored)

Run tests:
```bash
cd backend
source venv/bin/activate
DJANGO_SETTINGS_MODULE=config.settings.local python apps/pdf_import/test_extraction.py
```

## Usage Flow

1. Navigate to **📄 Import PDF** in sidebar
2. **Upload**: Drag-drop PDF or click to browse
3. **(Optional)**: Specify page numbers (e.g., "1,3,5")
4. **Extract**: System extracts dates, merchants, amounts
5. **Review**: Table shows extracted data with category suggestions (✓ marked)
6. **Edit**: Modify merchant names, amounts, or categories as needed
7. **Confirm**: Click "Save" to create purchases and update merchant lookup
8. **Done**: Success screen shows purchase count

## Limitations

- Category suggestions are per-user only (not global/shared)
- Parsing is heuristic-based, not ML-powered (may miss complex layouts)
- OCR quality depends on PDF scan quality
- Requires Tesseract for scanned PDFs (text-only PDFs work without it)

## Next Steps / Future Enhancements

- [ ] Batch import (multiple PDFs at once)
- [ ] Email receipt forwarding
- [ ] Duplicate detection & merging
- [ ] Merchant name normalization (e.g., "TARGET" vs "Target")
- [ ] ML-based category classification
- [ ] Receipt image preview in confirmation
- [ ] Full receipt archive/search

## Deployment Notes

- Ensure `MEDIA_ROOT` and `MEDIA_URL` are configured in Django settings
- PDFs stored at `media/pdf_imports/YYYY/MM/DD/`
- Set appropriate file size limits in Django settings
- In production, use proper file storage backend (S3, etc.)

---

**Status**: ✅ Feature complete and tested
- Backend: Fully functional with all endpoints working
- Frontend: UI components built and integrated
- Database: Migrations created and applied
- Extraction: Text + OCR support with intelligent parsing
- Suggestions: Per-user merchant lookup table implemented
