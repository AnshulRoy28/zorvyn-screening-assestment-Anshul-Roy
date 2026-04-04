import json
import base64
import google.generativeai as genai
from app.config import Config

genai.configure(api_key=Config.GEMINI_API_KEY)

def extract_from_receipt(image_data):
    """
    Extract transaction data from receipt image using Gemini Vision.
    Returns list of transactions with item_name, amount, category, type, date.
    """
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        prompt = """
        Analyze this receipt image and extract ALL transaction items.
        Return ONLY valid JSON array with no markdown, no explanation.
        
        For each item found, return:
        {
          "item_name": "description of item",
          "amount": numeric value or null if not visible,
          "category": one of [Food, Transport, Shopping, Bills, Entertainment, Health, Income, Other],
          "type": "expense",
          "date": "YYYY-MM-DD" or null if not visible
        }
        
        Rules:
        - Return valid JSON only
        - Use "Other" category when unsure
        - Never hallucinate amounts
        - Set null for missing date or amount
        - Extract ALL items from the receipt
        """
        
        image_parts = [{'mime_type': 'image/jpeg', 'data': image_data}]
        response = model.generate_content([prompt, image_parts[0]])
        
        text = response.text.strip()
        if text.startswith('```json'):
            text = text[7:]
        if text.startswith('```'):
            text = text[3:]
        if text.endswith('```'):
            text = text[:-3]
        text = text.strip()
        
        transactions = json.loads(text)
        return transactions, None
    
    except json.JSONDecodeError as e:
        return None, f'Failed to parse Gemini response: {str(e)}'
    except Exception as e:
        return None, f'Gemini API error: {str(e)}'

def extract_from_bank_statement(image_data):
    """
    Extract transaction data from bank statement screenshot using Gemini Vision.
    """
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        prompt = """
        Analyze this bank statement image and extract ALL transactions.
        Return ONLY valid JSON array with no markdown, no explanation.
        
        For each transaction found, return:
        {
          "item_name": "transaction description",
          "amount": numeric value or null if not visible,
          "category": one of [Food, Transport, Shopping, Bills, Entertainment, Health, Income, Other],
          "type": "income" or "expense" (determine from context),
          "date": "YYYY-MM-DD" or null if not visible
        }
        
        Rules:
        - Return valid JSON only
        - Identify if transaction is income (credit/deposit) or expense (debit/withdrawal)
        - Use "Other" category when unsure
        - Never hallucinate amounts
        - Set null for missing date or amount
        - Extract ALL transactions visible
        """
        
        image_parts = [{'mime_type': 'image/jpeg', 'data': image_data}]
        response = model.generate_content([prompt, image_parts[0]])
        
        text = response.text.strip()
        if text.startswith('```json'):
            text = text[7:]
        if text.startswith('```'):
            text = text[3:]
        if text.endswith('```'):
            text = text[:-3]
        text = text.strip()
        
        transactions = json.loads(text)
        return transactions, None
    
    except json.JSONDecodeError as e:
        return None, f'Failed to parse Gemini response: {str(e)}'
    except Exception as e:
        return None, f'Gemini API error: {str(e)}'

def classify_excel_rows(rows):
    """
    Classify Excel rows using Gemini.
    Input: list of description strings
    Output: list of {item_name, category, type}
    """
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        prompt = f"""
        Classify these transaction descriptions from an Excel file.
        Return ONLY valid JSON array with no markdown, no explanation.
        
        Input descriptions:
        {json.dumps(rows)}
        
        For each description, return:
        {{
          "item_name": "original description",
          "category": one of [Food, Transport, Shopping, Bills, Entertainment, Health, Income, Other],
          "type": "income" or "expense"
        }}
        
        Rules:
        - Return valid JSON only
        - Use "Other" category when unsure
        - Identify income vs expense from context
        - Maintain same order as input
        """
        
        response = model.generate_content(prompt)
        
        text = response.text.strip()
        if text.startswith('```json'):
            text = text[7:]
        if text.startswith('```'):
            text = text[3:]
        if text.endswith('```'):
            text = text[:-3]
        text = text.strip()
        
        classifications = json.loads(text)
        return classifications, None
    
    except json.JSONDecodeError as e:
        return None, f'Failed to parse Gemini response: {str(e)}'
    except Exception as e:
        return None, f'Gemini API error: {str(e)}'
