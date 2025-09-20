# backend/app.py
import os
import re
import requests
import io
from flask import Flask, request, jsonify, render_template, send_file
from flask_cors import CORS
from fpdf import FPDF
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize, sent_tokenize
from heapq import nlargest

# --- Download NLTK Data ---
try:
    stopwords.words('english')
except LookupError:
    nltk.download('stopwords')
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

# --- Flask App Configuration ---
backend_dir = os.path.abspath(os.path.dirname(__file__))
frontend_dir = os.path.abspath(os.path.join(backend_dir, '..', 'frontend'))
static_dir = os.path.abspath(os.path.join(frontend_dir, 'static'))

app = Flask(__name__,
            template_folder=frontend_dir,
            static_folder=static_dir,
            static_url_path='/assets')
CORS(app)

# --- Conversation Memory ---
conversation_history = []  # Stores chat history


# --- NLP & PDF Logic ---
def nltk_summarizer(text, num_sentences=5):
    sentences = sent_tokenize(text)
    stop_words = set(stopwords.words('english'))
    word_frequencies = {}
    for word in word_tokenize(text):
        if word.lower() not in stop_words:
            if word not in word_frequencies:
                word_frequencies[word] = 1
            else:
                word_frequencies[word] += 1
    if not word_frequencies:
        return ""
    max_frequency = max(word_frequencies.values())
    for word in word_frequencies.keys():
        word_frequencies[word] = (word_frequencies[word] / max_frequency)
    sentence_scores = {}
    for sent in sentences:
        for word in word_tokenize(sent.lower()):
            if word in word_frequencies:
                if len(sent.split(' ')) < 30:
                    if sent not in sentence_scores:
                        sentence_scores[sent] = word_frequencies[word]
                    else:
                        sentence_scores[sent] += word_frequencies[word]
    summary_sentences = nlargest(num_sentences, sentence_scores, key=sentence_scores.get)
    return ' '.join(summary_sentences)


def gemini_processor(text, api_key, prompt_instruction, language="auto"):
    if language == "auto":
        lang_instruction = "Summarise the following text in the same language as the input."
    else:
        lang_instruction = f"You must always summarise strictly in {language}, no matter what language the input is. Do not answer in any other language."

    # Put language instruction at the very start so it's strongest
    prompt = f"{lang_instruction}\n\n{prompt_instruction}\n\nText:\n{text}"

    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key={api_key}"
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    headers = {'Content-Type': 'application/json'}

    response = requests.post(api_url, json=payload, headers=headers)
    response.raise_for_status()
    result = response.json()

    return result['candidates'][0]['content']['parts'][0]['text']



def extract_links(text):
    url_pattern = re.compile(r'https?://\S+|www\.\S+')
    return url_pattern.findall(text)


# --- API Endpoints ---
@app.route('/')
def index():
    return render_template('index.html')


def handle_gemini_request(prompt_instruction):
    try:
        data = request.get_json()
        text = data.get('text', '')
        language = data.get('language', 'auto')
        api_key = "YOUR_API_KEY_HERE"  # Replace with your actual API key

        if not text:
            return jsonify({'error': 'No text provided'}), 400

        # Force language instruction at the top
        if language == "auto":
            lang_instruction = "Summarize the following text in the SAME language as the input text."
        else:
            lang_instruction = (
        f"Summarize the following text STRICTLY in {language}. "
        f"Do not translate to English. Do not use any other language."
    )


        prompt_instruction = f"{lang_instruction}\n\n{prompt_instruction}"

        result = gemini_processor(text, api_key, prompt_instruction, language)
        return jsonify({'summary': result})

    except Exception as e:
        return jsonify({'error': str(e)}), 500



@app.route('/summarize-gemini', methods=['POST'])
def summarize_gemini():
    return handle_gemini_request("Provide a concise summary of the following text")


@app.route('/summarize-gemini-bullets', methods=['POST'])
def summarize_gemini_bullets():
    return handle_gemini_request("Summarize the following text into a bulleted list of key points")


@app.route('/summarize-gemini-takeaways', methods=['POST'])
def summarize_gemini_takeaways():
    return handle_gemini_request("Extract the key takeaways from this text")


@app.route('/extract-links', methods=['POST'])
def get_links():
    try:
        data = request.get_json()
        text = data.get('text', '')
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        links = extract_links(text)
        if not links:
            return jsonify({'summary': 'No links found in the text.'})
        return jsonify({'summary': '\n'.join(links)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# --- Conversational Gemini with Memory ---
@app.route('/ask-gemini', methods=['POST'])
def ask_gemini():
    global conversation_history
    try:
        data = request.get_json()
        user_message = data.get('text', '').strip()
        language = data.get('language', 'auto')
        if not user_message:
            return jsonify({'error': 'No question provided'}), 400

        # If memory is empty → fresh conversation
        if not conversation_history:
            prompt_instruction = "You are a helpful assistant. Answer the user's question clearly."
            result = gemini_processor(user_message, "AIzaSyC5NEaRBUdYCRgx5ooDniYNDjtfHvivI7I", prompt_instruction, language)
            conversation_history.append(f"User: {user_message}")
            conversation_history.append(f"Assistant: {result}")
        else:
    # Continue with history
            conversation_history.append(f"User: {user_message}")
            context = "\n".join(conversation_history)
            prompt_instruction = f"Continue this conversation. Keep context:\n\n{context}\n\nAssistant:"
            result = gemini_processor(user_message, "AIzaSyC5NEaRBUdYCRgx5ooDniYNDjtfHvivI7I", prompt_instruction, language)
            conversation_history.append(f"Assistant: {result}")

        return jsonify({'summary': result})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/clear-memory', methods=['POST'])
def clear_memory():
    global conversation_history
    conversation_history = []
    return jsonify({'status': 'Memory cleared', 'summary': ''})  # ✅ also clears frontend box


@app.route('/generate-pdf', methods=['POST'])
def generate_pdf():
    try:
        data = request.get_json()
        text = data.get('text', '')
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Arial", size=12)
        pdf.multi_cell(0, 10, text.encode('latin-1', 'replace').decode('latin-1'))
        pdf_buffer = io.BytesIO()
        pdf.output(pdf_buffer)
        pdf_buffer.seek(0)
        return send_file(pdf_buffer, as_attachment=True, download_name='summary.pdf', mimetype='application/pdf')
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(port=5000, debug=True)

   