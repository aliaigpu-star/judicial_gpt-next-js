import asyncio
import sys
import tempfile
import os
try:
    import pygame
    PYGAME_AVAILABLE = True
except ImportError:
    PYGAME_AVAILABLE = False

import edge_tts

async def text_to_speech_and_play(text, voice="en-US-JennyNeural"):
    """
    Convert text to speech using edge-tts and play it with pygame.
    """
    # Create a temporary MP3 file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp_file:
        tmp_path = tmp_file.name

    try:
        # Generate speech
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(tmp_path)

        # Play the audio
        print(f"Speaking: {text}")
        if not PYGAME_AVAILABLE:
            print("Error: pygame not installed. Cannot play audio in standalone mode.")
            return

        pygame.mixer.init()
        pygame.mixer.music.load(tmp_path)
        pygame.mixer.music.play()

        # Wait for playback to finish
        while pygame.mixer.music.get_busy():
            pygame.time.wait(100)

    finally:
        # Clean up
        if PYGAME_AVAILABLE:
            try:
                pygame.mixer.quit()
            except:
                pass
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

async def text_to_speech_to_file(text, output_path, voice="en-US-JennyNeural"):
    """
    Convert text to speech and save to a file (for backend API use).
    """
    # Generate speech
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_path)
    print(f"Audio saved to: {output_path}")

def main():
    # Parse arguments: text [voice] [output_file]
    if len(sys.argv) < 2:
        text = input("Enter the text to speak: ").strip()
        if not text:
            print("No text provided. Exiting.")
            return
        asyncio.run(text_to_speech_and_play(text))
    else:
        # Check if last argument is a file path (contains .mp3 or path separator)
        if len(sys.argv) >= 3 and ('.mp3' in sys.argv[-1] or '/' in sys.argv[-1] or '\\' in sys.argv[-1]):
            # File output mode: python text_to_speech.py "text" "voice" "output.mp3"
            text = sys.argv[1]
            voice = sys.argv[2] if len(sys.argv) > 3 else "en-US-JennyNeural"
            output_path = sys.argv[-1]
            asyncio.run(text_to_speech_to_file(text, output_path, voice))
        else:
            # Play mode: python text_to_speech.py "text" 
            text = sys.argv[1]
            voice = sys.argv[2] if len(sys.argv) > 2 else "en-US-JennyNeural"
            asyncio.run(text_to_speech_and_play(text, voice))

if __name__ == "__main__":
    main()