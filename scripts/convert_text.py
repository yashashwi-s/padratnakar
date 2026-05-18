import sys
import os

# Add the cloned repo to sys.path so we can import its modules
repo_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../ePubFontConverter-WalkmanChanakya'))
sys.path.append(repo_path)

import convert

def process_file(input_file, output_file):
    print("Reading file...")
    with open(input_file, 'r', encoding='utf-8') as f:
        text = f.read()

    print("Converting text...")
    # WalkmanChanakya is font index 1 in their dict list
    converted_text = convert.convertToUni(text, 1)

    print("Writing to file...")
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(converted_text)
    
    print("Conversion complete!")

if __name__ == "__main__":
    process_file('raw_text.txt', 'converted_text.txt')
