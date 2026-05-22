import io
import re
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any


class PdfExtractor:
    """Lightweight PDF text extraction. Uses pdfminer.six (primary) with pypdf fallback."""

    def __init__(self, pdf_content: bytes):
        self.pdf_content = pdf_content

    def get_page_count(self) -> int:
        """Return total number of pages in the PDF."""
        try:
            from pdfminer.high_level import extract_pages
            pages = list(extract_pages(io.BytesIO(self.pdf_content)))
            return len(pages)
        except Exception:
            pass
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(self.pdf_content))
            return len(reader.pages)
        except Exception:
            return 0

    def extract_text(self) -> str:
        """Extract text from all pages."""
        return self.extract_text_from_pages([])

    def extract_text_from_pages(self, page_numbers: List[int]) -> str:
        """Extract text from specific pages (1-indexed). Empty list = all pages."""
        zero_indexed = [p - 1 for p in page_numbers] if page_numbers else None

        text = self._extract_with_pdfminer(zero_indexed)
        if text.strip():
            return text

        text = self._extract_with_pypdf(zero_indexed)
        if text.strip():
            return text

        return ""

    def _extract_with_pdfminer(self, page_numbers: Optional[List[int]] = None) -> str:
        """Extract text using pdfminer.six."""
        try:
            from pdfminer.high_level import extract_text as pm_extract
            return pm_extract(io.BytesIO(self.pdf_content), page_numbers=page_numbers)
        except Exception:
            return ""

    def _extract_with_pypdf(self, page_numbers: Optional[List[int]] = None) -> str:
        """Extract text using pypdf as fallback."""
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(self.pdf_content))
            pages = reader.pages
            if page_numbers is not None:
                pages = [reader.pages[i] for i in page_numbers if 0 <= i < len(reader.pages)]
            return "".join(page.extract_text() or "" for page in pages)
        except Exception:
            return ""


