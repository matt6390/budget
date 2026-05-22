import io
from decimal import Decimal
from apps.pdf_import.extraction import PurchaseParser, extract_purchases_from_pdf


class TestPurchaseParser:
    def test_parse_simple_receipt(self):
        text = """
        Target Receipt
        04/15/2024
        Groceries  $25.99
        Home Goods $15.50
        """
        parser = PurchaseParser(text)
        purchases = parser.parse()
        
        assert len(purchases) >= 1
        assert any(p['date'] == '2024-04-15' for p in purchases)
        assert any(p['amount'] == '25.99' for p in purchases)
        assert any(p['merchant'] for p in purchases)

    def test_parse_with_different_date_formats(self):
        text = """
        01/22/2024 Starbucks $5.50
        2024-05-10 Amazon $29.99
        March 5, 2024 Costco $82.15
        """
        parser = PurchaseParser(text)
        purchases = parser.parse()
        
        assert len(purchases) >= 2
        assert any(p['date'] == '2024-01-22' for p in purchases)
        assert any(p['date'] == '2024-05-10' for p in purchases)

    def test_parse_with_dollar_signs(self):
        text = """
        Walmart
        05/20/2024
        $ 45.32
        """
        parser = PurchaseParser(text)
        purchases = parser.parse()
        
        assert len(purchases) >= 1
        assert any('45.32' in p['amount'] for p in purchases)

    def test_no_extraction_without_date_and_amount(self):
        text = """
        Just some random text
        with no dates or amounts
        """
        parser = PurchaseParser(text)
        purchases = parser.parse()
        
        assert len(purchases) == 0

    def test_parse_with_commas_in_amounts(self):
        text = """
        12/01/2024 Luxury Store $1,234.56
        """
        parser = PurchaseParser(text)
        purchases = parser.parse()
        
        assert len(purchases) >= 1
        assert any('1234.56' in p['amount'] for p in purchases)


if __name__ == '__main__':
    # Run basic tests
    test = TestPurchaseParser()
    test.test_parse_simple_receipt()
    print("✓ test_parse_simple_receipt passed")
    
    test.test_parse_with_different_date_formats()
    print("✓ test_parse_with_different_date_formats passed")
    
    test.test_parse_with_dollar_signs()
    print("✓ test_parse_with_dollar_signs passed")
    
    test.test_no_extraction_without_date_and_amount()
    print("✓ test_no_extraction_without_date_and_amount passed")
    
    test.test_parse_with_commas_in_amounts()
    print("✓ test_parse_with_commas_in_amounts passed")
    
    print("\nAll extraction tests passed!")

