from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
from gtts import gTTS
import os
from PIL import Image
import io
import base64
from openai import OpenAI


# Get API key
key = os.getenv('OPENAI_API_KEY')
if key:
    key = key.strip().strip("'").strip('"')
else:
    raise ValueError("OPENAI_API_KEY environment variable not set")

# Create Flask app and OpenAI client at module level
app = Flask(__name__)
CORS(app)
client = OpenAI(api_key=key.strip())

def process_image_with_model(image_data):
    """Process image using OpenAI GPT-4 Vision API"""
    # Convert PIL image to base64
    img_byte_arr = io.BytesIO()
    image_data.save(img_byte_arr, format='JPEG')
    img_base64 = base64.b64encode(img_byte_arr.getvalue()).decode()
    
    # Call OpenAI API with vision
    response = client.chat.completions.create(
        model="gpt-4o-mini",  # Using mini for cost savings
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": """Describe this image in detail for a visually impaired person. 
                        Include:
                        - Main subjects and their positions (use general location for direction (middle, center, top, bottom, horizon, etc.))
                        - Colors and lighting
                        - Spatial relationships and distances
                        - Emotional tone or mood
                        - Any text visible in the image
                        Be descriptive but concise."""
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{img_base64}"
                        }
                    }
                ]
            }
        ],
        max_tokens=75
    )
    
    description = response.choices[0].message.content
    return description

@app.route('/process', methods=['POST'])
def process():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        image = Image.open(io.BytesIO(file.read()))
        
        # Process image with GPT-4 Vision
        description_text = process_image_with_model(image)
        print(f"Generated: {description_text}")  # For debugging
        
        # Convert text to speech
        tts = gTTS(text=description_text, lang='en', slow=False)
        audio_buffer = io.BytesIO()
        tts.write_to_fp(audio_buffer)
        audio_buffer.seek(0)

        return send_file(
            audio_buffer,
            mimetype='audio/mpeg',
            as_attachment=True,
            download_name='description.mp3'
        )


        
    except Exception as e:
        print(f"An error occurred: {e}")
        return jsonify({'error': 'An internal server error occurred'}), 500
    

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'}), 200

if __name__ == '__main__':
    # Run server
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)