class PurchaseParser:
    """
    Parse extracted PDF text for purchase data (date, merchant, amount).

    Supports two layouts:
    1. Columnar bank statement (e.g. Chase): dates in one block, merchants in
       another, amounts at the end — matched positionally.
    2. Inline receipt/invoice: date, merchant, amount appear on the same line
       or within a few lines of each other.
    """

    # Exact header/label lines to discard
    _SKIP_EXACT = {
        'ACCOUNT ACTIVITY', 'PURCHASES', 'PURCHASE',
        '$ Amount', 'Date of', 'Transaction',
        'PAYMENTS AND OTHER CREDITS',
        'Merchant  Name or Transaction Description',
        'Merchant Name or Transaction Description',
        '®', '©', '™',
    }

    # Lines whose prefix marks them as non-transaction content
    _SKIP_PREFIX = (
        'Manage your', 'Customer Service', 'Mobile:', 'Download',
        'www.', '1-800', 'Chase Mobile', 'Page ', 'Statement Date',
        'MATTHEW', 'Matthew', 'Account Number',
    )

    # Regex patterns for lines that are metadata/footer garbage
    _SKIP_RE = re.compile(
        r'^[xXyY]\s+\d'          # Reference codes: "x 0000001", "Y 9"
        r'|^\d{10,}'              # Long account/reference numbers
        r'|^[A-Z]{1,2}\s+\d'     # Short codes: "D 13", "Y 9"
        r'|^\d{2}/\d{2}/\d{2}$'  # Short date codes: "26/05/04"
        r'|^\d{5}\s+[A-Z]{2}'    # Zip + state: "60614 IL"
        r'|^[®©™]'               # Lone trademark symbols
        r'|^\d{1,4}$'             # Short numeric fragments: "04", "3"
        r'|^\d{7}\s'             # 7-digit ref codes: "0000001 FIS…"
    )

    # MM/DD date exactly filling a line (bank statement column)
    _DATE_COL_RE = re.compile(r'^\d{2}/\d{2}$')
    # Amount: optional minus, digits with optional commas, two decimal places
    _AMOUNT_RE = re.compile(r'^-?[\d,]+\.\d{2}$|^-?\.\d{2}$')

    # Full-date formats for inline parsing
    _FULL_DATE_PATTERNS = [
        r'(\d{1,2}[/-]\d{1,2}[/-]\d{4})',
        r'(\d{4}[/-]\d{1,2}[/-]\d{1,2})',
        r'(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b)',
    ]
    _INLINE_AMOUNT_PATTERNS = [
        r'\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
        r'(?:^|\s)(\d+(?:,\d{3})*\.\d{2})(?:\s|$)',
    ]

    def __init__(self, text: str, statement_year: Optional[int] = None):
        self.text = text
        self.lines = text.split('\n')
        self.statement_year = statement_year or self._detect_year()

    def parse(self) -> List[Dict[str, Any]]:
        """Try columnar parse first; fall back to inline parse."""
        results = self._parse_columnar()
        if results:
            return results
        return self._parse_inline()

    # ------------------------------------------------------------------
    # Columnar parse (bank statements: Chase, BofA, etc.)
    # ------------------------------------------------------------------

    def _parse_columnar(self) -> List[Dict[str, Any]]:
        """
        Handle the layout where dates, merchant names, and amounts each appear
        as their own column blocks (pdfminer extracts them sequentially).
        """
        clean_lines = self._clean_lines()

        all_dates: List[str] = []
        all_merchants: List[str] = []
        all_amounts: List[str] = []
        in_amounts_section = False

        for line in clean_lines:
            if '$ Amount' in line or line == '$ Amount':
                in_amounts_section = True
                continue

            if in_amounts_section:
                if self._AMOUNT_RE.match(line):
                    all_amounts.append(line)
                # Stop collecting amounts at obvious footer content
            elif self._DATE_COL_RE.match(line):
                all_dates.append(line)
            elif self._AMOUNT_RE.match(line):
                all_amounts.append(line)
            else:
                all_merchants.append(line)

        n = min(len(all_dates), len(all_merchants), len(all_amounts))
        # Require a reasonable match: at least 3 triples and counts must agree
        if n < 3 or not (len(all_dates) == len(all_merchants) == len(all_amounts)):
            return []

        purchases = []
        for i in range(n):
            raw_amount = all_amounts[i].replace(',', '')
            try:
                amount = Decimal(raw_amount)
            except Exception:
                continue
            if amount <= 0:
                continue  # Skip credits / payments

            date_str = self._normalize_mm_dd(all_dates[i])
            if not date_str:
                continue

            merchant = self._clean_merchant_name(all_merchants[i])
            purchases.append({
                'date': date_str,
                'merchant': merchant,
                'amount': str(amount),
            })

        return purchases

    def _clean_lines(self) -> List[str]:
        """Strip and filter raw lines, removing headers, footers, and metadata."""
        result = []
        for line in self.lines:
            line = line.strip()
            if not line:
                continue
            if line in self._SKIP_EXACT:
                continue
            if line.startswith(self._SKIP_PREFIX):
                continue
            if self._SKIP_RE.match(line):
                continue
            result.append(line)
        return result

    def _normalize_mm_dd(self, date_str: str) -> Optional[str]:
        """Convert MM/DD to YYYY-MM-DD using the detected statement year."""
        m = re.match(r'^(\d{2})/(\d{2})$', date_str.strip())
        if not m:
            return None
        month, day = int(m.group(1)), int(m.group(2))
        year = self.statement_year
        try:
            dt = datetime(year, month, day)
            return dt.strftime('%Y-%m-%d')
        except ValueError:
            return None

    def _clean_merchant_name(self, raw: str) -> str:
        """Strip trailing state abbreviation and tidy up merchant name."""
        # Remove trailing 2-letter US state abbreviation
        cleaned = re.sub(r'\s+[A-Z]{2}\s*$', '', raw)
        return ' '.join(cleaned.split())[:120] or raw[:120]

    # ------------------------------------------------------------------
    # Inline parse (receipts, invoices: date + merchant + amount on same line)
    # ------------------------------------------------------------------

    def _parse_inline(self) -> List[Dict[str, Any]]:
        """Handle formats where each line or small block contains a full transaction."""
        purchases = []
        lines = self.lines

        for i, raw_line in enumerate(lines):
            line = raw_line.strip()
            if not line or len(line) < 5:
                continue

            date_match = self._extract_full_date(line)
            if not date_match:
                continue

            amount_match = None
            for lookahead in range(4):
                if i + lookahead < len(lines):
                    amount_match = self._extract_inline_amount(lines[i + lookahead].strip())
                    if amount_match:
                        break

            if not amount_match:
                continue

            merchant = self._extract_inline_merchant(line)
            if not merchant:
                for j in range(max(0, i - 2), i + 2):
                    if j != i and j < len(lines):
                        merchant = self._extract_inline_merchant(lines[j].strip())
                        if merchant:
                            break
            if not merchant:
                merchant = 'Unknown'

            purchases.append({
                'date': date_match,
                'merchant': merchant,
                'amount': amount_match,
            })

        return purchases

    def _extract_full_date(self, line: str) -> Optional[str]:
        for pattern in self._FULL_DATE_PATTERNS:
            m = re.search(pattern, line, re.IGNORECASE)
            if m:
                return self._normalize_full_date(m.group(1))
        return None

    def _normalize_full_date(self, date_str: str) -> Optional[str]:
        for fmt in ('%m/%d/%Y', '%m-%d-%Y', '%Y-%m-%d', '%Y/%m/%d',
                    '%b %d, %Y', '%B %d, %Y', '%b %d %Y', '%B %d %Y'):
            try:
                return datetime.strptime(date_str, fmt).strftime('%Y-%m-%d')
            except ValueError:
                continue
        return None

    def _extract_inline_amount(self, line: str) -> Optional[str]:
        for pattern in self._INLINE_AMOUNT_PATTERNS:
            m = re.search(pattern, line)
            if m:
                try:
                    amount = Decimal(m.group(1).replace(',', ''))
                    return str(amount)
                except Exception:
                    continue
        return None

    def _extract_inline_merchant(self, line: str) -> str:
        for pattern in self._FULL_DATE_PATTERNS:
            line = re.sub(pattern, '', line, flags=re.IGNORECASE)
        for pattern in self._INLINE_AMOUNT_PATTERNS:
            line = re.sub(pattern, '', line)
        return ' '.join(line.split())[:100]

    # ------------------------------------------------------------------
    # Year detection
    # ------------------------------------------------------------------

    def _detect_year(self) -> int:
        """Infer statement year from text, defaulting to current year."""
        current_year = datetime.now().year

        # Highest-priority: explicit 4-digit year in the text
        years_4digit = [
            int(m.group(1))
            for m in re.finditer(r'\b(20\d{2})\b', self.text)
            if 2000 <= int(m.group(1)) <= current_year + 1
        ]
        if years_4digit:
            return max(years_4digit)

        # Second priority: MM/DD/YY date patterns — take the most recent year so
        # that footer codes like "26/05/04" (year=04) don't trump "05/04/26" (year=26).
        candidate_years = []
        for m in re.finditer(r'\b\d{2}/\d{2}/(\d{2})\b', self.text):
            yy = int(m.group(1))
            y = 2000 + yy if yy < 50 else 1900 + yy
            if 2000 <= y <= current_year + 1:
                candidate_years.append(y)
        if candidate_years:
            return max(candidate_years)

        return current_year


def extract_purchases_from_pdf(
    pdf_content: bytes,
    page_numbers: Optional[List[int]] = None,
) -> List[Dict[str, Any]]:
    """
    Extract purchase data from a PDF.

    Args:
        pdf_content: Raw PDF bytes.
        page_numbers: 1-indexed page numbers to target. All pages if empty/None.

    Returns:
        List of dicts: [{date: 'YYYY-MM-DD', merchant: str, amount: str}, ...]
    """
    extractor = PdfExtractor(pdf_content)

    if page_numbers:
        text = extractor.extract_text_from_pages(page_numbers)
    else:
        text = extractor.extract_text()

    parser = PurchaseParser(text)
    return parser.parse()

